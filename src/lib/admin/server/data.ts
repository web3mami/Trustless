import { isAdminRole } from "@/lib/admin/permissions";
import {
  RESTRICTION_KINDS,
  REPORT_CATEGORIES,
  type AdminAccount,
  type AnalyticsData,
  type AuditEntry,
  type FactionStat,
  type MatchRecord,
  type OverviewData,
  type Page,
  type PlayerDetail,
  type PlayerStatus,
  type PlayerSummary,
  type Report,
  type ReportCategory,
  type Restriction,
  type RestrictionKind,
  type RoleStatRow,
} from "@/lib/admin/types";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { readSettings } from "@/lib/admin/server/settings";
import { db, prepareAdmin } from "@/lib/admin/server/db";
import { toFaction, type Faction } from "@/lib/roles";

type Row = Record<string, unknown>;

const FACTIONS: Faction[] = ["good", "werewolf", "solo", "neutral"];
const ACTIVE = "r.revoked_at IS NULL AND (r.expires_at IS NULL OR r.expires_at > now())";

const iso = (value: unknown) => (value ? new Date(String(value)).toISOString() : null);
const num = (value: unknown) => Number(value ?? 0);
const rate = (wins: number, games: number) => (games > 0 ? Math.round((wins / games) * 100) : 0);

export function pageParams(page: unknown, pageSize = 25) {
  const current = Math.max(1, Math.min(10_000, Math.floor(Number(page) || 1)));
  return { page: current, pageSize, offset: (current - 1) * pageSize };
}

const STATUS_SQL = `
  CASE
    WHEN EXISTS (SELECT 1 FROM player_restrictions r WHERE r.privy_user_id = p.privy_user_id AND r.kind IN ('temp_ban','perm_ban') AND ${ACTIVE}) THEN 'banned'
    WHEN EXISTS (SELECT 1 FROM player_restrictions r WHERE r.privy_user_id = p.privy_user_id AND r.kind = 'suspension' AND ${ACTIVE}) THEN 'suspended'
    WHEN EXISTS (SELECT 1 FROM player_restrictions r WHERE r.privy_user_id = p.privy_user_id AND r.kind IN ('mute','chat_restrict','matchmaking_restrict') AND ${ACTIVE}) THEN 'restricted'
    ELSE 'active'
  END`;

const MONITORED_SQL = `EXISTS (SELECT 1 FROM player_restrictions r WHERE r.privy_user_id = p.privy_user_id AND r.kind = 'monitor' AND ${ACTIVE})`;

function toPlayerSummary(row: Row): PlayerSummary {
  return {
    userId: String(row.privy_user_id),
    playerId: String(row.player_id),
    username: String(row.username),
    level: num(row.level),
    xp: num(row.xp),
    rank: String(row.rank),
    matches: num(row.matches),
    wins: num(row.wins),
    joinedAt: iso(row.created_at)!,
    lastActiveAt: iso(row.last_active_at),
    walletAddress: row.wallet_address ? String(row.wallet_address) : null,
    status: String(row.status) as PlayerStatus,
    monitored: Boolean(row.monitored),
  };
}

function toRestriction(row: Row): Restriction {
  const expiresAt = iso(row.expires_at);
  const revokedAt = iso(row.revoked_at);
  return {
    id: String(row.id),
    userId: String(row.privy_user_id),
    username: row.username ? String(row.username) : undefined,
    kind: (String(row.kind) in RESTRICTION_KINDS ? row.kind : "warning") as RestrictionKind,
    reason: String(row.reason),
    createdBy: String(row.created_by_name),
    createdAt: iso(row.created_at)!,
    expiresAt,
    revokedAt,
    revokedBy: row.revoked_by_name ? String(row.revoked_by_name) : null,
    revokeReason: row.revoke_reason ? String(row.revoke_reason) : null,
    active: !revokedAt && (!expiresAt || new Date(expiresAt).getTime() > Date.now()),
  };
}

