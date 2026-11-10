import { NextResponse } from "next/server";
import {
  AdminError,
  SESSION_COOKIE,
  SESSION_SECONDS,
  currentAdmin,
  login,
  logout,
  sessionCookieOptions,
} from "@/lib/admin/server/auth";
import { adminFailure, adminJson, readJson } from "@/lib/admin/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicIdentity(admin: Awaited<ReturnType<typeof currentAdmin>>) {
  if (!admin) return null;
  const { id, username, role, totpEnabled, permissions } = admin;
  return { id, username, role, totpEnabled, permissions };
}

export async function GET(request: Request) {
  try {
    return adminJson({ admin: publicIdentity(await currentAdmin(request)) });
  } catch (error) {
    return adminFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("x-trustless-admin") !== "1") {
      throw new AdminError(403, "csrf", "Request blocked.");
    }
    const body = await readJson(request);
    const username = typeof body.username === "string" ? body.username.slice(0, 60) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
    const code = typeof body.code === "string" ? body.code.slice(0, 10) : "";
    if (!username || !password) {
      return adminJson({ error: "invalid", message: "Enter your username and password." }, { status: 400 });
    }
    const result = await login(request, { username, password, code });
    if (result.status === "locked") {
      const minutes = Math.ceil((result.retryAfterMs ?? 0) / 60_000);
      return adminJson(
        { error: "locked", message: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        { status: 429 },
      );
    }
    if (result.status === "totp-required") {
      return adminJson({ error: "totp-required", message: "Enter the 6-digit code from your authenticator app." }, { status: 401 });
    }
    if (result.status === "totp-invalid") {
      return adminJson({ error: "totp-invalid", message: "That code didn't match." }, { status: 401 });
    }
    if (result.status !== "ok") {
      return adminJson({ error: "invalid", message: "Wrong username or password." }, { status: 401 });
    }
    const response = NextResponse.json({ admin: result.admin }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(SESSION_SECONDS));
    return response;
  } catch (error) {
    return adminFailure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await logout(request);
  } catch (error) {
    console.error("Admin logout failed", error);
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
