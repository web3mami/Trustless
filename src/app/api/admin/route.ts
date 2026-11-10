import { NextResponse } from "next/server";
import {
  addMatch,
  deleteMatch,
  deletePlayer,
  getOverview,
  getPlayer,
  grantAchievement,
  listPlayers,
  revokeAchievement,
  setBanned,
  updatePlayer,
} from "@/lib/admin";
import { authorizeAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function guard(request: Request) {
  if (!authorizeAdmin(request)) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: noStore });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  try {
    const view = params.get("view");
    if (view === "overview") {
      return NextResponse.json({ overview: await getOverview() }, { headers: noStore });
    }
    if (view === "players") {
      return NextResponse.json(
        { players: await listPlayers(params.get("q") ?? "") },
        { headers: noStore },
      );
    }
    if (view === "player") {
      const player = await getPlayer(params.get("userId") ?? "");
      if (!player) {
        return NextResponse.json({ error: "not-found" }, { status: 404, headers: noStore });
      }
      return NextResponse.json({ player }, { headers: noStore });
    }
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });
  } catch (error) {
    console.error("Admin read failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const whole = (value: unknown) => (typeof value === "number" ? value : Number.NaN);
  if (!body || !userId) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    let result: "ok" | "invalid" | "exists";
    switch (body.action) {
      case "update":
        result = await updatePlayer(userId, {
          username: text(body.username),
          level: whole(body.level),
          xp: whole(body.xp),
          rank: text(body.rank),
        });
        break;
      case "grant-achievement":
        result = await grantAchievement(userId, text(body.achievementId));
        break;
      case "revoke-achievement":
        result = await revokeAchievement(userId, text(body.achievementId));
        break;
      case "add-match":
        result = await addMatch(userId, {
          result: text(body.result),
          role: text(body.role),
          faction: text(body.faction),
          xpEarned: whole(body.xpEarned),
        });
        break;
      case "delete-match":
        result = await deleteMatch(userId, text(body.matchId));
        break;
      case "ban":
        result = await setBanned(userId, true);
        break;
      case "unban":
        result = await setBanned(userId, false);
        break;
      case "delete-player":
        result = await deletePlayer(userId);
        break;
      default:
        result = "invalid";
    }

    if (result === "exists") {
      return NextResponse.json({ error: "exists" }, { status: 409 });
    }
    if (result === "invalid") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin action failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
