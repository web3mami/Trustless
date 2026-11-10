import { ACHIEVEMENTS } from "@/lib/achievements";
import { toFaction, type Faction } from "@/lib/roles";
import { prepareProfiles, sql } from "@/lib/usernames";

export type AdminOverview = {
  players: number;
  banned: number;
  matches: number;
  newThisWeek: number;
  signups: { day: string; count: number }[];
};

export type AdminPlayerRow = {
  userId: string;
  playerId: string;
  username: string;
  level: number;
  xp: number;
  rank: string;
  matches: number;
  wins: number;
  joinedAt: string;
  bannedAt: string | null;
};

export type AdminPlayerDetail = AdminPlayerRow & {
  gender: string;
  achievements: { id: string; name: string; unlockedAt: string }[];
  matchHistory: {
    id: string;
    result: "win" | "loss";
    role: string;
    faction: Faction;
    xpEarned: number;
    playedAt: string;
  }[];
};

const iso = (value: unknown) => new Date(String(value)).toISOString();

function toRow(row: Record<string, unknown>): AdminPlayerRow {
  return {
    userId: String(row.privy_user_id),
    playerId: String(row.player_id),
    username: String(row.username),
    level: Number(row.level),
    xp: Number(row.xp),
    rank: String(row.rank),
    matches: Number(row.matches),
    wins: Number(row.wins),
    joinedAt: iso(row.created_at),
    bannedAt: row.banned_at ? iso(row.banned_at) : null,
  };
}

export async function getOverview(): Promise<AdminOverview> {
  await prepareProfiles();
  const [totals, signups] = await Promise.all([
    sql!`
      SELECT
        (SELECT COUNT(*)::int FROM profiles) AS players,
        (SELECT COUNT(*)::int FROM profiles WHERE banned_at IS NOT NULL) AS banned,
        (SELECT COUNT(*)::int FROM match_history) AS matches,
        (SELECT COUNT(*)::int FROM profiles WHERE created_at > now() - interval '7 days') AS new_this_week
    `,
    sql!`
      SELECT to_char(day, 'YYYY-MM-DD') AS day, COUNT(p.privy_user_id)::int AS count
      FROM generate_series(current_date - 13, current_date, interval '1 day') AS day
      LEFT JOIN profiles p ON p.created_at::date = day::date
      GROUP BY day
      ORDER BY day
    `,
  ]);
  const total = totals[0];
  return {
    players: Number(total.players),
    banned: Number(total.banned),
    matches: Number(total.matches),
    newThisWeek: Number(total.new_this_week),
    signups: signups.map((row) => ({
      day: String(row.day),
      count: Number(row.count),
    })),
  };
}

export async function listPlayers(search: string) {
  await prepareProfiles();
  const pattern = `%${search.trim()}%`;
  const rows = await sql!`
    SELECT
      p.privy_user_id, p.player_id, p.username, p.level, p.xp, p.rank,
      p.created_at, p.banned_at,
      COUNT(m.id)::int AS matches,
      COUNT(m.id) FILTER (WHERE m.result = 'win')::int AS wins
    FROM profiles p
    LEFT JOIN match_history m ON m.privy_user_id = p.privy_user_id
    WHERE p.username ILIKE ${pattern}
      OR p.player_id ILIKE ${pattern}
      OR p.privy_user_id ILIKE ${pattern}
    GROUP BY p.privy_user_id
    ORDER BY p.created_at DESC
    LIMIT 100
  `;
  return rows.map(toRow);
}

