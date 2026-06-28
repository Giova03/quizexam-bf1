import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
<<<<<<< Updated upstream
  createRoom,
  generateUniqueRoomCode,
  getRoom,
  pickRandom,
  serializeRoom,
  type CompetitionQuestion,
  type CompetitionRoom,
  type Participant,
} from "@/lib/competition-store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as { id?: string; name?: string | null; email?: string | null };
  return {
    id: user.id ?? "anonymous",
    name: user.name ?? user.email ?? "Anonyme",
  };
}

/** Clamp a number to [min, max] (defaulting to fallback on invalid input). */
function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * POST /api/competition
 * Body: { bankId, questionCount?, timeLimitSec? }
 *
 * Creates a new competition room:
 *   - Loads the bank and its questions from the DB.
 *   - Picks `questionCount` random questions (Fisher-Yates partial shuffle).
 *   - Generates a unique 6-char room code.
 *   - Creates the room in "lobby" status with the host as the first participant.
 *
 * Returns the serialised room state (with the host's view).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise" },
      { status: 401 }
    );
  }

  let body: {
    bankId?: unknown;
    questionCount?: unknown;
    timeLimitSec?: unknown;
    action?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide (JSON attendu)" },
      { status: 400 }
    );
  }

  // Accept either { bankId } or { action: "create", bankId } for backwards
  // compatibility with the documented curl test.
  const bankId =
    typeof body.bankId === "string" && body.bankId.trim().length > 0
      ? body.bankId.trim()
      : "";

  if (!bankId) {
    return NextResponse.json(
      { error: "bankId est requis" },
      { status: 400 }
    );
  }

  const questionCount = clampNumber(body.questionCount, 1, 50, 10);
  const timeLimitSec = clampNumber(body.timeLimitSec, 5, 300, 30);

  // Load the bank and its questions.
  const bank = await db.questionBank.findUnique({
    where: { id: bankId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          question: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctAnswer: true,
          explanation: true,
        },
      },
    },
  });

  if (!bank) {
    return NextResponse.json(
      { error: "Banque introuvable" },
      { status: 404 }
    );
  }

  if (bank.questions.length === 0) {
    return NextResponse.json(
      { error: "Cette banque ne contient aucune question" },
      { status: 400 }
    );
  }

  // Pick `questionCount` random questions (cap at bank size).
  const picked = pickRandom(bank.questions, questionCount);
  const competitionQuestions: CompetitionQuestion[] = picked.map((q) => ({
    id: q.id,
    question: q.question,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  }));

  const code = generateUniqueRoomCode();

  const hostParticipant: Participant = {
    id: user.id,
    name: user.name,
    score: 0,
    answeredCount: 0,
    answers: {},
    answeredCurrent: false,
    joinedAt: Date.now(),
  };

  const room: CompetitionRoom = {
    code,
    hostId: user.id,
    hostName: user.name,
    bankId: bank.id,
    bankTitle: bank.title,
    questions: competitionQuestions,
    currentIndex: 0,
    status: "lobby",
    participants: new Map([[user.id, hostParticipant]]),
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    questionStartedAt: null,
    questionTimeLimitSec: timeLimitSec,
    finalLeaderboard: null,
  };

  createRoom(room);

  return NextResponse.json(serializeRoom(room, user.id));
}

