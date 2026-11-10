import { NextResponse } from "next/server";
import { requestUserId } from "@/lib/privy-auth";
import { claimUsername, getProfile, isBanned } from "@/lib/usernames";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    if (await isBanned(userId)) {
      return NextResponse.json({ error: "banned" }, { status: 403 });
    }
    const profile = await getProfile(userId);
    return NextResponse.json(
      { profile },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load profile", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    gender?: unknown;
  } | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const gender =
    body?.gender === "male" ||
    body?.gender === "female" ||
    body?.gender === "other"
      ? body.gender
      : null;

  try {
    const result = await claimUsername(username, userId, gender!);

    if (result === "exists") {
      return NextResponse.json({ error: "exists" }, { status: 409 });
    }
    if (result === "banned") {
      return NextResponse.json({ error: "banned" }, { status: 403 });
    }
    if (result === "invalid") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not claim username", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