function toReport(row: Row): Report {
  return {
    id: String(row.id),
    category: (String(row.category) in REPORT_CATEGORIES ? row.category : "spam") as ReportCategory,
    reporterId: row.reporter_id ? String(row.reporter_id) : null,
    reporterName: row.reporter_name ? String(row.reporter_name) : null,
    reportedId: String(row.reported_id),
    reportedName: row.reported_name ? String(row.reported_name) : null,
    matchRef: row.match_ref ? String(row.match_ref) : null,
    details: String(row.details ?? ""),
    status: String(row.status) as Report["status"],
    createdAt: iso(row.created_at)!,
    resolvedAt: iso(row.resolved_at),
    resolvedBy: row.resolved_by_name ? String(row.resolved_by_name) : null,
    resolution: row.resolution ? String(row.resolution) : null,
  };
}

function toMatch(row: Row): MatchRecord {
  return {
    id: String(row.id),
    userId: String(row.privy_user_id),
    username: row.username ? String(row.username) : undefined,
    playerId: row.player_id ? String(row.player_id) : undefined,
    result: row.result === "win" ? "win" : "loss",
    role: String(row.role),
    faction: toFaction(row.faction),
    xpEarned: num(row.xp_earned),
    correctVotes: num(row.correct_votes),
    playedAt: iso(row.played_at)!,
  };
}

export function toAudit(row: Row): AuditEntry {
  return {
    id: String(row.id),
    adminId: row.admin_id === null || row.admin_id === undefined ? null : num(row.admin_id),
    adminName: String(row.admin_name),
    action: String(row.action),
    targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    previousValue: row.previous_value ?? null,
    newValue: row.new_value ?? null,
    reason: row.reason ? String(row.reason) : null,
    ip: row.ip ? String(row.ip) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    sessionRef: row.session_ref ? String(row.session_ref) : null,
    createdAt: iso(row.created_at)!,
  };
}

async function factionStats(): Promise<FactionStat[]> {
  const rows = (await db()`
    SELECT faction, COUNT(*)::int AS games, COUNT(*) FILTER (WHERE result = 'win')::int AS wins
    FROM match_history GROUP BY faction
  `) as Row[];
  return FACTIONS.map((faction) => {
    const row = rows.find((item) => item.faction === faction);
    const games = num(row?.games);
    const wins = num(row?.wins);
    return { faction, games, wins, winRate: rate(wins, games) };
  });
}

export async function roleStats(): Promise<RoleStatRow[]> {
  const rows = (await db()`
    SELECT role,
      (array_agg(faction ORDER BY played_at DESC))[1] AS faction,
      COUNT(*)::int AS games,
      COUNT(*) FILTER (WHERE result = 'win')::int AS wins
    FROM match_history GROUP BY role ORDER BY games DESC, role ASC
  `) as Row[];
  return rows.map((row) => {
    const games = num(row.games);
    const wins = num(row.wins);
    return {
      role: String(row.role),
      faction: toFaction(row.faction),
      games,
      wins,
      losses: games - wins,
      winRate: rate(wins, games),
    };
  });
}

