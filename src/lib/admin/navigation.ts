import type { Permission } from "@/lib/admin/permissions";

export type SectionStatus = "live" | "partial" | "planned";

export type AdminSection = {
  id: string;
  label: string;
  permission: Permission;
  status: SectionStatus;
  summary: string;
  capabilities?: string[];
  needs?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  sections: AdminSection[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: "operations",
    label: "Operations",
    sections: [
      { id: "overview", label: "Overview", permission: "overview.view", status: "live", summary: "Players, results, moderation and system health at a glance." },
      { id: "analytics", label: "Analytics", permission: "analytics.view", status: "partial", summary: "Player activity, retention, faction and role balance.", needs: "Session, queue and match-duration metrics need the match server." },
      { id: "maintenance", label: "Maintenance", permission: "maintenance.edit", status: "live", summary: "Maintenance mode, player-facing message and minimum client version." },
      { id: "support", label: "Support Tools", permission: "support.act", status: "partial", summary: "Find a player or match and repair their record.", needs: "Error inspection needs server error logging." },
    ],
  },
  {
    id: "players",
    label: "Players & Safety",
    sections: [
      { id: "players", label: "Players", permission: "players.view", status: "live", summary: "Search, inspect and manage player accounts." },
      { id: "moderation", label: "Moderation", permission: "moderation.view", status: "partial", summary: "Reports, active restrictions and chat safety rules.", needs: "Reports arrive once in-game reporting ships. Appeals are not built yet." },
      {
        id: "chat", label: "Chat", permission: "moderation.view", status: "planned",
        summary: "Lobby, match, dead-player and team chat management.",
        capabilities: ["Chat logs by match and channel", "Mute management", "Spam detection", "Banned phrases and link restrictions", "Rate limits and retention"],
        needs: "Needs the in-game chat service. Banned words and rate limits can already be set under Moderation.",
      },
      {
        id: "social", label: "Social", permission: "moderation.view", status: "planned",
        summary: "Friends, parties, blocks and teaming investigations.",
        capabilities: ["Friend request spam", "Block lists", "Party history", "Teaming pattern detection", "Social reports"],
        needs: "Needs friends and parties to exist in the game.",
      },
      {
        id: "anti-cheat", label: "Anti-Cheat", permission: "moderation.act", status: "planned",
        summary: "Suspicious activity signals and investigations.",
        capabilities: ["Impossible actions and abnormal timing", "Coordinated voting and teaming", "Multi-account, AFK and XP farming", "Win trading and exploit abuse", "Investigations with attached evidence"],
        needs: "Needs match event telemetry from the match server. Signals will never auto-ban on their own.",
      },
    ],
  },
  {
    id: "matches",
    label: "Matches",
    sections: [
      { id: "matches", label: "Matches", permission: "matches.view", status: "partial", summary: "Completed match results by player, role and faction.", needs: "Live matches, timelines and spectating need the match server." },
      {
        id: "matchmaking", label: "Matchmaking", permission: "config.view", status: "planned",
        summary: "Queues, wait times and matchmaking rules.",
        capabilities: ["Active queues by region, rank and mode", "MMR range and expansion over time", "New-player matchmaking", "Party and region rules", "Lobby timeouts and disconnect handling"],
        needs: "Needs the matchmaking service.",
      },
      {
        id: "ranked", label: "Ranked", permission: "config.view", status: "planned",
        summary: "Ranks, seasons, rating rules and corrections.",
        capabilities: ["Rank names, icons and thresholds", "Rating gain and loss rules", "Placement matches and seasons", "Leaderboards and season rewards", "Win-trading investigations and rating corrections"],
        needs: "Needs a rating system. Rank names can be edited per player today.",
      },
    ],
  },
  {
    id: "design",
    label: "Game Design",
    sections: [
      { id: "roles", label: "Roles", permission: "content.view", status: "partial", summary: "Role performance from completed matches.", needs: "The role editor needs roles to move from the game code into the database." },
      { id: "factions", label: "Factions", permission: "content.view", status: "partial", summary: "Village, Werewolf, Solo and Neutral performance.", needs: "Editing faction text and colours needs the content store." },
      {
        id: "game-modes", label: "Game Modes", permission: "config.view", status: "planned",
        summary: "Casual, Ranked, Quick Match, Custom and limited-time modes.",
        capabilities: ["Player counts and phase durations", "Role pools and distribution presets", "Chat and vote rules", "XP multipliers and rank eligibility", "16-player default composition"],
        needs: "Needs the match server to read mode definitions.",
      },
      { id: "game-config", label: "Game Configuration", permission: "config.view", status: "live", summary: "Phase timers, player limits and voting rules." },
      { id: "feature-flags", label: "Feature Flags", permission: "config.view", status: "live", summary: "Turn features off, on for admins or testers, or roll them out by percentage." },
    ],
  },
  {
    id: "progression",
    label: "Progression & Economy",
    sections: [
      {
        id: "progression", label: "Progression", permission: "config.view", status: "planned",
        summary: "XP rules, level thresholds and progression rewards.",
        capabilities: ["XP per match, win and bonus", "Level thresholds and caps", "Double XP events", "XP farming detection"],
        needs: "Needs XP to be awarded by the match server. XP can be corrected per player today.",
      },
      { id: "achievements", label: "Achievements", permission: "achievements.view", status: "partial", summary: "Achievement catalogue and unlock rates.", needs: "Creating and editing achievements needs the content store. Grants work per player." },
      {
        id: "missions", label: "Missions", permission: "config.view", status: "planned",
        summary: "Daily and weekly missions.",
        capabilities: ["Requirements, rewards and difficulty", "Reset schedules", "Role and faction requirements", "No missions that reward throwing matches"],
        needs: "Needs mission tracking in the match server.",
      },
      {
        id: "events", label: "Events", permission: "config.view", status: "planned",
        summary: "Limited-time events with their own modes and rewards.",
        capabilities: ["Start and end dates", "Event modes, cosmetics and achievements", "XP multipliers and login rewards", "Event leaderboards", "Instant kill switch"],
        needs: "Needs game modes and rewards. The Events feature flag already exists as a kill switch.",
      },
      {
        id: "inventory", label: "Inventory", permission: "economy.view", status: "planned",
        summary: "Cosmetics catalogue and ownership.",
        capabilities: ["Hair, faces, outfits, accessories, frames, badges, nameplates and emotes", "Rarity, price and availability", "Grant, revoke and retire items", "Ownership counts"],
        needs: "Needs an inventory system in the game.",
      },
      {
        id: "shop", label: "Shop", permission: "economy.view", status: "planned",
        summary: "Shop items, rotations, bundles and promotions.",
        capabilities: ["Featured items and rotations", "Bundles, discounts and promo codes", "Purchase limits", "Transactions, failures and refunds"],
        needs: "Needs the shop and inventory systems.",
      },
      {
        id: "economy", label: "Economy", permission: "economy.view", status: "planned",
        summary: "Currency sources, sinks and balance corrections.",
        capabilities: ["Currency generated and spent", "Sources, sinks and inflation", "Player balances and fraud alerts", "Balance corrections with reason and audit"],
        needs: "Needs an in-game currency.",
      },
    ],
  },
  {
    id: "web3",
    label: "Web3",
    sections: [
      {
        id: "onchain", label: "On-chain", permission: "onchain.view", status: "planned",
        summary: "Wallet identity, network status and entitlement checks.",
        capabilities: ["Embedded and external wallet addresses", "Supported chains and contract addresses", "Game transactions and failures", "NFT and token entitlement checks", "Never exposes private keys or moves player assets"],
        needs: "Needs on-chain features in the game. Wallet addresses already show on player records when known.",
      },
    ],
  },
  {
    id: "content",
    label: "Content & Comms",
    sections: [
      {
        id: "content", label: "Content", permission: "content.view", status: "planned",
        summary: "Role icons, art, backgrounds, sounds and cosmetic assets.",
        capabilities: ["Preview and upload", "Versions and rollback", "Disable or replace assets"],
        needs: "Needs file storage such as Vercel Blob.",
      },
      {
        id: "themes", label: "Themes", permission: "content.view", status: "planned",
        summary: "Village Day, Moonlit Night and seasonal themes.",
        capabilities: ["Colours, surfaces, text and buttons", "Backgrounds and environment art", "Availability and preview before publishing"],
        needs: "Themes live in the stylesheet today and need to move to the content store.",
      },
      {
        id: "announcements", label: "Announcements", permission: "content.view", status: "planned",
        summary: "Scheduled notices for players.",
        capabilities: ["Maintenance, updates, roles, seasons and events", "Schedule, publish, expire and archive", "Target by platform, version, region or test group"],
        needs: "Needs an announcements area in the game. Maintenance messages already work.",
      },
      {
        id: "patch-notes", label: "Patch Notes", permission: "content.view", status: "planned",
        summary: "Versioned release notes.",
        capabilities: ["Title, version, date and body", "Images and featured updates", "Drafts, scheduled publishing and archive"],
        needs: "Needs a patch notes page in the game.",
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    sections: [
      { id: "admins", label: "Admins & Permissions", permission: "admins.view", status: "live", summary: "Admin accounts, roles and what each role can do." },
      { id: "audit", label: "Audit Logs", permission: "audit.view", status: "live", summary: "Every admin action, searchable and exportable." },
    ],
  },
];

export const ADMIN_SECTIONS = ADMIN_NAV.flatMap((group) => group.sections);

export function findSection(id: string) {
  return ADMIN_SECTIONS.find((section) => section.id === id);
}
