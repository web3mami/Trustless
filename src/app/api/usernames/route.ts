import { NextResponse } from "next/server";
import { claimUsername } from "@/lib/usernames";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    userId?: unknown;
  } | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const result = await claimUsername(username, userId);

  if (result === "exists") {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }
  if (result === "invalid") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