export async function getOverview(): Promise<OverviewData> {
  await prepareAdmin();
  const sql = db();
  const started = Date.now();
  const [counts, factions, roles, recentAudit, recentBans, recentReports, maintenance, admins] =
    await Promise.all([
      sql`
        SELECT
          (SELECT COUNT(*)::int FROM profiles) AS players,
          (SELECT COUNT(*)::int FROM profiles WHERE created_at >= date_trunc('day', now())) AS new_today,
          (SELECT COUNT(*)::int FROM profiles WHERE last_active_at > now() - interval '1 day') AS dau,
          (SELECT COUNT(*)::int FROM profiles WHERE last_active_at > now() - interval '7 days') AS wau,
          (SELECT COUNT(*)::int FROM profiles WHERE last_active_at > now() - interval '30 days') AS mau,
          (SELECT COUNT(*)::int FROM match_history WHERE played_at >= date_trunc('day', now())) AS results_today,
          (SELECT COUNT(*)::int FROM match_history) AS results_total,
          (SELECT COUNT(*)::int FROM player_reports WHERE status IN ('open','escalated')) AS open_reports,
          (SELECT COUNT(DISTINCT privy_user_id)::int FROM player_restrictions r WHERE kind = 'suspension' AND ${sql.unsafe(ACTIVE)}) AS suspended,
          (SELECT COUNT(DISTINCT privy_user_id)::int FROM player_restrictions r WHERE kind IN ('temp_ban','perm_ban') AND ${sql.unsafe(ACTIVE)}) AS banned,
          (SELECT COUNT(DISTINCT privy_user_id)::int FROM player_restrictions r WHERE kind = 'monitor' AND ${sql.unsafe(ACTIVE)}) AS monitored
      `,
      factionStats(),
      roleStats(),
      sql`SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 8`,
      sql`
        SELECT r.*, p.username FROM player_restrictions r
        JOIN profiles p ON p.privy_user_id = r.privy_user_id
        WHERE r.kind IN ('suspension','temp_ban','perm_ban')
        ORDER BY r.created_at DESC LIMIT 5
      `,
      sql`
        SELECT rep.*, a.username AS reporter_name, b.username AS reported_name
        FROM player_reports rep
        LEFT JOIN profiles a ON a.privy_user_id = rep.reporter_id
        LEFT JOIN profiles b ON b.privy_user_id = rep.reported_id
        ORDER BY rep.created_at DESC LIMIT 5
      `,
      readSettings("maintenance"),
      sql`SELECT COUNT(*) FILTER (WHERE NOT totp_enabled AND disabled_at IS NULL)::int AS without_2fa FROM admin_accounts`,
    ]);
  const latency = Date.now() - started;
  const count = counts[0] as Row;
  const rated = roles.filter((role) => role.games >= 3);
  const without2fa = num((admins[0] as Row).without_2fa);

  return {
    players: num(count.players),
    newToday: num(count.new_today),
    dau: num(count.dau),
    wau: num(count.wau),
    mau: num(count.mau),
    resultsToday: num(count.results_today),
    resultsTotal: num(count.results_total),
    openReports: num(count.open_reports),
    suspended: num(count.suspended),
    banned: num(count.banned),
    monitored: num(count.monitored),
    factions,
    mostPlayedRoles: roles.slice(0, 5),
    highestWinRoles: [...rated].sort((a, b) => b.winRate - a.winRate).slice(0, 5),
    lowestWinRoles: [...rated].sort((a, b) => a.winRate - b.winRate).slice(0, 5),
    recentAudit: (recentAudit as Row[]).map(toAudit),
    recentBans: (recentBans as Row[]).map(toRestriction),
    recentReports: (recentReports as Row[]).map(toReport),
    system: [
      { label: "Database", state: latency > 2500 ? "warning" : "ok", detail: `Responded in ${latency} ms` },
      {
        label: "Player sign-in",
        state: process.env.NEXT_PUBLIC_PRIVY_APP_ID ? "ok" : "down",
        detail: process.env.NEXT_PUBLIC_PRIVY_APP_ID ? "Privy configured" : "Privy app ID missing",
      },
      {
        label: "Maintenance",
        state: maintenance.enabled ? "warning" : "ok",
        detail: maintenance.enabled ? "Maintenance mode is on" : "Game is open",
      },
      {
        label: "Admin 2FA",
        state: without2fa > 0 ? "warning" : "ok",
        detail: without2fa > 0 ? `${without2fa} admin account${without2fa === 1 ? "" : "s"} without 2FA` : "All admins use 2FA",
      },
      { label: "Match server", state: "warning", detail: "Not connected yet" },
    ],
  };
}

