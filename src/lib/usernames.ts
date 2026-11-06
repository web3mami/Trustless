import { neon } from "@neondatabase/serverless";

type Gender = "male" | "female" | "other";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

const state = globalThis as typeof globalThis & {
  __trustlessProfilesReady?: Promise<void>;
};

function prepareProfiles() {
  if (!sql) return Promise.reject(new Error("DATABASE_URL is not configured"));
  state.__trustlessProfilesReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        privy_user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL CHECK (char_length(username) BETWEEN 1 AND 16),
        gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
        wallet_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
      ON profiles ((lower(username)))
    `;
  })();
  return state.__trustlessProfilesReady;
}

export async function claimUsername(
  username: string,
  userId: string,
  gender: Gender,
) {
  const name = username.trim();
  if (!name || name.length > 16 || !userId || !gender) {
    return "invalid" as const;
  }

  try {
    await prepareProfiles();
    await sql!`
      INSERT INTO profiles (privy_user_id, username, gender)
      VALUES (${userId}, ${name}, ${gender})
      ON CONFLICT (privy_user_id) DO UPDATE SET
        username = EXCLUDED.username,
        gender = EXCLUDED.gender,
        updated_at = now()
    `;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return "exists" as const;
    }
    throw error;
  }

  return "ok" as const;
}