/**
 * GET /api/competition?code=XXXXXX
 *
 * Returns the serialised room state for polling clients. Includes an
 * auto-advance safety-net: if the per-question time limit has elapsed
 * during "playing" status, the host's absence is bypassed by advancing
 * to the next question (or finishing the game) so participants aren't
 * stuck waiting forever.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").toUpperCase();

  if (!code) {
    return NextResponse.json(
      { error: "code est requis" },
      { status: 400 }
    );
  }

  const room = getRoom(code);
  if (!room) {
    return NextResponse.json(
      { error: "Salon introuvable" },
      { status: 404 }
    );
  }

  // Safety-net: if the question time limit has elapsed and the host hasn't
  // advanced, auto-advance so the game keeps moving. This is a fallback
  // (the host normally advances explicitly via /api/competition/next).
  if (
    room.status === "playing" &&
    room.questionStartedAt !== null &&
    room.questionTimeLimitSec > 0
  ) {
    const elapsedSec = (Date.now() - room.questionStartedAt) / 1000;
    if (elapsedSec > room.questionTimeLimitSec + 2) {
      const nextIndex = room.currentIndex + 1;
      if (nextIndex >= room.questions.length) {
        room.status = "finished";
        room.questionStartedAt = null;
        room.finalLeaderboard = Array.from(room.participants.values()).sort(
          (a, b) => b.score - a.score
        );
      } else {
        room.currentIndex = nextIndex;
        room.questionStartedAt = Date.now();
        for (const p of room.participants.values()) {
          p.answeredCurrent = false;
        }
      }
    }
  }

  return NextResponse.json(serializeRoom(room, user.id));
=======
  competitionStore,
  generateRoomCode,
  pickRandomQuestions,
  type CompetitionQuestion,
} from "@/lib/competition-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/competition — crée une nouvelle room.
 * Corps : { bankId, hostId, hostName, questionCount?, durationSec? }
 *
 * GET  /api/competition?code=XXXX — renvoie l'état public d'une room.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get("code") ?? "").toUpperCase().trim();
    if (!code) {
      return NextResponse.json(
        { error: "Paramètre 'code' requis" },
        { status: 400 }
      );
    }
    const room = competitionStore.getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "Room introuvable" },
        { status: 404 }
      );
    }
    // Vue publique : on expose les participants et la question courante,
    // mais PAS la bonne réponse tant que la phase n'est pas terminée.
    const currentQ = room.questions[room.currentQuestionIdx];
    return NextResponse.json({
      code: room.code,
      phase: room.phase,
      bankTitle: room.bankTitle,
      hostName: room.hostName,
      currentQuestionIdx: room.currentQuestionIdx,
      totalQuestions: room.questions.length,
      questionDurationSec: room.questionDurationSec,
      questionStartedAt: room.questionStartedAt,
      currentQuestion: currentQ
        ? {
            id: currentQ.id,
            question: currentQ.question,
            optionA: currentQ.optionA,
            optionB: currentQ.optionB,
            optionC: currentQ.optionC,
            optionD: currentQ.optionD,
            // On ne renvoie jamais correctAnswer côté serveur pendant la phase "playing"
          }
        : null,
      participants: Object.values(room.participants)
        .map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          answeredCurrent: p.answeredCurrent,
          lastAnswerCorrect: p.lastAnswerCorrect,
        }))
        .sort((a, b) => b.score - a.score),
    });
  } catch (error) {
    console.error("Failed to fetch competition room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

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

    const body = (await request.json()) as {
      bankId?: string;
      questionCount?: number;
      durationSec?: number;
    };

    if (!body.bankId) {
      return NextResponse.json({ error: "bankId requis" }, { status: 400 });
    }

    const bank = await db.questionBank.findUnique({
      where: { id: body.bankId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!bank) {
      return NextResponse.json({ error: "Banque introuvable" }, { status: 404 });
    }
    if (bank.questions.length === 0) {
      return NextResponse.json(
        { error: "Cette banque ne contient aucune question" },
        { status: 400 }
      );
    }

    const count = Math.min(
      Math.max(5, body.questionCount ?? 10),
      Math.min(30, bank.questions.length)
    );
    const picked = pickRandomQuestions(bank.questions, count);

    const questions: CompetitionQuestion[] = picked.map((q) => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));

    const code = generateRoomCode();
    const room = competitionStore.createRoom({
      code,
      hostId: user.id,
      hostName: user.name,
      bankId: bank.id,
      bankTitle: bank.title,
      questions,
      questionDurationSec: body.durationSec ?? 30,
    });

    // Démarre immédiatement la première question
    room.phase = "playing";
    room.currentQuestionIdx = 0;
    room.questionStartedAt = Date.now();

    return NextResponse.json({
      code: room.code,
      phase: room.phase,
      bankTitle: room.bankTitle,
      hostName: room.hostName,
      currentQuestionIdx: room.currentQuestionIdx,
      totalQuestions: room.questions.length,
      questionDurationSec: room.questionDurationSec,
      questionStartedAt: room.questionStartedAt,
      isHost: true,
      hostId: user.id,
    });
  } catch (error) {
    console.error("Failed to create competition room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
>>>>>>> Stashed changes
}