export async function getPlayer(userId: string): Promise<AdminPlayerDetail | null> {
  await prepareProfiles();
  const [rows, achievements, matches] = await Promise.all([
    sql!`
      SELECT
        p.privy_user_id, p.player_id, p.username, p.gender, p.level, p.xp, p.rank,
        p.created_at, p.banned_at,
        COUNT(m.id)::int AS matches,
        COUNT(m.id) FILTER (WHERE m.result = 'win')::int AS wins
      FROM profiles p
      LEFT JOIN match_history m ON m.privy_user_id = p.privy_user_id
      WHERE p.privy_user_id = ${userId}
      GROUP BY p.privy_user_id
    `,
    sql!`
      SELECT achievement_id, name, unlocked_at
      FROM player_achievements
      WHERE privy_user_id = ${userId}
      ORDER BY unlocked_at DESC
    `,
    sql!`
      SELECT id::text, result, role, faction, xp_earned, played_at
      FROM match_history
      WHERE privy_user_id = ${userId}
      ORDER BY played_at DESC
      LIMIT 50
    `,
  ]);
  const row = rows[0];
  if (!row) return null;
  return {
    ...toRow(row),
    gender: String(row.gender),
    achievements: achievements.map((achievement) => ({
      id: String(achievement.achievement_id),
      name: String(achievement.name),
      unlockedAt: iso(achievement.unlocked_at),
    })),
    matchHistory: matches.map((match) => ({
      id: String(match.id),
      result: match.result === "win" ? ("win" as const) : ("loss" as const),
      role: String(match.role),
      faction: toFaction(match.faction),
      xpEarned: Number(match.xp_earned),
      playedAt: iso(match.played_at),
    })),
  };
}

export async function updatePlayer(
  userId: string,
  fields: { username: string; level: number; xp: number; rank: string },
) {
  const username = fields.username.trim();
  const rank = fields.rank.trim();
  if (
    !username ||
    username.length > 16 ||
    !rank ||
    !Number.isInteger(fields.level) ||
    fields.level < 1 ||
    !Number.isInteger(fields.xp) ||
    fields.xp < 0
  ) {
    return "invalid" as const;
  }
  await prepareProfiles();
  try {
    await sql!`
      UPDATE profiles
      SET username = ${username}, level = ${fields.level}, xp = ${fields.xp},
        rank = ${rank}, updated_at = now()
      WHERE privy_user_id = ${userId}
    `;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return "exists" as const;
    }
    throw error;
  }
  return "ok" as const;
}

export async function grantAchievement(userId: string, achievementId: string) {
  const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId);
  if (!achievement) return "invalid" as const;
  await prepareProfiles();
  await sql!`
    INSERT INTO player_achievements (privy_user_id, achievement_id, name, description)
    VALUES (${userId}, ${achievement.id}, ${achievement.name}, ${achievement.description})
    ON CONFLICT (privy_user_id, achievement_id) DO NOTHING
  `;
  return "ok" as const;
}

export async function revokeAchievement(userId: string, achievementId: string) {
  await prepareProfiles();
  await sql!`
    DELETE FROM player_achievements
    WHERE privy_user_id = ${userId} AND achievement_id = ${achievementId}
  `;
  return "ok" as const;
}

export async function addMatch(
  userId: string,
  match: { result: string; role: string; faction: string; xpEarned: number },
) {
  const role = match.role.trim();
  if (
    (match.result !== "win" && match.result !== "loss") ||
    !role ||
    role.length > 40 ||
    !Number.isInteger(match.xpEarned) ||
    match.xpEarned < 0
  ) {
    return "invalid" as const;
  }
  await prepareProfiles();
  await sql!`
    INSERT INTO match_history (privy_user_id, result, role, faction, xp_earned)
    VALUES (${userId}, ${match.result}, ${role}, ${toFaction(match.faction)}, ${match.xpEarned})
  `;
  return "ok" as const;
}

export async function deleteMatch(userId: string, matchId: string) {
  await prepareProfiles();
  await sql!`
    DELETE FROM match_history
    WHERE privy_user_id = ${userId} AND id::text = ${matchId}
  `;
  return "ok" as const;
}

export async function setBanned(userId: string, banned: boolean) {
  await prepareProfiles();
  await sql!`
    UPDATE profiles
    SET banned_at = ${banned ? new Date().toISOString() : null}, updated_at = now()
    WHERE privy_user_id = ${userId}
  `;
  return "ok" as const;
}

export async function deletePlayer(userId: string) {
  await prepareProfiles();
  await sql!`DELETE FROM profiles WHERE privy_user_id = ${userId}`;
  return "ok" as const;
}
