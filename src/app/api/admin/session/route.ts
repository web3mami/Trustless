import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminConfigured,
  checkAdminLogin,
  loginLockedFor,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const locked = loginLockedFor(request);
  if (locked > 0) {
    return NextResponse.json(
      { error: "locked", retryAfterMinutes: Math.ceil(locked / 60000) },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const session = checkAdminLogin(request, username, password);
  if (!session) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, session, {
    ...cookieOptions,
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
