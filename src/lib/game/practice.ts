import { FACTION_NAME, ROLES_BY_ID } from "./catalog";
import { resolveNight } from "./resolve";
import type { EnginePlayer, GameFaction, NightAction, RoleCategory, RoleDefinition } from "./types";
import { validateDayAction, validateNightAction } from "./validate";

export type TableIntent = "ability" | "vote";

export type TableResult =
  | {
      kind: "role";
      targetName: string;
      roleName: string;
      faction: string;
      category: string;
    }
  | { kind: "aura"; targetName: string; aura: "GOOD" | "BAD" | "UNKNOWN" }
  | { kind: "compare"; leftName: string; rightName: string; same: boolean }
  | { kind: "note"; text: string }
  | { kind: "submitted"; text: string }
  | { kind: "vote"; targetName: string };

export type TableSeat = {
  id: string;
  name: string;
  alive: boolean;
  validAbility: boolean;
  validVote: boolean;
};

export type TableView = {
  matchId: string;
  phase: "night" | "day";
  day: number;
  alive: number;
  you: {
    name: string;
    roleName: string;
    faction: string;
    category: string;
    ability: string;
    intents: TableIntent[];
    abilityTargets: number;
    submitted: boolean;
    votedName: string | null;
  };
  seats: TableSeat[];
  result: TableResult | null;
  setup: { side: string; roles: string[] }[];
};

type PracticeMatch = {
  id: string;
  day: number;
  phase: "night" | "day";
  voteResolved: boolean;
  nightSubmitted: boolean;
  daySubmitted: boolean;
  roleblocked: boolean;
  lastActionDay: number | null;
  voteTargetId: string | null;
  youId: string;
  players: EnginePlayer[];
  result: TableResult | null;
};

const PRACTICE_ROLES = [
  "investigator",
  "chain-analyst",
  "doctor",
  "auditor",
  "aegis",
  "roleblocker",
  "vigilante",
  "governor",
  "tracker",
  "medium",
  "villager",
  "alpha-werewolf",
  "seer-werewolf",
  "guardian-werewolf",
  "serial-killer",
  "rugpuller",
] as const;

const CATEGORY_LABEL: Record<RoleCategory, string> = {
  investigative: "Investigative",
  protective: "Protective",
  support: "Support",
  killing: "Killing",
  special: "Special",
};

const tables = ((globalThis as typeof globalThis & { __trustlessTables?: Map<string, PracticeMatch> }).__trustlessTables ??=
  new Map<string, PracticeMatch>());

export function createPracticeMatch(names: string[]): PracticeMatch {
  if (names.length !== PRACTICE_ROLES.length) {
    throw new Error("The practice table seats 16.");
  }
  const players: EnginePlayer[] = names.map((name, index) => {
    const role = ROLES_BY_ID[PRACTICE_ROLES[index]];
    return {
      id: String(index + 1),
      name,
      roleId: role.id,
      alive: true,
      chargesLeft: role.charges,
      ...(role.persistentResource?.type === "shields"
        ? { shieldsRemaining: role.persistentResource.max }
        : {}),
    };
  });
  const match: PracticeMatch = {
    id: crypto.randomUUID(),
    day: 1,
    phase: "night",
    voteResolved: false,
    nightSubmitted: false,
    daySubmitted: false,
    roleblocked: false,
    lastActionDay: null,
    voteTargetId: null,
    youId: "1",
    players,
    result: null,
  };
  tables.set(match.id, match);
  return match;
}

export function readPracticeMatch(id: string) {
  return tables.get(id) ?? null;
}

export function practiceView(match: PracticeMatch): TableView {
  const you = player(match, match.youId);
  const role = ROLES_BY_ID[you.roleId];
  const abilityNow = abilityAvailable(match, role);
  return {
    matchId: match.id,
    phase: match.phase,
    day: match.day,
    alive: match.players.filter((entry) => entry.alive).length,
    you: {
      name: you.name,
      roleName: role.name,
      faction: FACTION_NAME[role.faction],
      category: CATEGORY_LABEL[role.category],
      ability: role.abilityDescription,
      intents: intentsFor(match, role),
      abilityTargets: abilityNow ? requiredTargets(role) : 0,
      submitted: match.phase === "night" ? match.nightSubmitted : match.daySubmitted,
      votedName: votedName(match),
    },
    seats: match.players.map((entry) => ({
      id: entry.id,
      name: entry.name,
      alive: entry.alive,
      validAbility: abilityNow && targetAllowed(match, role, entry.id).ok,
      validVote: match.phase === "day" && voteAllowed(match, entry.id).ok,
    })),
    result: match.result,
    setup: setupGroups(match),
  };
}