export async function listPlayers(filters: { q: string; status: string; page: unknown }): Promise<Page<PlayerSummary>> {
  await prepareAdmin();
  const { page, pageSize, offset } = pageParams(filters.page);
  const params: unknown[] = [];
  const where: string[] = [];
  const q = filters.q.trim().slice(0, 100);
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`);
    const p = `$${params.length}`;
    where.push(`(p.username ILIKE ${p} OR p.player_id ILIKE ${p} OR p.privy_user_id ILIKE ${p}
      OR COALESCE(p.wallet_address, '') ILIKE ${p}
      OR EXISTS (SELECT 1 FROM player_username_history h WHERE h.privy_user_id = p.privy_user_id AND h.username ILIKE ${p}))`);
  }
  const status = ["active", "restricted", "suspended", "banned"].includes(filters.status) ? filters.status : "";
  const monitoredOnly = filters.status === "monitored";
  const statusFilter = status ? `WHERE status = '${status}'` : monitoredOnly ? "WHERE monitored" : "";

  const base = `
    WITH players AS (
      SELECT p.privy_user_id, p.player_id, p.username, p.level, p.xp, p.rank, p.created_at,
        p.last_active_at, p.wallet_address,
        (SELECT COUNT(*)::int FROM match_history m WHERE m.privy_user_id = p.privy_user_id) AS matches,
        (SELECT COUNT(*)::int FROM match_history m WHERE m.privy_user_id = p.privy_user_id AND m.result = 'win') AS wins,
        ${STATUS_SQL} AS status,
        ${MONITORED_SQL} AS monitored
      FROM profiles p
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    )`;
  const sql = db();
  const [rows, totals] = await Promise.all([
    sql.query(`${base} SELECT * FROM players ${statusFilter} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`, params),
    sql.query(`${base} SELECT COUNT(*)::int AS total FROM players ${statusFilter}`, params),
  ]);
  return { rows: (rows as Row[]).map(toPlayerSummary), total: num((totals as Row[])[0]?.total), page, pageSize };
}

export async function getPlayer(userId: string): Promise<PlayerDetail | null> {
  await prepareAdmin();
  const sql = db();
  const rows = (await sql.query(
    `SELECT p.*, ${STATUS_SQL} AS status, ${MONITORED_SQL} AS monitored,
      (SELECT COUNT(*)::int FROM match_history m WHERE m.privy_user_id = p.privy_user_id) AS matches,
      (SELECT COUNT(*)::int FROM match_history m WHERE m.privy_user_id = p.privy_user_id AND m.result = 'win') AS wins,
      (SELECT COALESCE(SUM(correct_votes), 0)::int FROM match_history m WHERE m.privy_user_id = p.privy_user_id) AS correct_votes
    FROM profiles p WHERE p.privy_user_id = $1`,
    [userId],
  )) as Row[];
  const row = rows[0];
  if (!row) return null;

  const [history, achievements, factions, roles, matches, restrictions, notes, received, submitted] =
    await Promise.all([
      sql`SELECT username, changed_by, changed_at FROM player_username_history WHERE privy_user_id = ${userId} ORDER BY changed_at DESC`,
      sql`SELECT achievement_id, name, unlocked_at FROM player_achievements WHERE privy_user_id = ${userId} ORDER BY unlocked_at DESC`,
      sql`SELECT faction, COUNT(*)::int AS games, COUNT(*) FILTER (WHERE result = 'win')::int AS wins FROM match_history WHERE privy_user_id = ${userId} GROUP BY faction`,
      sql`
        SELECT role, (array_agg(faction ORDER BY played_at DESC))[1] AS faction,
          COUNT(*)::int AS games, COUNT(*) FILTER (WHERE result = 'win')::int AS wins
        FROM match_history WHERE privy_user_id = ${userId} GROUP BY role ORDER BY games DESC
      `,
      sql`SELECT * FROM match_history WHERE privy_user_id = ${userId} ORDER BY played_at DESC LIMIT 25`,
      sql`SELECT * FROM player_restrictions WHERE privy_user_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT id, admin_name, body, created_at FROM player_notes WHERE privy_user_id = ${userId} ORDER BY created_at DESC`,
      sql`
        SELECT rep.*, a.username AS reporter_name, b.username AS reported_name
        FROM player_reports rep
        LEFT JOIN profiles a ON a.privy_user_id = rep.reporter_id
        LEFT JOIN profiles b ON b.privy_user_id = rep.reported_id
        WHERE rep.reported_id = ${userId} ORDER BY rep.created_at DESC LIMIT 50
      `,
      sql`SELECT COUNT(*)::int AS count FROM player_reports WHERE reporter_id = ${userId}`,
    ]);

  const factionRecord = Object.fromEntries(
    FACTIONS.map((faction) => {
      const entry = (factions as Row[]).find((item) => item.faction === faction);
      return [faction, { games: num(entry?.games), wins: num(entry?.wins) }];
    }),
  ) as PlayerDetail["factions"];
  const summary = toPlayerSummary(row);

  return {
    ...summary,
    gender: String(row.gender),
    correctVotes: num(row.correct_votes),
    losses: summary.matches - summary.wins,
    previousUsernames: (history as Row[]).map((item) => ({
      username: String(item.username),
      changedBy: String(item.changed_by),
      changedAt: iso(item.changed_at)!,
    })),
    achievements: (achievements as Row[]).map((item) => ({
      id: String(item.achievement_id),
      name: String(item.name),
      unlockedAt: iso(item.unlocked_at)!,
    })),
    factions: factionRecord,
    roles: (roles as Row[]).map((item) => ({
      role: String(item.role),
      faction: toFaction(item.faction),
      games: num(item.games),
      wins: num(item.wins),
    })),
    recentMatches: (matches as Row[]).map(toMatch),
    restrictions: (restrictions as Row[]).map(toRestriction),
    notes: (notes as Row[]).map((item) => ({
      id: String(item.id),
      adminName: String(item.admin_name),
      body: String(item.body),
      createdAt: iso(item.created_at)!,
    })),
    reportsReceived: (received as Row[]).map(toReport),
    reportsSubmitted: num((submitted as Row[])[0]?.count),
  };
}

export async function exportPlayer(userId: string) {
  const player = await getPlayer(userId);
  if (!player) return null;
  const matches = (await db()`SELECT * FROM match_history WHERE privy_user_id = ${userId} ORDER BY played_at DESC`) as Row[];
  return { exportedAt: new Date().toISOString(), ...player, recentMatches: matches.map(toMatch) };
}

export async function listMatches(filters: {
  q: string;
  faction: string;
  result: string;
  from: string;
  to: string;
  page: unknown;
}): Promise<Page<MatchRecord>> {
  await prepareAdmin();
  const { page, pageSize, offset } = pageParams(filters.page);
  const params: unknown[] = [];
  const where: string[] = [];
  const q = filters.q.trim().slice(0, 100);
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`);
    const p = `$${params.length}`;
    where.push(`(m.id::text = $${params.length + 1} OR p.username ILIKE ${p} OR p.player_id ILIKE ${p} OR m.role ILIKE ${p})`);
    params.push(q);
  }
  if (FACTIONS.includes(filters.faction as Faction)) {
    params.push(filters.faction);
    where.push(`m.faction = $${params.length}`);
  }
  if (filters.result === "win" || filters.result === "loss") {
    params.push(filters.result);
    where.push(`m.result = $${params.length}`);
  }
  for (const [value, operator] of [[filters.from, ">="], [filters.to, "<"]] as const) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      params.push(value);
      where.push(`m.played_at ${operator} $${params.length}::date${operator === "<" ? " + 1" : ""}`);
    }
  }
  const base = `FROM match_history m JOIN profiles p ON p.privy_user_id = m.privy_user_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
  const sql = db();
  const [rows, totals] = await Promise.all([
    sql.query(`SELECT m.*, p.username, p.player_id ${base} ORDER BY m.played_at DESC LIMIT ${pageSize} OFFSET ${offset}`, params),
    sql.query(`SELECT COUNT(*)::int AS total ${base}`, params),
  ]);
  return { rows: (rows as Row[]).map(toMatch), total: num((totals as Row[])[0]?.total), page, pageSize };
}

export async function listReports(filters: { status: string; page: unknown }): Promise<Page<Report>> {
  await prepareAdmin();
  const { page, pageSize, offset } = pageParams(filters.page);
  const statuses = filters.status === "closed" ? ["dismissed", "actioned"] : ["open", "escalated"];
  const sql = db();
  const [rows, totals] = await Promise.all([
    sql`
      SELECT rep.*, a.username AS reporter_name, b.username AS reported_name
      FROM player_reports rep
      LEFT JOIN profiles a ON a.privy_user_id = rep.reporter_id
      LEFT JOIN profiles b ON b.privy_user_id = rep.reported_id
      WHERE rep.status = ANY(${statuses})
      ORDER BY rep.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*)::int AS total FROM player_reports WHERE status = ANY(${statuses})`,
  ]);
  return { rows: (rows as Row[]).map(toReport), total: num((totals as Row[])[0]?.total), page, pageSize };
}

export async function listRestrictions(filters: { page: unknown }): Promise<Page<Restriction>> {
  await prepareAdmin();
  const { page, pageSize, offset } = pageParams(filters.page);
  const sql = db();
  const [rows, totals] = await Promise.all([
    sql.query(
      `SELECT r.*, p.username FROM player_restrictions r
       JOIN profiles p ON p.privy_user_id = r.privy_user_id
       WHERE r.kind <> 'warning' AND ${ACTIVE}
       ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
    ),
    sql.query(`SELECT COUNT(*)::int AS total FROM player_restrictions r WHERE r.kind <> 'warning' AND ${ACTIVE}`),
  ]);
  return { rows: (rows as Row[]).map(toRestriction), total: num((totals as Row[])[0]?.total), page, pageSize };
}

