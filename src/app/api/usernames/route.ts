import { NextResponse } from "next/server";
import { claimUsername } from "@/lib/usernames";

export const runtime = "nodejs";

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
