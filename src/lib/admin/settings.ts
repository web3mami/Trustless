import type { Permission } from "@/lib/admin/permissions";

export type MaintenanceSettings = {
  enabled: boolean;
  blockNewMatches: boolean;
  allowActiveToFinish: boolean;
  message: string;
  estimatedReturn: string;
  minimumVersion: string;
  forceUpdate: boolean;
};

export type GameSettings = {
  dayDuration: number;
  nightDuration: number;
  discussionDuration: number;
  votingDuration: number;
  deathAnimationDuration: number;
  afkTimeout: number;
  disconnectGrace: number;
  minPlayers: number;
  maxPlayers: number;
  tieVote: "no_lynch" | "revote" | "random";
  allowSkipVote: boolean;
  revealRoleOnDeath: boolean;
  spectators: "off" | "friends" | "anyone";
  deadChat: boolean;
};

export const FLAG_STATES = ["off", "admin", "test", "percentage", "full"] as const;
export type FlagState = (typeof FLAG_STATES)[number];
export type FeatureFlag = { state: FlagState; percentage: number };

export const FEATURE_FLAGS = {
  new_roles: "New roles",
  ranked: "Ranked",
  shop: "Shop",
  external_wallet: "External wallet",
  matchmaking_v2: "Matchmaking changes",
  new_ui: "New UI",
  events: "Events",
  experimental_mechanics: "Experimental mechanics",
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlags = Record<FeatureFlagKey, FeatureFlag>;

export type ModerationSettings = {
  bannedWords: string[];
  blockLinks: boolean;
  chatMessagesPerMinute: number;
};

export type SettingsMap = {
  maintenance: MaintenanceSettings;
  game: GameSettings;
  flags: FeatureFlags;
  moderation: ModerationSettings;
};

export type SettingsKey = keyof SettingsMap;

export const SETTINGS_PERMISSION: Record<SettingsKey, Permission> = {
  maintenance: "maintenance.edit",
  game: "config.edit",
  flags: "flags.edit",
  moderation: "moderation.act",
};

export const DEFAULT_SETTINGS: SettingsMap = {
  maintenance: {
    enabled: false,
    blockNewMatches: true,
    allowActiveToFinish: true,
    message: "TRUSTLESS is down for maintenance. We'll be back shortly.",
    estimatedReturn: "",
    minimumVersion: "",
    forceUpdate: false,
  },
  game: {
    dayDuration: 120,
    nightDuration: 45,
    discussionDuration: 90,
    votingDuration: 30,
    deathAnimationDuration: 4,
    afkTimeout: 120,
    disconnectGrace: 60,
    minPlayers: 8,
    maxPlayers: 16,
    tieVote: "no_lynch",
    allowSkipVote: true,
    revealRoleOnDeath: true,
    spectators: "off",
    deadChat: true,
  },
  flags: Object.fromEntries(
    Object.keys(FEATURE_FLAGS).map((key) => [key, { state: "off", percentage: 0 }]),
  ) as FeatureFlags,
  moderation: {
    bannedWords: [],
    blockLinks: true,
    chatMessagesPerMinute: 12,
  },
};

export const MAINTENANCE_FIELDS: {
  key: keyof Pick<MaintenanceSettings, "enabled" | "blockNewMatches" | "allowActiveToFinish" | "forceUpdate">;
  label: string;
  help: string;
}[] = [
  { key: "enabled", label: "Maintenance enabled", help: "Players see the maintenance message instead of starting new play." },
  { key: "blockNewMatches", label: "Block new matches", help: "No new matches can start while this is on." },
  { key: "allowActiveToFinish", label: "Allow active matches to finish", help: "Matches already in progress can play out." },
  { key: "forceUpdate", label: "Force client update", help: "Players below the minimum version must update before they can play." },
];

export const GAME_TOGGLE_FIELDS: {
  key: "allowSkipVote" | "revealRoleOnDeath" | "deadChat";
  label: string;
  help: string;
}[] = [
  { key: "allowSkipVote", label: "Allow skip vote", help: "Players can vote to skip the lynch." },
  { key: "revealRoleOnDeath", label: "Reveal role on death", help: "The village sees a player's role when they die." },
  { key: "deadChat", label: "Dead-player chat", help: "Eliminated players can talk to each other." },
];

export const GAME_NUMBER_LIMITS: Record<
  Exclude<keyof GameSettings, "tieVote" | "allowSkipVote" | "revealRoleOnDeath" | "spectators" | "deadChat">,
  { label: string; min: number; max: number; unit: string }
> = {
  dayDuration: { label: "Day duration", min: 30, max: 600, unit: "s" },
  nightDuration: { label: "Night duration", min: 15, max: 300, unit: "s" },
  discussionDuration: { label: "Discussion duration", min: 15, max: 600, unit: "s" },
  votingDuration: { label: "Voting duration", min: 10, max: 180, unit: "s" },
  deathAnimationDuration: { label: "Death animation", min: 0, max: 15, unit: "s" },
  afkTimeout: { label: "AFK timeout", min: 30, max: 600, unit: "s" },
  disconnectGrace: { label: "Disconnect grace period", min: 0, max: 300, unit: "s" },
  minPlayers: { label: "Minimum players", min: 4, max: 16, unit: "" },
  maxPlayers: { label: "Maximum players", min: 4, max: 16, unit: "" },
};

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : null;

const bool = (value: unknown) => (typeof value === "boolean" ? value : null);

function oneOf<T extends string>(value: unknown, options: readonly T[]) {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function validateSettings<K extends SettingsKey>(
  key: K,
  input: unknown,
): SettingsMap[K] | string {
  if (!input || typeof input !== "object") return "Settings must be an object.";
  const value = input as Record<string, unknown>;

  if (key === "maintenance") {
    const message = text(value.message, 400);
    const estimatedReturn = text(value.estimatedReturn, 80);
    const minimumVersion = text(value.minimumVersion, 20);
    const flags = ["enabled", "blockNewMatches", "allowActiveToFinish", "forceUpdate"].map((field) => bool(value[field]));
    if (flags.some((flag) => flag === null) || message === null || estimatedReturn === null || minimumVersion === null) {
      return "Maintenance settings are incomplete.";
    }
    if (minimumVersion && !/^\d+(\.\d+){0,2}$/.test(minimumVersion)) {
      return "Minimum version must look like 1.2.0.";
    }
    return {
      enabled: flags[0]!,
      blockNewMatches: flags[1]!,
      allowActiveToFinish: flags[2]!,
      forceUpdate: flags[3]!,
      message: message || DEFAULT_SETTINGS.maintenance.message,
      estimatedReturn,
      minimumVersion,
    } as SettingsMap[K];
  }

  if (key === "game") {
    const result: Record<string, unknown> = {};
    for (const [field, limit] of Object.entries(GAME_NUMBER_LIMITS)) {
      const number = value[field];
      if (typeof number !== "number" || !Number.isInteger(number) || number < limit.min || number > limit.max) {
        return `${limit.label} must be a whole number from ${limit.min} to ${limit.max}.`;
      }
      result[field] = number;
    }
    if ((result.minPlayers as number) > (result.maxPlayers as number)) {
      return "Minimum players cannot be more than maximum players.";
    }
    const tieVote = oneOf(value.tieVote, ["no_lynch", "revote", "random"] as const);
    const spectators = oneOf(value.spectators, ["off", "friends", "anyone"] as const);
    const toggles = ["allowSkipVote", "revealRoleOnDeath", "deadChat"].map((field) => bool(value[field]));
    if (!tieVote || !spectators || toggles.some((toggle) => toggle === null)) {
      return "Voting and chat rules are incomplete.";
    }
    return {
      ...result,
      tieVote,
      spectators,
      allowSkipVote: toggles[0]!,
      revealRoleOnDeath: toggles[1]!,
      deadChat: toggles[2]!,
    } as SettingsMap[K];
  }

  if (key === "flags") {
    const result: Record<string, FeatureFlag> = {};
    for (const flag of Object.keys(FEATURE_FLAGS)) {
      const entry = value[flag] as Record<string, unknown> | undefined;
      const state = oneOf(entry?.state, FLAG_STATES);
      const percentage = entry?.percentage;
      if (!state || typeof percentage !== "number" || !Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
        return `Flag ${flag} is invalid.`;
      }
      result[flag] = { state, percentage: state === "percentage" ? percentage : state === "full" ? 100 : 0 };
    }
    return result as SettingsMap[K];
  }

  const words = Array.isArray(value.bannedWords) ? value.bannedWords : null;
  const blockLinks = bool(value.blockLinks);
  const rate = value.chatMessagesPerMinute;
  if (!words || blockLinks === null || typeof rate !== "number" || !Number.isInteger(rate) || rate < 1 || rate > 120) {
    return "Chat safety settings are invalid.";
  }
  const bannedWords = [
    ...new Set(
      words
        .map((word) => text(word, 40)?.toLowerCase() ?? "")
        .filter(Boolean),
    ),
  ].slice(0, 500);
  return { bannedWords, blockLinks, chatMessagesPerMinute: rate } as SettingsMap[K];
}