export async function achievementStats() {
  await prepareAdmin();
  const sql = db();
  const [counts, players] = await Promise.all([
    sql`SELECT achievement_id, COUNT(*)::int AS count FROM player_achievements GROUP BY achievement_id`,
    sql`SELECT COUNT(*)::int AS count FROM profiles`,
  ]);
  const total = num((players as Row[])[0]?.count);
  return {
    players: total,
    achievements: ACHIEVEMENTS.map((achievement) => {
      const unlocked = num((counts as Row[]).find((row) => row.achievement_id === achievement.id)?.count);
      return { ...achievement, unlocked, unlockRate: total > 0 ? Math.round((unlocked / total) * 1000) / 10 : 0 };
    }),
  };
}

export async function getFactionsAndRoles() {
  await prepareAdmin();
  const [factions, roles] = await Promise.all([factionStats(), roleStats()]);
  return { factions, roles };
}

export async function getAnalytics(): Promise<AnalyticsData> {
  await prepareAdmin();
  const sql = db();
  const [activity, signups, retention, factions, roles, moderation, achievements] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM profiles) AS players,
        (SELECT COUNT(*)::int FROM profiles WHERE last_active_at > now() - interval '1 day') AS dau,
        (SELECT COUNT(*)::int FROM profiles WHERE last_active_at > now() - interval '7 days') AS wau,
        (SELECT COUNT(*)::int FROM profiles WHERE last_active_at > now() - interval '30 days') AS mau
    `,
    sql`
      SELECT to_char(day, 'YYYY-MM-DD') AS day, COUNT(p.privy_user_id)::int AS count
      FROM generate_series(current_date - 29, current_date, interval '1 day') AS day
      LEFT JOIN profiles p ON p.created_at::date = day::date
      GROUP BY day ORDER BY day
    `,
    sql`
      SELECT d.days,
        COUNT(p.privy_user_id) FILTER (WHERE p.created_at <= now() - make_interval(days => d.days))::int AS eligible,
        COUNT(p.privy_user_id) FILTER (
          WHERE p.created_at <= now() - make_interval(days => d.days)
            AND p.last_active_at >= p.created_at + make_interval(days => d.days)
        )::int AS returned
      FROM (VALUES (1), (7), (30)) AS d(days)
      CROSS JOIN profiles p
      GROUP BY d.days ORDER BY d.days
    `,
    factionStats(),
    roleStats(),
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM player_reports) AS reports,
        (SELECT COUNT(*)::int FROM player_restrictions WHERE kind IN ('mute','chat_restrict')) AS mutes,
        (SELECT COUNT(*)::int FROM player_restrictions WHERE kind IN ('suspension','temp_ban','perm_ban')) AS bans
    `,
    sql`SELECT COUNT(*)::int AS unlocked FROM player_achievements`,
  ]);
  const totals = activity[0] as Row;
  const players = num(totals.players);
  const mod = moderation[0] as Row;
  return {
    players,
    dau: num(totals.dau),
    wau: num(totals.wau),
    mau: num(totals.mau),
    signups: (signups as Row[]).map((row) => ({ day: String(row.day), count: num(row.count) })),
    retention: (retention as Row[]).map((row) => ({
      label: `D${num(row.days)}`,
      eligible: num(row.eligible),
      returned: num(row.returned),
    })),
    factions,
    roles,
    moderation: { reports: num(mod.reports), mutes: num(mod.mutes), bans: num(mod.bans), players },
    achievementCompletion:
      players > 0
        ? Math.round((num((achievements as Row[])[0]?.unlocked) / (players * ACHIEVEMENTS.length)) * 1000) / 10
        : 0,
  };
}

