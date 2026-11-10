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
  await refreshSeededMayor();
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
  await refreshSeededMayor();
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

/** The first seeded Mayor always counted as two votes. That row learns the daytime reveal. */
async function refreshSeededMayor() {
  const mayor = ROLES.find((role) => role.id === "mayor");
  if (!mayor) return;
  const rows = (await db()`SELECT definition FROM role_definitions WHERE id = 'mayor'`) as {
    definition: unknown;
  }[];
  const stored = rows[0]?.definition;
  const body = typeof stored === "string" ? JSON.parse(stored) as unknown : stored;
  if (!isRecord(body) || body.revealActivatesVote === true) return;
  if (body.abilityDescription !== "Your vote counts as two.") return;
  await db()`
    UPDATE role_definitions
    SET definition = ${JSON.stringify(mayor)}::jsonb, updated_at = now(), updated_by_name = 'system'
    WHERE id = 'mayor'
  `;
}
