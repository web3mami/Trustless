import type {
  ActionScope,
  ActionType,
  Aura,
  GameFaction,
  InvestigationResult,
  PersistentResource,
  RoleCategory,
  RoleDefinition,
  RolePhase,
  TargetRules,
  TargetType,
  WinEvaluator,
} from "./types";

const FACTIONS = ["village", "werewolf", "solo", "neutral"] as const;
const AURAS = ["good", "bad", "unknown"] as const;
const INVESTIGATION_RESULTS = ["village", "werewolf", "solo", "neutral", "unknown"] as const;
const CATEGORIES = ["investigative", "protective", "support", "killing", "special"] as const;
const PHASES = ["day", "night", "both", "passive"] as const;
const TARGETS = ["self", "single", "multiple", "none"] as const;
const ACTIONS = [
  "kill",
  "protect",
  "investigate",
  "read_role",
  "read_aura",
  "compare",
  "block",
  "track",
  "vote_modifier",
  "special",
] as const;
const RESERVED = new Set([
  "convert",
  "poison",
  "burn",
  "redirect",
  "silence",
  "resurrect",
  "immunity",
  "delayed_kill",
]);
const SCOPES = ["personal", "faction"] as const;
const EVALUATORS = ["village", "werewolf", "last_alive", "lynch"] as const;
const ID_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;

class RoleInputError extends Error {}

function fail(message: string): never {
  throw new RoleInputError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "string") fail(`${label} is required.`);
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (clean.length < min || clean.length > max) {
    fail(`${label} must be ${min} to ${max} characters.`);
  }
  return clean;
}

function flag(value: unknown, label: string) {
  if (typeof value !== "boolean") fail(`${label} must be yes or no.`);
  return value;
}

function choice<T extends string>(value: unknown, allowed: readonly T[], label: string) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(`${label} is not one of the available choices.`);
  }
  return value as T;
}

