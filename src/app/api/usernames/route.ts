import { NextResponse } from "next/server";
import { claimUsername, getProfile } from "@/lib/usernames";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
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
  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    userId?: unknown;
    gender?: unknown;
  } | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const userId = typeof body?.userId === "string" ? body.userId : "";
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
    if (result === "invalid") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not claim username", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
