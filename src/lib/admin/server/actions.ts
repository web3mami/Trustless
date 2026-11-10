import type { NeonQueryPromise } from "@neondatabase/serverless";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { isAdminRole, type Permission } from "@/lib/admin/permissions";
import {
  SETTINGS_PERMISSION,
  validateSettings,
  type SettingsKey,
} from "@/lib/admin/settings";
import { BAN_KINDS, RESTRICTION_KINDS, type RestrictionKind } from "@/lib/admin/types";
import { auditQuery, type AuditInput } from "@/lib/admin/server/audit";
import {
  AdminError,
  hashPassword,
  newTotpSecret,
  passwordProblem,
  reauthenticate,
  totpUri,
  verifyTotp,
  type AdminContext,
} from "@/lib/admin/server/auth";
import { db, prepareAdmin } from "@/lib/admin/server/db";
import { listRoleDefinitions } from "@/lib/admin/server/roles";
import { readSettings } from "@/lib/admin/server/settings";
import { parseRoleInput } from "@/lib/game/role-input";
import type { RoleDefinition } from "@/lib/game/types";
import { toFaction } from "@/lib/roles";

type Query = NeonQueryPromise<false, false>;
type Payload = Record<string, unknown>;
type Outcome = { queries: Query[]; audit: Omit<AuditInput, "reason">; result?: unknown };

type ActionDefinition = {
  permission: Permission | null | ((payload: Payload) => Permission);
  reauth?: boolean | ((payload: Payload) => boolean);
  reason?: boolean;
  run: (admin: AdminContext, payload: Payload) => Promise<Outcome>;
};

const DURATION_KINDS: RestrictionKind[] = ["mute", "chat_restrict", "matchmaking_restrict", "suspension", "temp_ban"];
const REQUIRED_DURATION: RestrictionKind[] = ["suspension", "temp_ban"];

function invalid(message: string): never {
  throw new AdminError(400, "invalid", message);
}

function text(payload: Payload, field: string, min: number, max: number, label = field) {
  const value = payload[field];
  if (typeof value !== "string") invalid(`${label} is required.`);
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (clean.length < min || clean.length > max) {
    invalid(min > 0 ? `${label} must be ${min} to ${max} characters.` : `${label} is too long.`);
  }
  return clean;
}

