import { NextResponse } from "next/server";
import { listRoleDefinitions } from "@/lib/admin/server/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roles = (await listRoleDefinitions()).filter((role) => role.enabled);
    return NextResponse.json({ roles }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load roles", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
