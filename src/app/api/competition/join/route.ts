import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
<<<<<<< Updated upstream
import {
  getRoom,
  serializeRoom,
  type Participant,
} from "@/lib/competition-store";

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
 * POST /api/competition/join
 * Body: { code, name? }
 * Joins an existing room as a participant. If already a participant, returns
 * the current state.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  let body: { code?: unknown; name?: unknown };
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

  // Use provided name or fall back to session name.
  const displayName =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim().slice(0, 60)
      : user.name;

  if (!room.participants.has(user.id)) {
    // Reject joins after the game has started (to keep scoring fair).
    if (room.status === "playing") {
      return NextResponse.json(
        { error: "La compétition a déjà commencé. Attendez la prochaine manche." },
        { status: 400 }
      );
    }
    if (room.status === "finished") {
      return NextResponse.json(
        { error: "Cette compétition est terminée." },
        { status: 400 }
      );
    }
    const participant: Participant = {
      id: user.id,
      name: displayName,
      score: 0,
      answeredCount: 0,
      answers: {},
      answeredCurrent: false,
      joinedAt: Date.now(),
    };
    room.participants.set(user.id, participant);
  } else {
    // Update display name if the user is rejoining.
    const existing = room.participants.get(user.id)!;
    existing.name = displayName;
  }

  return NextResponse.json(serializeRoom(room, user.id));
=======
import { db } from "@/lib/db";
import { competitionStore } from "@/lib/competition-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/competition/join — rejoindre une room par son code.
 * Corps : { code, participantId? }
 *
 * Si participantId est fourni (depuis le localStorage du client) et que le
 * participant existe déjà dans la room (ex: reload), on le reconnecte sans
 * reset son score. Sinon on l'ajoute.
 */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const body = (await request.json()) as { code?: string };
    const code = (body.code ?? "").toUpperCase().trim();
    if (!code) {
      return NextResponse.json({ error: "Code requis" }, { status: 400 });
    }

    const existing = competitionStore.getRoom(code);
    if (!existing) {
      return NextResponse.json({ error: "Room introuvable" }, { status: 404 });
    }

    // Si le user n'est pas encore participant, on l'ajoute
    if (!existing.participants[user.id]) {
      competitionStore.joinRoom(code, { id: user.id, name: user.name });
    }

    const room = competitionStore.getRoom(code)!;
    return NextResponse.json({
      code: room.code,
      phase: room.phase,
      bankTitle: room.bankTitle,
      hostName: room.hostName,
      currentQuestionIdx: room.currentQuestionIdx,
      totalQuestions: room.questions.length,
      questionDurationSec: room.questionDurationSec,
      questionStartedAt: room.questionStartedAt,
      isHost: room.hostId === user.id,
      hostId: user.id,
    });
  } catch (error) {
    console.error("Failed to join competition room:", error);
    return NextResponse.json(
      { error: "Failed to join room" },
      { status: 500 }
    );
  }
>>>>>>> Stashed changes
}