function integer(payload: Payload, field: string, min: number, max: number, label = field) {
  const value = payload[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    invalid(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

function restrictionKind(payload: Payload) {
  const kind = payload.kind;
  if (typeof kind !== "string" || !(kind in RESTRICTION_KINDS)) invalid("Choose a restriction type.");
  return kind as RestrictionKind;
}

async function player(userId: unknown) {
  if (typeof userId !== "string" || !userId || userId.length > 200) invalid("Choose a player.");
  const rows = (await db()`
    SELECT privy_user_id, player_id, username, level, xp, rank FROM profiles WHERE privy_user_id = ${userId}
  `) as { privy_user_id: string; player_id: string; username: string; level: number; xp: number; rank: string }[];
  if (!rows[0]) throw new AdminError(404, "not-found", "That player no longer exists.");
  return rows[0];
}

async function adminAccount(adminId: unknown) {
  if (typeof adminId !== "number" || !Number.isInteger(adminId)) invalid("Choose an admin.");
  const rows = (await db()`
    SELECT id, username, role, disabled_at, totp_enabled FROM admin_accounts WHERE id = ${adminId}
  `) as { id: number; username: string; role: string; disabled_at: string | null; totp_enabled: boolean }[];
  if (!rows[0]) throw new AdminError(404, "not-found", "That admin no longer exists.");
  return rows[0];
}

async function assertAnotherSuperAdmin(excludingId: number) {
  const rows = (await db()`
    SELECT COUNT(*)::int AS count FROM admin_accounts
    WHERE role = 'super_admin' AND disabled_at IS NULL AND id <> ${excludingId}
  `) as { count: number }[];
  if (rows[0].count < 1) invalid("TRUSTLESS must keep at least one active Super Admin.");
}

function restrictionPermission(kind: RestrictionKind): Permission {
  return BAN_KINDS.includes(kind) ? "players.ban" : "players.moderate";
}

const ACTIONS: Record<string, ActionDefinition> = {
  "player.rename": {
    permission: "players.edit",
    async run(admin, payload) {
      const target = await player(payload.userId);
      const username = text(payload, "username", 1, 16, "Username");
      const sql = db();
      return {
        queries: [
          sql`INSERT INTO player_username_history (privy_user_id, username, changed_by) VALUES (${target.privy_user_id}, ${target.username}, ${`admin:${admin.username}`})`,
          sql`UPDATE profiles SET username = ${username}, updated_at = now() WHERE privy_user_id = ${target.privy_user_id}`,
        ],
        audit: { action: "player.rename", targetType: "player", targetId: target.privy_user_id, previous: { username: target.username }, next: { username } },
      };
    },
  },
  "player.reset_username": {
    permission: "players.edit",
    async run(admin, payload) {
      const target = await player(payload.userId);
      const username = `Player-${target.player_id.replace(/^TRST-/, "")}`.slice(0, 16);
      const sql = db();
      return {
        queries: [
          sql`INSERT INTO player_username_history (privy_user_id, username, changed_by) VALUES (${target.privy_user_id}, ${target.username}, ${`admin:${admin.username}`})`,
          sql`UPDATE profiles SET username = ${username}, updated_at = now() WHERE privy_user_id = ${target.privy_user_id}`,
        ],
        audit: { action: "player.reset_username", targetType: "player", targetId: target.privy_user_id, previous: { username: target.username }, next: { username } },
      };
    },
  },
  "player.adjust_xp": {
    permission: "players.edit",
    async run(_admin, payload) {
      const target = await player(payload.userId);
      const delta = integer(payload, "delta", -100_000, 100_000, "XP change");
      if (delta === 0) invalid("XP change cannot be zero.");
      const xp = Math.max(0, Number(target.xp) + delta);
      return {
        queries: [db()`UPDATE profiles SET xp = ${xp}, updated_at = now() WHERE privy_user_id = ${target.privy_user_id}`],
        audit: { action: "player.adjust_xp", targetType: "player", targetId: target.privy_user_id, previous: { xp: Number(target.xp) }, next: { xp, delta } },
      };
    },
  },
  "player.correct_stats": {
    permission: "players.edit",
    async run(_admin, payload) {
      const target = await player(payload.userId);
      const level = integer(payload, "level", 1, 1000, "Level");
      const xp = integer(payload, "xp", 0, 10_000_000, "XP");
      const rank = text(payload, "rank", 1, 30, "Rank");
      return {
        queries: [db()`UPDATE profiles SET level = ${level}, xp = ${xp}, rank = ${rank}, updated_at = now() WHERE privy_user_id = ${target.privy_user_id}`],
        audit: {
          action: "player.correct_stats", targetType: "player", targetId: target.privy_user_id,
          previous: { level: Number(target.level), xp: Number(target.xp), rank: target.rank }, next: { level, xp, rank },
        },
      };
    },
  },
  "player.restrict": {
    permission: (payload) => restrictionPermission(restrictionKind(payload)),
    reauth: (payload) => payload.kind === "perm_ban",
    async run(admin, payload) {
      const target = await player(payload.userId);
      const kind = restrictionKind(payload);
      const hours = payload.durationHours;
      if (REQUIRED_DURATION.includes(kind) && hours === undefined) invalid("Choose how long this lasts.");
      const durationHours =
        DURATION_KINDS.includes(kind) && hours !== undefined && hours !== null
          ? integer(payload, "durationHours", 1, 24 * 365, "Duration")
          : null;
      const reason = text(payload, "reason", 4, 500, "Reason");
      const expiresAt = durationHours ? new Date(Date.now() + durationHours * 3_600_000).toISOString() : null;
      return {
        queries: [
          db()`
            INSERT INTO player_restrictions (privy_user_id, kind, reason, created_by_name, expires_at)
            VALUES (${target.privy_user_id}, ${kind}, ${reason}, ${admin.username}, ${expiresAt})
          `,
        ],
        audit: { action: `player.${kind}`, targetType: "player", targetId: target.privy_user_id, next: { kind, durationHours, expiresAt } },
      };
    },
  },
  "player.lift_restriction": {
    permission: "players.moderate",
    async run(admin, payload) {
      const id = payload.restrictionId;
      if (typeof id !== "string" || !/^\d+$/.test(id)) invalid("Choose a restriction.");
      const rows = (await db()`SELECT * FROM player_restrictions WHERE id = ${id}::bigint`) as {
        id: string; privy_user_id: string; kind: RestrictionKind; revoked_at: string | null;
      }[];
      const restriction = rows[0];
      if (!restriction) throw new AdminError(404, "not-found", "That restriction no longer exists.");
      if (restriction.revoked_at) invalid("That restriction was already lifted.");
      if (!admin.permissions.includes(restrictionPermission(restriction.kind))) {
        throw new AdminError(403, "forbidden", "Your admin role can't lift bans.");
      }
      const reason = text(payload, "reason", 4, 500, "Reason");
      return {
        queries: [
          db()`
            UPDATE player_restrictions
            SET revoked_at = now(), revoked_by_name = ${admin.username}, revoke_reason = ${reason}
            WHERE id = ${id}::bigint
          `,
        ],
        audit: {
          action: "player.lift_restriction", targetType: "player", targetId: restriction.privy_user_id,
          previous: { restrictionId: id, kind: restriction.kind, active: true }, next: { active: false },
        },
      };
    },
  },
  "player.add_note": {
    permission: "players.notes",
    reason: false,
    async run(admin, payload) {
      const target = await player(payload.userId);
      const body = text(payload, "body", 1, 2000, "Note");
      return {
        queries: [db()`INSERT INTO player_notes (privy_user_id, admin_name, body) VALUES (${target.privy_user_id}, ${admin.username}, ${body})`],
        audit: { action: "player.add_note", targetType: "player", targetId: target.privy_user_id, next: { body } },
      };
    },
  },
  "player.grant_achievement": {
    permission: "achievements.grant",
    async run(_admin, payload) {
      const target = await player(payload.userId);
      const achievement = ACHIEVEMENTS.find((item) => item.id === payload.achievementId);
      if (!achievement) invalid("Choose an achievement.");
      return {
        queries: [
          db()`
            INSERT INTO player_achievements (privy_user_id, achievement_id, name, description)
            VALUES (${target.privy_user_id}, ${achievement.id}, ${achievement.name}, ${achievement.description})
            ON CONFLICT (privy_user_id, achievement_id) DO NOTHING
          `,
        ],
        audit: { action: "player.grant_achievement", targetType: "player", targetId: target.privy_user_id, next: { achievementId: achievement.id } },
      };
    },
  },
  "player.revoke_achievement": {
    permission: "achievements.grant",
    async run(_admin, payload) {
      const target = await player(payload.userId);
      const achievementId = text(payload, "achievementId", 1, 60, "Achievement");
      return {
        queries: [db()`DELETE FROM player_achievements WHERE privy_user_id = ${target.privy_user_id} AND achievement_id = ${achievementId}`],
        audit: { action: "player.revoke_achievement", targetType: "player", targetId: target.privy_user_id, previous: { achievementId } },
      };
    },
  },
  "player.delete": {
    permission: "players.delete",
    reauth: true,
    async run(_admin, payload) {
      const target = await player(payload.userId);
      if (payload.confirmation !== target.username) invalid("Type the player's username exactly to confirm.");
      return {
        queries: [db()`DELETE FROM profiles WHERE privy_user_id = ${target.privy_user_id}`],
        audit: {
          action: "player.delete", targetType: "player", targetId: target.privy_user_id,
          previous: { username: target.username, playerId: target.player_id, level: Number(target.level), xp: Number(target.xp) },
        },
      };
    },
  },
  "match.add": {
    permission: "matches.edit",
    async run(_admin, payload) {
      const target = await player(payload.userId);
      const result = payload.result === "win" ? "win" : payload.result === "loss" ? "loss" : invalid("Choose win or loss.");
      const role = text(payload, "role", 1, 40, "Role");
      const faction = toFaction(payload.faction);
      const xpEarned = integer(payload, "xpEarned", 0, 10_000, "XP earned");
      const correctVotes = integer(payload, "correctVotes", 0, 100, "Correct votes");
      return {
        queries: [
          db()`
            INSERT INTO match_history (privy_user_id, result, role, faction, xp_earned, correct_votes)
            VALUES (${target.privy_user_id}, ${result}, ${role}, ${faction}, ${xpEarned}, ${correctVotes})
          `,
        ],
        audit: { action: "match.add", targetType: "player", targetId: target.privy_user_id, next: { result, role, faction, xpEarned, correctVotes } },
      };
    },
  },
  "match.invalidate": {
    permission: "matches.edit",
    async run(_admin, payload) {
      const id = payload.matchId;
      if (typeof id !== "string" || !/^\d+$/.test(id)) invalid("Choose a match record.");
      const rows = (await db()`SELECT * FROM match_history WHERE id = ${id}::bigint`) as Record<string, unknown>[];
      if (!rows[0]) throw new AdminError(404, "not-found", "That match record no longer exists.");
      return {
        queries: [db()`DELETE FROM match_history WHERE id = ${id}::bigint`],
        audit: { action: "match.invalidate", targetType: "match", targetId: id, previous: rows[0] },
      };
    },
  },
  "report.resolve": {
    permission: "moderation.act",
    async run(admin, payload) {
      const id = payload.reportId;
      if (typeof id !== "string" || !/^\d+$/.test(id)) invalid("Choose a report.");
      const outcome = payload.outcome;
      if (outcome !== "dismissed" && outcome !== "escalated" && outcome !== "actioned") invalid("Choose an outcome.");
      const rows = (await db()`SELECT id, reported_id, status FROM player_reports WHERE id = ${id}::bigint`) as {
        id: string; reported_id: string; status: string;
      }[];
      if (!rows[0]) throw new AdminError(404, "not-found", "That report no longer exists.");
      const reason = text(payload, "reason", 4, 500, "Reason");
      return {
        queries: [
          db()`
            UPDATE player_reports
            SET status = ${outcome}, resolution = ${reason}, resolved_by_name = ${admin.username},
              resolved_at = ${outcome === "escalated" ? null : new Date().toISOString()}
            WHERE id = ${id}::bigint
          `,
        ],
        audit: { action: "report.resolve", targetType: "report", targetId: id, previous: { status: rows[0].status }, next: { status: outcome } },
      };
    },
  },
  "settings.update": {
    permission: (payload) => {
      const key = payload.key as SettingsKey;
      if (!(key in SETTINGS_PERMISSION)) invalid("Unknown settings group.");
      return SETTINGS_PERMISSION[key];
    },
    reauth: (payload) => payload.key === "maintenance",
    async run(admin, payload) {
      const key = payload.key as SettingsKey;
      const value = validateSettings(key, payload.value);
      if (typeof value === "string") invalid(value);
      const previous = await readSettings(key);
      return {
        queries: [
          db()`
            INSERT INTO game_settings (key, value, updated_at, updated_by_name)
            VALUES (${key}, ${JSON.stringify(value)}::jsonb, now(), ${admin.username})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by_name = EXCLUDED.updated_by_name
          `,
        ],
        audit: { action: `settings.${key}`, targetType: "settings", targetId: key, previous, next: value },
      };
    },
  },
  "admin.create": {
    permission: "admins.manage",
    reauth: true,
    async run(admin, payload) {
      const username = text(payload, "username", 3, 32, "Username");
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) invalid("Usernames can use letters, numbers, dots, dashes and underscores.");
      const password = typeof payload.newPassword === "string" ? payload.newPassword : "";
      const problem = passwordProblem(password);
      if (problem) invalid(problem);
      if (!isAdminRole(payload.role)) invalid("Choose a role.");
      return {
        queries: [
          db()`
            INSERT INTO admin_accounts (username, password_hash, role, created_by_name)
            VALUES (${username}, ${await hashPassword(password)}, ${payload.role}, ${admin.username})
          `,
        ],
        audit: { action: "admin.create", targetType: "admin", targetId: username, next: { username, role: payload.role } },
      };
    },
  },
  "admin.update_role": {
    permission: "admins.manage",
    reauth: true,
    async run(admin, payload) {
      const target = await adminAccount(payload.adminId);
      if (target.id === admin.id) invalid("You can't change your own role.");
      if (!isAdminRole(payload.role)) invalid("Choose a role.");
      if (target.role === "super_admin" && payload.role !== "super_admin") await assertAnotherSuperAdmin(target.id);
      const sql = db();
      return {
        queries: [
          sql`UPDATE admin_accounts SET role = ${payload.role} WHERE id = ${target.id}`,
          sql`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${target.id} AND revoked_at IS NULL`,
        ],
        audit: { action: "admin.update_role", targetType: "admin", targetId: String(target.id), previous: { role: target.role }, next: { role: payload.role } },
      };
    },
  },
  "admin.set_disabled": {
    permission: "admins.manage",
    reauth: true,
    async run(admin, payload) {
      const target = await adminAccount(payload.adminId);
      if (target.id === admin.id) invalid("You can't disable your own account.");
      const disabled = payload.disabled === true;
      if (disabled && target.role === "super_admin") await assertAnotherSuperAdmin(target.id);
      const sql = db();
      return {
        queries: [
          sql`UPDATE admin_accounts SET disabled_at = ${disabled ? new Date().toISOString() : null} WHERE id = ${target.id}`,
          sql`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${target.id} AND revoked_at IS NULL`,
        ],
        audit: {
          action: disabled ? "admin.disable" : "admin.enable", targetType: "admin", targetId: String(target.id),
          previous: { disabled: Boolean(target.disabled_at) }, next: { disabled },
        },
      };
    },
  },
  "admin.reset_password": {
    permission: "admins.manage",
    reauth: true,
    async run(_admin, payload) {
      const target = await adminAccount(payload.adminId);
      const password = typeof payload.newPassword === "string" ? payload.newPassword : "";
      const problem = passwordProblem(password);
      if (problem) invalid(problem);
      const sql = db();
      return {
        queries: [
          sql`UPDATE admin_accounts SET password_hash = ${await hashPassword(password)}, password_changed_at = now() WHERE id = ${target.id}`,
          sql`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${target.id} AND revoked_at IS NULL`,
        ],
        audit: { action: "admin.reset_password", targetType: "admin", targetId: String(target.id) },
      };
    },
  },
  "admin.reset_2fa": {
    permission: "admins.manage",
    reauth: true,
    async run(_admin, payload) {
      const target = await adminAccount(payload.adminId);
      return {
        queries: [db()`UPDATE admin_accounts SET totp_enabled = false, totp_secret = NULL WHERE id = ${target.id}`],
        audit: { action: "admin.reset_2fa", targetType: "admin", targetId: String(target.id), previous: { totpEnabled: target.totp_enabled }, next: { totpEnabled: false } },
      };
    },
  },
  "admin.revoke_sessions": {
    permission: "admins.manage",
    async run(_admin, payload) {
      const target = await adminAccount(payload.adminId);
      return {
        queries: [db()`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${target.id} AND revoked_at IS NULL`],
        audit: { action: "admin.revoke_sessions", targetType: "admin", targetId: String(target.id) },
      };
    },
  },
  "self.change_password": {
    permission: null,
    reauth: true,
    reason: false,
    async run(admin, payload) {
      const password = typeof payload.newPassword === "string" ? payload.newPassword : "";
      const problem = passwordProblem(password);
      if (problem) invalid(problem);
      const sql = db();
      return {
        queries: [
          sql`UPDATE admin_accounts SET password_hash = ${await hashPassword(password)}, password_changed_at = now() WHERE id = ${admin.id}`,
          sql`
            UPDATE admin_sessions SET revoked_at = now()
            WHERE admin_id = ${admin.id} AND revoked_at IS NULL AND left(token_hash, 12) <> ${admin.sessionRef}
          `,
        ],
        audit: { action: "self.change_password", targetType: "admin", targetId: String(admin.id) },
      };
    },
  },
  "self.totp_begin": {
    permission: null,
    reauth: true,
    reason: false,
    async run(admin) {
      if (admin.totpEnabled) invalid("2FA is already on.");
      const secret = newTotpSecret();
      return {
        queries: [db()`UPDATE admin_accounts SET totp_secret = ${secret}, totp_enabled = false WHERE id = ${admin.id}`],
        audit: { action: "self.totp_begin", targetType: "admin", targetId: String(admin.id) },
        result: { secret, uri: totpUri(admin.username, secret) },
      };
    },
  },
  "self.totp_enable": {
    permission: null,
    reason: false,
    async run(admin, payload) {
      const rows = (await db()`SELECT totp_secret, totp_enabled FROM admin_accounts WHERE id = ${admin.id}`) as {
        totp_secret: string | null; totp_enabled: boolean;
      }[];
      const secret = rows[0]?.totp_secret;
      if (!secret || rows[0].totp_enabled) invalid("Start 2FA setup first.");
      if (typeof payload.setupCode !== "string" || !verifyTotp(secret, payload.setupCode)) {
        invalid("That code didn't match. Check your authenticator app and try again.");
      }
      return {
        queries: [db()`UPDATE admin_accounts SET totp_enabled = true WHERE id = ${admin.id}`],
        audit: { action: "self.totp_enable", targetType: "admin", targetId: String(admin.id), next: { totpEnabled: true } },
      };
    },
  },
  "self.totp_disable": {
    permission: null,
    reauth: true,
    reason: false,
    async run(admin) {
      return {
        queries: [db()`UPDATE admin_accounts SET totp_enabled = false, totp_secret = NULL WHERE id = ${admin.id}`],
        audit: { action: "self.totp_disable", targetType: "admin", targetId: String(admin.id), next: { totpEnabled: false } },
      };
    },
  },
  "role.create": {
    permission: "roles.edit",
    async run(admin, payload) {
      const role = roleFromPayload(payload.role);
      const existing = await listRoleDefinitions();
      if (existing.some((item) => item.id === role.id)) invalid("A role with that id already exists.");
      if (existing.some((item) => item.name.toLowerCase() === role.name.toLowerCase())) {
        invalid("A role with that name already exists.");
      }
      return {
        queries: [
          db()`
            INSERT INTO role_definitions (id, definition, sort_order, updated_by_name)
            VALUES (
              ${role.id},
              ${JSON.stringify(role)}::jsonb,
              (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM role_definitions),
              ${admin.username}
            )
          `,
        ],
        audit: { action: "role.create", targetType: "role", targetId: role.id, next: role },
        result: { role },
      };
    },
  },
  "role.update": {
    permission: "roles.edit",
    async run(admin, payload) {
      const id = roleId(payload.id);
      const role = roleFromPayload(payload.role);
      if (role.id !== id) invalid("The role id cannot change. Add a new role instead.");
      const existing = await listRoleDefinitions();
      const previous = existing.find((item) => item.id === id);
      if (!previous) throw new AdminError(404, "not-found", "That role no longer exists.");
      if (existing.some((item) => item.id !== id && item.name.toLowerCase() === role.name.toLowerCase())) {
        invalid("A role with that name already exists.");
      }
      return {
        queries: [
          db()`
            UPDATE role_definitions
            SET definition = ${JSON.stringify(role)}::jsonb, updated_at = now(), updated_by_name = ${admin.username}
            WHERE id = ${id}
          `,
        ],
        audit: { action: "role.update", targetType: "role", targetId: id, previous, next: role },
        result: { role },
      };
    },
  },
  "role.delete": {
    permission: "roles.edit",
    async run(_admin, payload) {
      const id = roleId(payload.id);
      const existing = await listRoleDefinitions();
      const previous = existing.find((item) => item.id === id);
      if (!previous) throw new AdminError(404, "not-found", "That role no longer exists.");
      return {
        queries: [db()`DELETE FROM role_definitions WHERE id = ${id}`],
        audit: { action: "role.delete", targetType: "role", targetId: id, previous },
        result: { id },
      };
    },
  },
};

function roleId(value: unknown) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{1,39}$/.test(value)) invalid("Choose a role.");
  return value;
}

