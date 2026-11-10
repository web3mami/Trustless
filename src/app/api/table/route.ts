import { NextResponse } from "next/server";
import {
  advancePracticePhase,
  createPracticeMatch,
  practiceView,
  readPracticeMatch,
  submitPracticeAction,
  type TableIntent,
} from "@/lib/game/practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMES = [
  "You",
  "Mara",
  "Ivo",
  "Sable",
  "Quinn",
  "Ren",
  "Hester",
  "Jules",
  "Anouk",
  "Beck",
  "Noor",
  "Cass",
  "Leif",
  "Willa",
  "Omar",
  "Petra",
];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    op?: string;
    matchId?: string;
    intent?: TableIntent;
    targets?: unknown;
    you?: string;
  } | null;
  if (!body?.op) return NextResponse.json({ error: "Missing action." }, { status: 400 });

  if (body.op === "start") {
    const names = [...NAMES];
    if (typeof body.you === "string" && body.you.trim()) names[0] = body.you.trim().slice(0, 24);
    return NextResponse.json(practiceView(createPracticeMatch(names)), { headers: { "Cache-Control": "no-store" } });
  }

  const match = typeof body.matchId === "string" ? readPracticeMatch(body.matchId) : null;
  if (!match) return NextResponse.json({ error: "That table is no longer open." }, { status: 404 });

  if (body.op === "advance") {
    return NextResponse.json(advancePracticePhase(match), { headers: { "Cache-Control": "no-store" } });
  }

  if (body.op === "act") {
    if (body.intent !== "ability" && body.intent !== "vote") {
      return NextResponse.json({ error: "Choose an ability or a vote." }, { status: 400 });
    }
    const targets = Array.isArray(body.targets) ? body.targets.filter((id): id is string => typeof id === "string") : [];
    const result = submitPracticeAction(match, body.intent, targets);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.view, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