export function submitPracticeAction(
  match: PracticeMatch,
  intent: TableIntent,
  targetIds: string[],
): { ok: true; view: TableView } | { ok: false; error: string } {
  const you = player(match, match.youId);
  const role = ROLES_BY_ID[you.roleId];
  if (!you.alive) return { ok: false, error: "You are out of the round." };

  if (intent === "vote") {
    if (match.phase !== "day") return { ok: false, error: "Voting happens during the day." };
    if (targetIds.length !== 1) return { ok: false, error: "Choose one player to vote for." };
    const check = voteAllowed(match, targetIds[0]);
    if (!check.ok) return check;
    match.voteTargetId = targetIds[0];
    match.voteResolved = true;
    match.result = { kind: "vote", targetName: player(match, targetIds[0]).name };
    return { ok: true, view: practiceView(match) };
  }

  if (!abilityAvailable(match, role)) {
    return { ok: false, error: "That ability is not open." };
  }
  if (match.roleblocked) return { ok: false, error: "Your action was blocked." };
  if (match.phase === "night" && match.nightSubmitted) {
    return { ok: false, error: "You already used your night action." };
  }
  if (match.phase === "day" && match.daySubmitted) {
    return { ok: false, error: "You already used your day action." };
  }
  if (role.charges !== null && (you.chargesLeft ?? 0) <= 0) {
    return { ok: false, error: "No charges left." };
  }
  if (role.cooldown !== null && match.lastActionDay !== null && match.day - match.lastActionDay < role.cooldown) {
    return { ok: false, error: "That ability is still cooling down." };
  }
  const expected = requiredTargets(role);
  if (targetIds.length !== expected) {
    return { ok: false, error: expected === 0 ? "This action has no target." : `Choose ${expected} target${expected === 1 ? "" : "s"}.` };
  }
  if (new Set(targetIds).size !== targetIds.length) {
    return { ok: false, error: "Targets must be different players." };
  }
  for (const targetId of targetIds) {
    const check = targetAllowed(match, role, targetId);
    if (!check.ok) return check;
  }

  const action: NightAction = {
    id: `${match.id}:${match.day}:${match.phase}`,
    actorId: you.id,
    type: role.actionType ?? "special",
    scope: role.actionScope,
    targets: targetIds,
    ...(role.id === "vigilante" ? { choice: "kill" as const } : {}),
  };
  const check =
    match.phase === "night"
      ? validateNightAction(match.players, action)
      : validateDayAction(match.players, action, { day: match.day, voteResolved: match.voteResolved });
  if (!check.ok) return { ok: false, error: check.reason };

  if (role.charges !== null) you.chargesLeft = (you.chargesLeft ?? 0) - 1;
  if (match.phase === "night") match.nightSubmitted = true;
  if (match.phase === "day") match.daySubmitted = true;
  match.lastActionDay = match.day;
  match.result = resolvePrivate(match, role, action);
  return { ok: true, view: practiceView(match) };
}

export function advancePracticePhase(match: PracticeMatch): TableView {
  if (match.phase === "night") {
    match.phase = "day";
    match.daySubmitted = false;
  } else {
    match.phase = "night";
    match.day += 1;
    match.nightSubmitted = false;
    match.voteResolved = false;
    match.voteTargetId = null;
  }
  match.roleblocked = false;
  match.result = null;
  return practiceView(match);
}

