import { neon } from "@neondatabase/serverless";
import { roleIdFor, toFaction, type Faction, type RoleStat } from "@/lib/roles";

type Gender = "male" | "female" | "other";

type FactionRecord = Record<Faction, { games: number; wins: number }>;

export type PlayerProfile = {
  userId: string;
  playerId: string;
  username: string;
  gender: Gender;
  memberSince: string;
  level: number;
  xp: number;
  rank: string;
  stats: {
    matches: number;
    wins: number;
    correctVotes: number;
  };
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
  }[];
  matchHistory: {
    id: string;
    result: "win" | "loss";
    role: string;
    faction: Faction;
    xpEarned: number;
    playedAt: string;
  }[];
  factionRecord: FactionRecord;
  roleStats: RoleStat[];
};

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

const state = globalThis as typeof globalThis & {
  __trustlessProfilesReadyV3?: Promise<void>;
};

function prepareProfiles() {
  if (!sql) return Promise.reject(new Error("DATABASE_URL is not configured"));
  state.__trustlessProfilesReadyV3 ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        privy_user_id TEXT PRIMARY KEY,
        player_id TEXT UNIQUE,
        username TEXT NOT NULL CHECK (char_length(username) BETWEEN 1 AND 16),
        gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
        wallet_address TEXT,
        level INTEGER NOT NULL DEFAULT 1 CHECK (level > 0),
        xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
        rank TEXT NOT NULL DEFAULT 'Unranked',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1`;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank TEXT NOT NULL DEFAULT 'Unranked'`;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_id TEXT`;
    await sql`
      UPDATE profiles
      SET player_id = 'TRST-' || upper(substr(md5(privy_user_id), 1, 6))
      WHERE player_id IS NULL
    `;
    await sql`ALTER TABLE profiles ALTER COLUMN player_id SET NOT NULL`;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_player_id_unique
      ON profiles (player_id)
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
      ON profiles ((lower(username)))
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS match_history (
        id BIGSERIAL PRIMARY KEY,
        privy_user_id TEXT NOT NULL REFERENCES profiles(privy_user_id) ON DELETE CASCADE,
        result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
        role TEXT NOT NULL,
        faction TEXT NOT NULL DEFAULT 'good',
        xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
        correct_votes INTEGER NOT NULL DEFAULT 0 CHECK (correct_votes >= 0),
        played_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS faction TEXT NOT NULL DEFAULT 'good'`;
    await sql`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0`;
    await sql`
      CREATE INDEX IF NOT EXISTS match_history_player_date_idx
      ON match_history (privy_user_id, played_at DESC)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS player_achievements (
        privy_user_id TEXT NOT NULL REFERENCES profiles(privy_user_id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (privy_user_id, achievement_id)
      )
    `;
  })();
  return state.__trustlessProfilesReadyV3;
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
      INSERT INTO profiles (privy_user_id, player_id, username, gender)
      VALUES (
        ${userId},
        'TRST-' || upper(substr(md5(${userId}), 1, 6)),
        ${name},
        ${gender}
      )
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

export async function getProfile(userId: string): Promise<PlayerProfile | null> {
  if (!userId) return null;

  await prepareProfiles();
  const profileRows = await sql!`
    SELECT privy_user_id, player_id, username, gender, level, xp, rank, created_at
    FROM profiles
    WHERE privy_user_id = ${userId}
    LIMIT 1
  `;
  const row = profileRows[0] as
    | {
        privy_user_id: string;
        player_id: string;
        username: string;
        gender: Gender;
        level: number;
        xp: number;
        rank: string;
        created_at: string | Date;
      }
    | undefined;

  if (!row) return null;
  const [statsRows, achievementRows, matchRows, factionRows, roleRows] =
    await Promise.all([
    sql!`
      SELECT
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE result = 'win')::int AS wins,
        COALESCE(SUM(correct_votes), 0)::int AS correct_votes
      FROM match_history
      WHERE privy_user_id = ${userId}
    `,
    sql!`
      SELECT achievement_id, name, description, unlocked_at
      FROM player_achievements
      WHERE privy_user_id = ${userId}
      ORDER BY unlocked_at DESC
    `,
    sql!`
      SELECT id::text, result, role, faction, xp_earned, played_at
      FROM match_history
      WHERE privy_user_id = ${userId}
      ORDER BY played_at DESC
      LIMIT 10
    `,
    sql!`
      SELECT
        faction,
        COUNT(*)::int AS games,
        COUNT(*) FILTER (WHERE result = 'win')::int AS wins
      FROM match_history
      WHERE privy_user_id = ${userId}
      GROUP BY faction
    `,
    sql!`
      SELECT
        role,
        (array_agg(faction ORDER BY played_at DESC))[1] AS faction,
        COUNT(*)::int AS games,
        COUNT(*) FILTER (WHERE result = 'win')::int AS wins
      FROM match_history
      WHERE privy_user_id = ${userId}
      GROUP BY role
      ORDER BY games DESC, wins DESC, role ASC
    `,
  ]);
  const stats = statsRows[0] as {
    matches: number;
    wins: number;
    correct_votes: number;
  };

  const factionRecord: FactionRecord = {
    good: { games: 0, wins: 0 },
    werewolf: { games: 0, wins: 0 },
    solo: { games: 0, wins: 0 },
    neutral: { games: 0, wins: 0 },
  };
  for (const faction of factionRows) {
    const key = String(faction.faction) as Faction;
    if (key in factionRecord) {
      factionRecord[key] = {
        games: Number(faction.games),
        wins: Number(faction.wins),
      };
    }
  }

  return {
    userId: row.privy_user_id,
    playerId: row.player_id,
    username: row.username,
    gender: row.gender,
    memberSince: new Date(row.created_at).toISOString(),
    level: Number(row.level),
    xp: Number(row.xp),
    rank: row.rank,
    stats: {
      matches: Number(stats.matches),
      wins: Number(stats.wins),
      correctVotes: Number(stats.correct_votes),
    },
    achievements: achievementRows.map((achievement) => ({
      id: String(achievement.achievement_id),
      name: String(achievement.name),
      description: String(achievement.description),
      unlockedAt: new Date(String(achievement.unlocked_at)).toISOString(),
    })),
    matchHistory: matchRows.map((match) => ({
      id: String(match.id),
      result: match.result === "win" ? ("win" as const) : ("loss" as const),
      role: String(match.role),
      faction: toFaction(match.faction),
      xpEarned: Number(match.xp_earned),
      playedAt: new Date(String(match.played_at)).toISOString(),
    })),
    factionRecord,
    roleStats: roleRows.map((role) => {
      const gamesPlayed = Number(role.games);
      const wins = Number(role.wins);
      return {
        roleId: roleIdFor(String(role.role)),
        roleName: String(role.role),
        faction: toFaction(role.faction),
        gamesPlayed,
        wins,
        losses: gamesPlayed - wins,
        winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
      };
    }),
  };
}