export type AuditFilters = {
  q: string;
  action: string;
  admin: string;
  targetType: string;
  from: string;
  to: string;
};

function auditWhere(filters: AuditFilters) {
  const params: unknown[] = [];
  const where: string[] = [];
  const like = (value: string) => `%${value.trim().slice(0, 100).replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  if (filters.q.trim()) {
    params.push(like(filters.q));
    const p = `$${params.length}`;
    where.push(`(action ILIKE ${p} OR admin_name ILIKE ${p} OR COALESCE(target_id,'') ILIKE ${p} OR COALESCE(reason,'') ILIKE ${p})`);
  }
  if (filters.action.trim()) {
    params.push(like(filters.action));
    where.push(`action ILIKE $${params.length}`);
  }
  if (filters.admin.trim()) {
    params.push(like(filters.admin));
    where.push(`admin_name ILIKE $${params.length}`);
  }
  if (filters.targetType.trim()) {
    params.push(filters.targetType.trim().slice(0, 40));
    where.push(`target_type = $${params.length}`);
  }
  for (const [value, operator] of [[filters.from, ">="], [filters.to, "<"]] as const) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      params.push(value);
      where.push(`created_at ${operator} $${params.length}::date${operator === "<" ? " + 1" : ""}`);
    }
  }
  return { params, clause: where.length ? `WHERE ${where.join(" AND ")}` : "" };
}

export async function listAudit(filters: AuditFilters & { page: unknown }): Promise<Page<AuditEntry>> {
  await prepareAdmin();
  const { page, pageSize, offset } = pageParams(filters.page, 50);
  const { params, clause } = auditWhere(filters);
  const sql = db();
  const [rows, totals] = await Promise.all([
    sql.query(`SELECT * FROM admin_audit_log ${clause} ORDER BY created_at DESC, id DESC LIMIT ${pageSize} OFFSET ${offset}`, params),
    sql.query(`SELECT COUNT(*)::int AS total FROM admin_audit_log ${clause}`, params),
  ]);
  return { rows: (rows as Row[]).map(toAudit), total: num((totals as Row[])[0]?.total), page, pageSize };
}

export async function exportAudit(filters: AuditFilters) {
  await prepareAdmin();
  const { params, clause } = auditWhere(filters);
  const rows = (await db().query(
    `SELECT * FROM admin_audit_log ${clause} ORDER BY created_at DESC, id DESC LIMIT 10000`,
    params,
  )) as Row[];
  return rows.map(toAudit);
}

export async function listAdmins(): Promise<AdminAccount[]> {
  await prepareAdmin();
  const rows = (await db()`
    SELECT a.id, a.username, a.role, a.totp_enabled, a.disabled_at, a.created_at, a.last_login_at,
      (SELECT COUNT(*)::int FROM admin_sessions s WHERE s.admin_id = a.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS sessions
    FROM admin_accounts a ORDER BY a.created_at ASC
  `) as Row[];
  return rows
    .filter((row) => isAdminRole(row.role))
    .map((row) => ({
      id: num(row.id),
      username: String(row.username),
      role: row.role as AdminAccount["role"],
      totpEnabled: Boolean(row.totp_enabled),
      disabled: Boolean(row.disabled_at),
      createdAt: iso(row.created_at)!,
      lastLoginAt: iso(row.last_login_at),
      activeSessions: num(row.sessions),
    }));
}
