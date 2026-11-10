import type { AdminRole, Permission } from "@/lib/admin/permissions";
import type { Faction } from "@/lib/roles";

export const RESTRICTION_KINDS = {
  warning: "Warning",
  mute: "Mute",
  chat_restrict: "Chat restriction",
  matchmaking_restrict: "Matchmaking restriction",
  monitor: "Monitoring flag",
  suspension: "Suspension",
  temp_ban: "Temporary ban",
  perm_ban: "Permanent ban",
} as const;

export type RestrictionKind = keyof typeof RESTRICTION_KINDS;

export const BAN_KINDS: readonly RestrictionKind[] = ["suspension", "temp_ban", "perm_ban"];

export const REPORT_CATEGORIES = {
  harassment: "Harassment",
  hate_speech: "Hate speech",
  threats: "Threats",
  sexual_content: "Sexual content",
  spam: "Spam",
  cheating: "Cheating",
  teaming: "Teaming",
  game_throwing: "Game throwing",
  afk_griefing: "AFK / griefing",
  exploit_abuse: "Exploit abuse",
  inappropriate_username: "Inappropriate username",
  inappropriate_avatar: "Inappropriate avatar",
  scam_phishing: "Scam / phishing",
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

export type AdminIdentity = {
  id: number;
  username: string;
  role: AdminRole;
  totpEnabled: boolean;
  permissions: Permission[];
};

export type PlayerStatus = "active" | "restricted" | "suspended" | "banned";

export type PlayerSummary = {
  userId: string;
  playerId: string;
  username: string;
  level: number;
  xp: number;
  rank: string;
  matches: number;
  wins: number;
  joinedAt: string;
  lastActiveAt: string | null;
  walletAddress: string | null;
  status: PlayerStatus;
  monitored: boolean;
};

export type Restriction = {
  id: string;
  userId: string;
  username?: string;
  kind: RestrictionKind;
  reason: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  active: boolean;
};

export type MatchRecord = {
  id: string;
  userId: string;
  username?: string;
  playerId?: string;
  result: "win" | "loss";
  role: string;
  faction: Faction;
  xpEarned: number;
  correctVotes: number;
  playedAt: string;
};

export type Report = {
  id: string;
  category: ReportCategory;
  reporterId: string | null;
  reporterName: string | null;
  reportedId: string;
  reportedName: string | null;
  matchRef: string | null;
  details: string;
  status: "open" | "escalated" | "dismissed" | "actioned";
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
};

export type PlayerDetail = PlayerSummary & {
  gender: string;
  correctVotes: number;
  losses: number;
  previousUsernames: { username: string; changedAt: string; changedBy: string }[];
  achievements: { id: string; name: string; unlockedAt: string }[];
  factions: Record<Faction, { games: number; wins: number }>;
  roles: { role: string; faction: Faction; games: number; wins: number }[];
  recentMatches: MatchRecord[];
  restrictions: Restriction[];
  notes: { id: string; adminName: string; body: string; createdAt: string }[];
  reportsReceived: Report[];
  reportsSubmitted: number;
};

export type AuditEntry = {
  id: string;
  adminId: number | null;
  adminName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  sessionRef: string | null;
  createdAt: string;
};

export type FactionStat = { faction: Faction; games: number; wins: number; winRate: number };
export type RoleStatRow = { role: string; faction: Faction; games: number; wins: number; losses: number; winRate: number };

export type OverviewData = {
  players: number;
  newToday: number;
  dau: number;
  wau: number;
  mau: number;
  resultsToday: number;
  resultsTotal: number;
  openReports: number;
  suspended: number;
  banned: number;
  monitored: number;
  factions: FactionStat[];
  mostPlayedRoles: RoleStatRow[];
  highestWinRoles: RoleStatRow[];
  lowestWinRoles: RoleStatRow[];
  recentAudit: AuditEntry[];
  recentBans: Restriction[];
  recentReports: Report[];
  system: { label: string; state: "ok" | "warning" | "down"; detail: string }[];
};

export type AnalyticsData = {
  dau: number;
  wau: number;
  mau: number;
  players: number;
  signups: { day: string; count: number }[];
  retention: { label: string; eligible: number; returned: number }[];
  factions: FactionStat[];
  roles: RoleStatRow[];
  moderation: { reports: number; mutes: number; bans: number; players: number };
  achievementCompletion: number;
};

export type AdminAccount = {
  id: number;
  username: string;
  role: AdminRole;
  totpEnabled: boolean;
  disabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  activeSessions: number;
};

export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number };
