import { ROLES_BY_ID } from "./catalog";
import type { EnginePlayer, NightAction, RoleDefinition } from "./types";

export type Check = { ok: true } | { ok: false; reason: string };

export function validateNightAction(
  players: EnginePlayer[],
  action: NightAction,
  roles: Record<string, RoleDefinition> = ROLES_BY_ID,
): Check {
  const actor = players.find((player) => player.id === action.actorId);
  if (!actor) return { ok: false, reason: "Unknown player." };
  if (!actor.alive) return { ok: false, reason: "Dead players cannot act." };
  const role = roles[actor.roleId];
  if (!role || !role.enabled) return { ok: false, reason: "That role cannot act." };
  if (role.phase !== "night" && role.phase !== "both") {
    return { ok: false, reason: "This role has no night action." };
  }
  if (role.actionType !== action.type || role.actionScope !== action.scope) {
    return { ok: false, reason: "That action does not belong to this role." };
  }
  return checkTargets(players, actor, role, action.targets, roles);
}

export function validateDayAction(
  players: EnginePlayer[],
  action: NightAction,
  context: { day: number; voteResolved: boolean },
  roles: Record<string, RoleDefinition> = ROLES_BY_ID,
): Check {
  const actor = players.find((player) => player.id === action.actorId);
  if (!actor) return { ok: false, reason: "Unknown player." };
  if (!actor.alive) return { ok: false, reason: "Dead players cannot act." };
  const role = roles[actor.roleId];
  if (!role || !role.enabled) return { ok: false, reason: "That role cannot act." };
  if (role.phase !== "day" && role.phase !== "both") {
    return { ok: false, reason: "This role has no day action." };
  }
  if (context.day < 1 || (context.day === 1 && !context.voteResolved)) {
    return { ok: false, reason: "Day abilities open after the Day 1 vote." };
  }
  if (role.charges !== null && (actor.chargesLeft ?? 0) <= 0) {
    return { ok: false, reason: "No charges left." };
  }
  if (role.id === "vigilante" && action.choice !== "kill" && action.choice !== "reveal") {
    return { ok: false, reason: "Choose a shot or a reveal." };
  }
  return checkTargets(players, actor, role, action.targets, roles);
}

function checkTargets(
  players: EnginePlayer[],
  actor: EnginePlayer,
  role: RoleDefinition,
  targets: string[],
  roles: Record<string, RoleDefinition>,
): Check {
  if (role.targetType === "none") {
    return targets.length === 0 ? { ok: true } : { ok: false, reason: "This action has no target." };
  }
  const expected = role.targetType === "multiple" ? role.maxTargets : 1;
  if (targets.length !== expected) {
    return { ok: false, reason: `Choose ${expected} target${expected === 1 ? "" : "s"}.` };
  }
  if (new Set(targets).size !== targets.length) {
    return { ok: false, reason: "Targets must be different players." };
  }
  for (const targetId of targets) {
    const target = players.find((player) => player.id === targetId);
    if (!target) return { ok: false, reason: "Unknown target." };
    if (target.id === actor.id && (role.targetRules.excludeSelf || !role.canSelfTarget)) {
      return { ok: false, reason: "You cannot target yourself." };
    }
    if (role.targetRules.aliveOnly && !target.alive) {
      return { ok: false, reason: "That player is already dead." };
    }
    if (role.targetRules.deadOnly && target.alive) {
      return { ok: false, reason: "That player is still alive." };
    }
    const targetRole = roles[target.roleId];
    if (role.targetRules.werewolfOnly && targetRole?.faction !== "werewolf") {
      return { ok: false, reason: "Choose a Werewolf." };
    }
    if (role.targetRules.otherFactionOnly && targetRole?.faction === role.faction) {
      return { ok: false, reason: "Choose someone outside your faction." };
    }
    if (role.actionScope === "faction" && role.actionType === "kill" && targetRole?.faction === "werewolf") {
      return { ok: false, reason: "The pack does not kill its own." };
    }
  }
  return { ok: true };
}
