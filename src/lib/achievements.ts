import type { Faction } from "@/components/faction-icon";

export type AchievementMark =
  | Faction
  | "blood"
  | "eye"
  | "moon"
  | "shield"
  | "crown"
  | "vote"
  | "star";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  mark: AchievementMark;
  secret?: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-blood", name: "First Blood", description: "Make your first kill as a Werewolf.", mark: "blood" },
  { id: "true-sight", name: "True Sight", description: "Uncover a Werewolf as the Seer.", mark: "eye", secret: true },
  { id: "last-light", name: "Last Light", description: "Survive to the final day.", mark: "moon", secret: true },
  { id: "lone-wolf", name: "Lone Wolf", description: "Win as the last Werewolf standing.", mark: "werewolf", secret: true },
  { id: "first-victory", name: "First Victory", description: "Win your first match.", mark: "crown" },
  { id: "village-hero", name: "Village Hero", description: "Win 10 matches with the Good faction.", mark: "good" },
  { id: "pack-leader", name: "Pack Leader", description: "Win 10 matches as a Werewolf.", mark: "werewolf" },
  { id: "solo-artist", name: "Solo Artist", description: "Win a match as a Solo role.", mark: "solo" },
  { id: "balance-keeper", name: "Balance Keeper", description: "Win a match as a Neutral role.", mark: "neutral" },
  { id: "on-a-roll", name: "On a Roll", description: "Win 3 matches in a row.", mark: "star" },
  { id: "veteran", name: "Veteran", description: "Play 50 matches.", mark: "crown" },
  { id: "rising-star", name: "Rising Star", description: "Reach Level 10.", mark: "star" },
  { id: "guardian", name: "Guardian", description: "Protect a player from a night attack.", mark: "shield", secret: true },
  { id: "silver-tongue", name: "Silver Tongue", description: "Convince the village to vote out a Werewolf.", mark: "vote", secret: true },
  { id: "framed", name: "Framed", description: "Get voted out as an innocent villager.", mark: "vote", secret: true },
  { id: "untouchable", name: "Untouchable", description: "Win a match without receiving a single vote.", mark: "shield", secret: true },
  { id: "night-owl", name: "Night Owl", description: "Survive 5 night attacks.", mark: "moon", secret: true },
  { id: "perfect-read", name: "Perfect Read", description: "Vote correctly on every day of a match.", mark: "eye", secret: true },
  { id: "last-word", name: "Last Word", description: "Expose a Werewolf with your final words.", mark: "vote", secret: true },
  { id: "blood-moon", name: "Blood Moon", description: "Win as a Werewolf without losing a packmate.", mark: "blood", secret: true },
  { id: "full-house", name: "Full House", description: "Play a match with every faction.", mark: "star", secret: true },
  { id: "unstoppable", name: "Unstoppable", description: "Win 10 matches in a row.", mark: "star", secret: true },
  { id: "centurion", name: "Centurion", description: "Play 100 matches.", mark: "crown", secret: true },
  { id: "legend", name: "Legend", description: "Reach the highest rank.", mark: "crown", secret: true },
];
