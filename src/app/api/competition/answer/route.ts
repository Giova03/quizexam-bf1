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

/** Time-based bonus: faster answers earn more points (max +5, min +0). */
function speedBonus(elapsedMs: number, timeLimitSec: number): number {
  const ratio = 1 - elapsedMs / (timeLimitSec * 1000);
  if (ratio <= 0) return 0;
  return Math.round(ratio * 5);
}

/**
 * POST /api/competition/answer
 * Body: { code, answer }
 * Records the current participant's answer for the current question.
 * Scoring: 10 points for correct + speed bonus (max 5).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  let body: { code?: unknown; answer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const code = (typeof body.code === "string" ? body.code : "").toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "code est requis" }, { status: 400 });
  }

  const answer = typeof body.answer === "string" ? body.answer.toUpperCase() : "";
  if (!["A", "B", "C", "D"].includes(answer)) {
    return NextResponse.json({ error: "Réponse invalide" }, { status: 400 });
  }

  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Salon introuvable" }, { status: 404 });
  }
  if (room.status !== "playing") {
    return NextResponse.json(
      { error: "La compétition n'est pas en cours" },
      { status: 400 }
    );
  }

  const participant = room.participants.get(user.id);
  if (!participant) {
    return NextResponse.json(
      { error: "Vous n'êtes pas inscrit à cette compétition" },
      { status: 403 }
    );
  }
  if (participant.answeredCurrent) {
    return NextResponse.json(
      { error: "Vous avez déjà répondu à cette question" },
      { status: 400 }
    );
  }

  const currentQuestion = room.questions[room.currentIndex];
  if (!currentQuestion) {
    return NextResponse.json({ error: "Aucune question en cours" }, { status: 400 });
  }

  // Record the answer.
  participant.answers[room.currentIndex] = answer;
  participant.answeredCurrent = true;
  participant.answeredCount += 1;

  // Score the answer.
  const isCorrect = answer === currentQuestion.correctAnswer;
  if (isCorrect) {
    const elapsed = room.questionStartedAt
      ? Date.now() - room.questionStartedAt
      : 0;
    participant.score += 10 + speedBonus(elapsed, room.questionTimeLimitSec);
  }

  return NextResponse.json({
    ...serializeRoom(room, user.id),
    isCorrect,
    correctAnswer: currentQuestion.correctAnswer,
    explanation: currentQuestion.explanation,
  });
}
