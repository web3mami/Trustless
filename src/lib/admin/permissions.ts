export const PERMISSIONS = {
  "overview.view": "View the operations overview",
  "players.view": "View player records",
  "players.edit": "Edit usernames, XP and stats",
  "players.moderate": "Warn, mute and restrict players",
  "players.ban": "Suspend and ban players",
  "players.delete": "Delete player accounts",
  "players.export": "Export player data",
  "players.notes": "Read and write admin notes",
  "matches.view": "View match records",
  "matches.edit": "Correct or invalidate match records",
  "moderation.view": "View reports and restrictions",
  "moderation.act": "Resolve reports and edit chat safety rules",
  "achievements.view": "View achievements",
  "achievements.grant": "Grant or revoke achievements",
  "content.view": "View roles, factions and game content",
  "roles.edit": "Edit roles and factions",
  "config.view": "View game configuration",
  "config.edit": "Edit game configuration",
  "flags.edit": "Edit feature flags",
  "maintenance.edit": "Control maintenance mode",
  "analytics.view": "View analytics",
  "audit.view": "View audit logs",
  "audit.export": "Export audit logs",
  "admins.view": "View admin accounts",
  "admins.manage": "Create and manage admin accounts",
  "support.act": "Use support recovery tools",
  "economy.view": "View economy, shop and inventory",
  "economy.edit": "Edit economy, shop and inventory",
  "onchain.view": "View on-chain identity",
  "onchain.edit": "Edit chain and contract settings",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ADMIN_ROLES = {
  super_admin: "Super Admin",
  game_admin: "Game Admin",
  moderator: "Moderator",
  support: "Support",
  content_manager: "Content Manager",
  developer_ops: "Developer / Operations",
  analytics_viewer: "Analytics Viewer",
} as const;

export type AdminRole = keyof typeof ADMIN_ROLES;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  super_admin: ALL,
  game_admin: ALL.filter((permission) => permission !== "admins.manage"),
  moderator: [
    "overview.view",
    "players.view",
    "players.moderate",
    "players.ban",
    "players.notes",
    "matches.view",
    "moderation.view",
    "moderation.act",
    "achievements.view",
  ],
  support: [
    "overview.view",
    "players.view",
    "players.edit",
    "players.notes",
    "matches.view",
    "matches.edit",
    "moderation.view",
    "achievements.view",
    "achievements.grant",
    "support.act",
  ],
  content_manager: [
    "overview.view",
    "content.view",
    "roles.edit",
    "achievements.view",
    "config.view",
    "economy.view",
  ],
  developer_ops: [
    "overview.view",
    "players.view",
    "matches.view",
    "config.view",
    "config.edit",
    "flags.edit",
    "maintenance.edit",
    "analytics.view",
    "audit.view",
    "onchain.view",
  ],
  analytics_viewer: ["overview.view", "analytics.view", "content.view", "matches.view"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && value in ADMIN_ROLES;
}

export function permissionsFor(role: AdminRole) {
  return ROLE_PERMISSIONS[role];
}

export function can(permissions: readonly Permission[], permission?: Permission) {
  return !permission || permissions.includes(permission);
}