function whole(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

function optionalCount(value: unknown, max: number, label: string) {
  if (value === null || value === undefined || value === "") return null;
  return whole(value, 1, max, label);
}

function readRole(input: unknown): RoleDefinition {
  if (!isRecord(input)) fail("The role is missing.");

  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!ID_PATTERN.test(id) || id.endsWith("-") || id.includes("--")) {
    fail("Use a short lowercase id, such as night-guard.");
  }

  const name = text(input.name, 2, 40, "Name");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '&.,-]{1,39}$/u.test(name)) {
    fail("The name can use letters, numbers, spaces, apostrophes and hyphens.");
  }

  const faction = choice<GameFaction>(input.faction, FACTIONS, "Faction");
  const aura: Aura =
    input.aura == null || input.aura === ""
      ? "unknown"
      : choice<Aura>(input.aura, AURAS, "Aura");
  const icon =
    typeof input.icon === "string" && input.icon.trim()
      ? text(input.icon, 2, 40, "Icon").toLowerCase().replace(/[^a-z0-9-]/g, "")
      : id;
  const category = choice<RoleCategory>(input.category, CATEGORIES, "Category");
  const phase = choice<RolePhase>(input.phase, PHASES, "Phase");
  const description = text(input.description, 8, 400, "Description");
  const abilityDescription = text(input.abilityDescription, 4, 280, "Ability");
  const winCondition = text(input.winCondition, 8, 280, "Win condition");

  let actionType: ActionType | null = null;
  if (input.actionType !== null && input.actionType !== undefined && input.actionType !== "none") {
    if (typeof input.actionType === "string" && RESERVED.has(input.actionType)) {
      fail("That action is reserved. Poison, conversion and resurrection are not available yet.");
    }
    actionType = choice<ActionType>(input.actionType, ACTIONS, "Action");
  }

  if (phase === "passive" && actionType !== null && actionType !== "vote_modifier") {
    fail("A passive role can only change the vote, or have no action.");
  }

  const revealActivatesVote =
    input.revealActivatesVote == null ? false : flag(input.revealActivatesVote, "Daytime reveal");
  if (revealActivatesVote) {
    if (phase !== "day") fail("The reveal happens during the day.");
    actionType = "special";
  }

  let actionScope = choice<ActionScope>(input.actionScope ?? "personal", SCOPES, "Action scope");
  if (actionScope === "faction" && !(faction === "werewolf" && actionType === "kill")) {
    fail("Only a Werewolf kill can be the shared pack action. Other actions stay personal.");
  }
  if (actionType === null || revealActivatesVote) actionScope = "personal";

  let targetType: TargetType = "none";
  if (revealActivatesVote) {
    targetType = "none";
  } else if (actionType !== null && actionType !== "vote_modifier") {
    targetType = choice<TargetType>(input.targetType, TARGETS, "Target");
    if (targetType === "none" && actionType !== "special") fail("This action needs a target.");
  }

  let maxTargets = 0;
  if (targetType === "single" || targetType === "self") maxTargets = 1;
  if (targetType === "multiple") maxTargets = whole(input.maxTargets, 2, 4, "Number of targets");

  const charges = optionalCount(input.charges, 20, "Charges");
  const cooldown = optionalCount(input.cooldown, 10, "Cooldown");
  let persistentResource: PersistentResource | null = null;
  if (input.persistentResource !== null && input.persistentResource !== undefined && input.persistentResource !== "") {
    if (!isRecord(input.persistentResource)) fail("The persistent resource is missing.");
    const type = text(input.persistentResource.type, 2, 24, "Resource").toLowerCase();
    persistentResource = { type, max: whole(input.persistentResource.max, 1, 10, "Resource amount") };
  }
  const canSelfTarget = targetType === "self" ? true : targetType === "none" ? false : flag(input.canSelfTarget, "Self target");
  const enabled = flag(input.enabled, "Shown on the roster");
  const votePower = whole(input.votePower, 1, 5, "Vote power");
  if (revealActivatesVote && votePower < 2) {
    fail("Set the vote power above 1. It applies after the reveal.");
  }
  const blockable =
    !revealActivatesVote &&
    actionType !== null &&
    actionType !== "vote_modifier" &&
    phase !== "passive" &&
    flag(input.blockable, "Roleblock");
  const blocksVillageWin = flag(input.blocksVillageWin, "Hostile threat");
  const lynchWin = flag(input.lynchWin, "Lynch win");
  let winEvaluator = choice<WinEvaluator>(input.winEvaluator, EVALUATORS, "Win");
  if (lynchWin) winEvaluator = "lynch";

  if (!isRecord(input.targetRules)) fail("Target rules are missing.");
  const aliveOnly = flag(input.targetRules.aliveOnly, "Living targets");
  const deadOnly = flag(Boolean(input.targetRules.deadOnly), "Dead targets");
  const werewolfOnly = flag(Boolean(input.targetRules.werewolfOnly), "Werewolf targets");
  const otherFactionOnly = flag(Boolean(input.targetRules.otherFactionOnly), "Other faction");
  if (targetType !== "none" && aliveOnly && deadOnly) fail("A target is either living or dead.");
  if (targetType !== "none" && !aliveOnly && !deadOnly) fail("Say whether the target is living or dead.");

  const targetRules: TargetRules = {
    excludeSelf: !canSelfTarget,
    aliveOnly,
    deadOnly: deadOnly || undefined,
    werewolfOnly: werewolfOnly || undefined,
    otherFactionOnly: otherFactionOnly || undefined,
  };

  let investigationResult: InvestigationResult | undefined;
  if (input.investigationResult !== null && input.investigationResult !== undefined && input.investigationResult !== "") {
    const seen = choice<InvestigationResult>(input.investigationResult, INVESTIGATION_RESULTS, "Investigated faction");
    if (seen !== faction) investigationResult = seen;
  }

  if (!Array.isArray(input.notes)) fail("Notes must be a list.");
  if (input.notes.length > 8) fail("A role can have at most 8 notes.");
  const notes: string[] = [];
  for (const note of input.notes) {
    if (typeof note !== "string") fail("Each note must be text.");
    const clean = note.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
    if (!clean) continue;
    if (clean.length > 200) fail("Each note must be 200 characters or fewer.");
    notes.push(clean);
  }

  return {
    id,
    name,
    faction,
    aura,
    icon,
    category,
    description,
    abilityDescription,
    phase,
    targetType,
    maxTargets,
    charges,
    cooldown,
    persistentResource,
    canSelfTarget,
    winCondition,
    investigationResult,
    actionType,
    actionScope,
    actionPriority: whole(input.actionPriority, 0, 100, "Priority"),
    enabled,
    votePower,
    revealActivatesVote,
    blockable,
    blocksVillageWin,
    winEvaluator,
    lynchWin,
    targetRules,
    notes,
  };
}

/**
 * Turns an admin form into a role the night resolver already understands.
 * Returns a message when the input would not survive a night.
 */
export function parseRoleInput(input: unknown): RoleDefinition | string {
  try {
    return readRole(input);
  } catch (error) {
    if (error instanceof RoleInputError) return error.message;
    throw error;
  }
}
