/** Factions used by the match engine. Profile stats still say "good" for Village. */
export type GameFaction = "village" | "werewolf" | "solo" | "neutral";

/** What an investigation reports. Unknown hides the real faction. */
export type InvestigationResult = GameFaction | "unknown";

/** What the Auditor reads. This is not a faction. */
export type Aura = "good" | "bad" | "unknown";

export type PersistentResource = {
  type: string;
  max: number;
};

export type RoleCategory =
  | "investigative"
  | "protective"
  | "support"
  | "killing"
  | "special";

export type RolePhase = "day" | "night" | "both" | "passive";

export type TargetType = "self" | "single" | "multiple" | "none";

/** Actions the resolver understands today. */
export type ActionType =
  | "kill"
  | "protect"
  | "investigate"
  | "read_role"
  | "read_aura"
  | "compare"
  | "block"
  | "track"
  | "vote_modifier"
  | "special";

/**
 * Named so later roles can be added without a new resolver.
 * They are rejected until a stage is defined for them.
 */
export type ReservedActionType =
  | "convert"
  | "poison"
  | "burn"
  | "redirect"
  | "silence"
  | "resurrect"
  | "immunity"
  | "delayed_kill";

export type ActionScope = "personal" | "faction";

/** Lower stages run first. The order itself is an argument to the resolver. */
export type ResolutionStage =
  | "block"
  | "protect"
  | "investigate"
  | "kill"
  | "special";

export type WinEvaluator = "village" | "werewolf" | "last_alive" | "lynch";

export type WerewolfWinRule = "parity_with_others";

export type TargetRules = {
  excludeSelf: boolean;
  aliveOnly: boolean;
  deadOnly?: boolean;
  werewolfOnly?: boolean;
  otherFactionOnly?: boolean;
};

export type RoleDefinition = {
  id: string;
  name: string;
  faction: GameFaction;
  aura: Aura;
  icon: string;
  category: RoleCategory;
  description: string;
  abilityDescription: string;
  phase: RolePhase;
  targetType: TargetType;
  maxTargets: number;
  charges: number | null;
  cooldown: number | null;
  /** A resource that stays with the player across nights, such as Aegis shields. */
  persistentResource?: PersistentResource | null;
  canSelfTarget: boolean;
  winCondition: string;
  /** When set, investigators see this instead of the real faction. */
  investigationResult?: InvestigationResult;
  actionType: ActionType | null;
  actionScope: ActionScope;
  actionPriority: number;
  enabled: boolean;
  votePower: number;
  /** When set, votePower applies only after this player reveals during the day. */
  revealActivatesVote?: boolean;
  blockable: boolean;
  blocksVillageWin: boolean;
  winEvaluator: WinEvaluator;
  lynchWin: boolean;
  targetRules: TargetRules;
  notes: string[];
};

export type EnginePlayer = {
  id: string;
  name: string;
  roleId: string;
  alive: boolean;
  /** Null means the role has no limited charge. */
  chargesLeft: number | null;
  /** Remaining Aegis shields. Absent on roles that have no shield resource. */
  shieldsRemaining?: number;
  /** Set when a daytime reveal has made this player's vote power active. */
  revealed?: boolean;
};

export type NightAction = {
  id: string;
  actorId: string;
  type: ActionType;
  scope: ActionScope;
  targets: string[];
  choice?: "kill" | "reveal";
};

export type NightEvent = {
  actionId?: string;
  actorId?: string;
  targetIds: string[];
  outcome: "resolved" | "blocked" | "invalid" | "protected" | "no_effect";
  public: boolean;
  message: string;
  code?: "AEGIS_SHIELD_CONSUMED" | "AEGIS_SHIELDS_DEPLETED";
};

export type PrivateIntel = {
  playerId: string;
  kind: "faction" | "role" | "aura" | "comparison" | "track" | "reveal" | "note" | "blocked";
  text: string;
};

export type Win = {
  evaluator: WinEvaluator;
  faction: GameFaction;
  playerIds: string[];
  reason: string;
};

export type RoleReveal = {
  id: string;
  name: string;
  faction: GameFaction;
  category: RoleCategory;
  description: string;
  abilityDescription: string;
  winCondition: string;
  phase: RolePhase;
  targetType: TargetType;
  maxTargets: number;
  notes: string[];
};