function resolvePrivate(match: PracticeMatch, role: RoleDefinition, action: NightAction): TableResult {
  if (action.type === "read_role" || action.type === "read_aura" || action.type === "compare" || action.type === "investigate" || action.type === "track") {
    const night = resolveNight(match.players, [action]);
    const intel = night.intel.find((entry) => entry.playerId === action.actorId);
    if (action.type === "read_role") {
      const target = player(match, action.targets[0]);
      const seen = ROLES_BY_ID[target.roleId];
      return {
        kind: "role",
        targetName: target.name,
        roleName: seen.name,
        faction: FACTION_NAME[seen.faction],
        category: CATEGORY_LABEL[seen.category],
      };
    }
    if (action.type === "read_aura") {
      const target = player(match, action.targets[0]);
      const aura = ROLES_BY_ID[target.roleId].aura;
      return {
        kind: "aura",
        targetName: target.name,
        aura: aura === "good" ? "GOOD" : aura === "bad" ? "BAD" : "UNKNOWN",
      };
    }
    if (action.type === "compare") {
      const left = player(match, action.targets[0]);
      const right = player(match, action.targets[1]);
      return {
        kind: "compare",
        leftName: left.name,
        rightName: right.name,
        same: intel?.text === "SAME FACTION",
      };
    }
    return { kind: "note", text: intel?.text ?? "Nothing answers." };
  }
  const names = action.targets.map((id) => player(match, id).name);
  return {
    kind: "submitted",
    text: names.length ? `Action submitted on ${names.join(" and ")}.` : "Action submitted.",
  };
}

function abilityAvailable(match: PracticeMatch, role: RoleDefinition) {
  if (!role.actionType || role.phase === "passive") return false;
  if (match.phase === "night") return role.phase === "night" || role.phase === "both";
  if (role.phase !== "day" && role.phase !== "both") return false;
  if (role.id === "vigilante" && (match.day < 1 || (match.day === 1 && !match.voteResolved))) return false;
  return true;
}

function intentsFor(match: PracticeMatch, role: RoleDefinition): TableIntent[] {
  const intents: TableIntent[] = [];
  if (abilityAvailable(match, role)) intents.push("ability");
  if (match.phase === "day") intents.push("vote");
  return intents;
}

function requiredTargets(role: RoleDefinition) {
  if (role.targetType === "none") return 0;
  if (role.targetType === "multiple") return role.maxTargets;
  return 1;
}

function targetAllowed(match: PracticeMatch, role: RoleDefinition, targetId: string): { ok: true } | { ok: false; error: string } {
  const actor = player(match, match.youId);
  const target = match.players.find((entry) => entry.id === targetId);
  if (!target) return { ok: false, error: "Unknown target." };
  if (target.id === actor.id && !role.canSelfTarget) return { ok: false, error: "You cannot target yourself." };
  if (role.targetRules.aliveOnly && !target.alive) return { ok: false, error: "That player is already dead." };
  if (role.targetRules.deadOnly && target.alive) return { ok: false, error: "That player is still alive." };
  const targetRole = ROLES_BY_ID[target.roleId];
  if (role.targetRules.werewolfOnly && targetRole.faction !== "werewolf") {
    return { ok: false, error: "Choose a Werewolf." };
  }
  if (role.targetRules.otherFactionOnly && targetRole.faction === role.faction) {
    return { ok: false, error: "Choose someone outside your faction." };
  }
  if (role.actionScope === "faction" && role.actionType === "kill" && targetRole.faction === "werewolf") {
    return { ok: false, error: "The pack does not kill its own." };
  }
  return { ok: true };
}

function voteAllowed(match: PracticeMatch, targetId: string): { ok: true } | { ok: false; error: string } {
  const target = match.players.find((entry) => entry.id === targetId);
  if (!target) return { ok: false, error: "Unknown target." };
  if (!target.alive) return { ok: false, error: "That player is already dead." };
  if (target.id === match.youId) return { ok: false, error: "You cannot vote for yourself." };
  return { ok: true };
}

function player(match: PracticeMatch, id: string) {
  const found = match.players.find((entry) => entry.id === id);
  if (!found) throw new Error("Unknown seat.");
  return found;
}

function votedName(match: PracticeMatch) {
  if (!match.voteTargetId) return null;
  return match.players.find((entry) => entry.id === match.voteTargetId)?.name ?? null;
}

function setupGroups(match: PracticeMatch) {
  const grouped = new Map<GameFaction, string[]>();
  for (const entry of match.players) {
    const role = ROLES_BY_ID[entry.roleId];
    const names = grouped.get(role.faction) ?? [];
    names.push(role.name);
    grouped.set(role.faction, names);
  }
  return [...grouped.entries()].map(([faction, roles]) => ({
    side: FACTION_NAME[faction],
    roles,
  }));
}
