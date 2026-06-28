import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRoom, serializeRoom } from "@/lib/competition-store";

export const dynamic = "force-dynamic";

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as { id?: string; name?: string | null; email?: string | null };
  return {
    id: user.id ?? "anonymous",
    name: user.name ?? user.email ?? "Anonyme",
  };
}

/**
 * POST /api/competition/next
 * Body: { code }
 * Host-only: advances the room to the next question, or finishes the game
 * if all questions have been answered.
 *
 * - When called from "lobby": starts the game (sets status to "playing",
 *   resets currentIndex to 0, starts the timer).
 * - When called during "playing": advances to the next question. If the
 *   current question was the last, finishes the game and freezes the
 *   leaderboard.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const code = (typeof body.code === "string" ? body.code : "").toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "code est requis" }, { status: 400 });
  }

  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Salon introuvable" }, { status: 404 });
  }

  if (room.hostId !== user.id) {
    return NextResponse.json(
      { error: "Seul l'hôte peut avancer les questions" },
      { status: 403 }
    );
  }

  if (room.status === "lobby") {
    if (room.participants.size === 0) {
      return NextResponse.json(
        { error: "Au moins un participant est requis" },
        { status: 400 }
      );
    }
    room.status = "playing";
    room.currentIndex = 0;
    room.questionStartedAt = Date.now();
    // Reset per-participant state for the first question.
    for (const p of room.participants.values()) {
      p.answeredCurrent = false;
    }
    return NextResponse.json(serializeRoom(room, user.id));
  }

  if (room.status === "finished") {
    return NextResponse.json(serializeRoom(room, user.id));
  }

  // status === "playing"
  // Advance to the next question.
  const nextIndex = room.currentIndex + 1;
  if (nextIndex >= room.questions.length) {
    // Game over — freeze the leaderboard.
    room.status = "finished";
    room.questionStartedAt = null;
    room.finalLeaderboard = Array.from(room.participants.values()).sort(
      (a, b) => b.score - a.score
    );
    return NextResponse.json(serializeRoom(room, user.id));
  }

  room.currentIndex = nextIndex;
  room.questionStartedAt = Date.now();
  // Reset answeredCurrent for the new question.
  for (const p of room.participants.values()) {
    p.answeredCurrent = false;
  }

  return NextResponse.json(serializeRoom(room, user.id));
}
