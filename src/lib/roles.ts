export type Faction = "good" | "werewolf" | "solo" | "neutral";

export type RoleStat = {
  roleId: string;
  roleName: string;
  faction: Faction;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
};

export const FACTION_LABEL: Record<Faction, string> = {
  good: "Village",
  werewolf: "Werewolf",
  solo: "Solo",
  neutral: "Neutral",
};

export function roleIdFor(roleName: string) {
  return roleName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toFaction(value: unknown): Faction {
  return value === "werewolf" || value === "solo" || value === "neutral"
    ? value
    : "good";
}