function roleFromPayload(value: unknown): RoleDefinition {
  const parsed = parseRoleInput(value);
  if (typeof parsed === "string") invalid(parsed);
  return parsed;
}

export async function runAdminAction(admin: AdminContext, name: unknown, payload: unknown) {
  if (typeof name !== "string" || !(name in ACTIONS)) invalid("Unknown action.");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) invalid("Invalid request.");
  const definition = ACTIONS[name];
  const input = payload as Payload;
  await prepareAdmin();

  const permission =
    typeof definition.permission === "function" ? definition.permission(input) : definition.permission;
  if (permission && !admin.permissions.includes(permission)) {
    throw new AdminError(403, "forbidden", "Your admin role can't do that.");
  }

  const reason = definition.reason === false ? null : text(input, "reason", 4, 500, "Reason");
  const needsReauth = typeof definition.reauth === "function" ? definition.reauth(input) : Boolean(definition.reauth);
  if (needsReauth) await reauthenticate(admin, input.password, input.code);

  const outcome = await definition.run(admin, input);
  try {
    await db().transaction([...outcome.queries, auditQuery(admin, { ...outcome.audit, reason })]);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      throw new AdminError(409, "exists", "That name is already taken.");
    }
    throw error;
  }
  return outcome.result ?? { ok: true };
}
