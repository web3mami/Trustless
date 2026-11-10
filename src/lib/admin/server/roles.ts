import { ROLES } from "@/lib/game/catalog";
import { parseRoleInput } from "@/lib/game/role-input";
import type { RoleDefinition } from "@/lib/game/types";
import { db, prepareAdmin } from "@/lib/admin/server/db";

const ready = globalThis as typeof globalThis & {
  __trustlessRolesReady?: Promise<void>;
};

async function seedRoleCatalog() {
  await prepareAdmin();
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS role_definitions (
      id TEXT PRIMARY KEY,
      definition JSONB NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by_name TEXT
    )
  `;
  const seeded = (await sql`
    SELECT key FROM game_settings WHERE key = 'role_catalog_seeded'
  `) as { key: string }[];
  if (seeded.length > 0) return;

  await Promise.all(
    ROLES.map(
      (role, index) => sql`
        INSERT INTO role_definitions (id, definition, sort_order, updated_by_name)
        VALUES (${role.id}, ${JSON.stringify(role)}::jsonb, ${index}, ${"system"})
        ON CONFLICT (id) DO NOTHING
      `,
    ),
  );
  await sql`
    INSERT INTO game_settings (key, value, updated_by_name)
    VALUES ('role_catalog_seeded', 'true'::jsonb, 'system')
    ON CONFLICT (key) DO NOTHING
  `;
  await migrateRoleCatalog();
}

export function ensureRoleCatalog() {
  ready.__trustlessRolesReady ??= seedRoleCatalog().catch((error: unknown) => {
    ready.__trustlessRolesReady = undefined;
    throw error;
  });
  return ready.__trustlessRolesReady;
}

export async function listRoleDefinitions(): Promise<RoleDefinition[]> {
  await ensureRoleCatalog();
  await migrateRoleCatalog();
  const rows = (await db()`
    SELECT id, definition
    FROM role_definitions
    ORDER BY sort_order ASC, id ASC
  `) as { id: string; definition: unknown }[];

  const roles: RoleDefinition[] = [];
  for (const row of rows) {
    const body =
      typeof row.definition === "string" ? JSON.parse(row.definition) as unknown : row.definition;
    const parsed = parseRoleInput(isRecord(body) ? { ...body, id: row.id } : body);
    if (typeof parsed === "string") {
      console.error(`Skipping role ${row.id}: ${parsed}`);
      continue;
    }
    roles.push(parsed);
  }
  return roles;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const LEGACY_IDS: Record<string, string> = {
  seer: "chain-analyst",
  detective: "investigator",
  mayor: "governor",
  fool: "rugpuller",
};

/** Rename the finalized roles once, then add Auditor and Aegis if this catalog already has roles. */
async function migrateRoleCatalog() {
  const sql = db();
  const done = (await sql`SELECT key FROM game_settings WHERE key = 'role_catalog_v2'`) as { key: string }[];
  if (done.length > 0) return;

  const rows = (await sql`SELECT id, definition, sort_order FROM role_definitions ORDER BY sort_order ASC`) as {
    id: string;
    definition: unknown;
    sort_order: number;
  }[];
  if (rows.length === 0) {
    await markRoleCatalogV2();
    return;
  }

  for (const row of rows) {
    const nextId = LEGACY_IDS[row.id];
    if (!nextId) continue;
    const catalog = ROLES.find((role) => role.id === nextId);
    if (!catalog) continue;
    const stored = storedRecord(row.definition);
    const definition = { ...catalog, enabled: typeof stored.enabled === "boolean" ? stored.enabled : catalog.enabled };
    const taken = (await sql`SELECT id FROM role_definitions WHERE id = ${nextId}`) as { id: string }[];
    if (taken.length > 0) {
      await sql`DELETE FROM role_definitions WHERE id = ${row.id}`;
    } else {
      await sql`
        UPDATE role_definitions
        SET id = ${nextId}, definition = ${JSON.stringify(definition)}::jsonb, updated_at = now(), updated_by_name = 'system'
        WHERE id = ${row.id}
      `;
    }
  }

  const current = (await sql`SELECT id, definition FROM role_definitions`) as { id: string; definition: unknown }[];
  const ids = new Set(current.map((row) => row.id));
  let order = rows.reduce((highest, row) => Math.max(highest, row.sort_order), 0);
  for (const id of ["auditor", "aegis"]) {
    if (ids.has(id)) continue;
    const role = ROLES.find((entry) => entry.id === id);
    if (!role) continue;
    order += 1;
    await sql`
      INSERT INTO role_definitions (id, definition, sort_order, updated_by_name)
      VALUES (${role.id}, ${JSON.stringify(role)}::jsonb, ${order}, ${"system"})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const row of current) {
    if (Object.values(LEGACY_IDS).includes(row.id)) continue;
    const catalog = ROLES.find((role) => role.id === row.id);
    if (!catalog) continue;
    const stored = storedRecord(row.definition);
    if (typeof stored.aura === "string" && typeof stored.icon === "string") continue;
    const definition = { ...stored, id: row.id, aura: catalog.aura, icon: catalog.icon };
    await sql`
      UPDATE role_definitions
      SET definition = ${JSON.stringify(definition)}::jsonb, updated_at = now(), updated_by_name = 'system'
      WHERE id = ${row.id}
    `;
  }

  await markRoleCatalogV2();
}

function storedRecord(value: unknown): Record<string, unknown> {
  const body = typeof value === "string" ? JSON.parse(value) as unknown : value;
  return isRecord(body) ? body : {};
}

async function markRoleCatalogV2() {
  await db()`
    INSERT INTO game_settings (key, value, updated_by_name)
    VALUES ('role_catalog_v2', 'true'::jsonb, 'system')
    ON CONFLICT (key) DO NOTHING
  `;
}
