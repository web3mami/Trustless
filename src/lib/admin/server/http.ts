import { NextResponse } from "next/server";
import { AdminError } from "@/lib/admin/server/auth";

const NO_STORE = { "Cache-Control": "no-store" };

export function adminJson(body: unknown, init: { status?: number } = {}) {
  return NextResponse.json(body, { status: init.status ?? 200, headers: NO_STORE });
}

export function adminFailure(error: unknown) {
  if (error instanceof AdminError) {
    return adminJson({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error("Admin request failed", error);
  return adminJson({ error: "server", message: "Something went wrong on the server." }, { status: 500 });
}

export async function readJson(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64_000) throw new AdminError(413, "too-large", "Request is too large.");
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    throw new AdminError(400, "invalid", "Invalid request.");
  }
}
