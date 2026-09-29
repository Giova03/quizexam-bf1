import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyUserRateLimit } from "@/lib/api-rate-limit";
import { FREE_DAILY_LIMIT } from "@/lib/subscription-limits";
import { startSession } from "@/server/application/quiz/start-session";

export const dynamic = "force-dynamic";

interface CreateSessionBody {
  title: string;
  mode: "immediate" | "final";
  sourceType: "bank" | "exam";
  sourceId: string;
  /**
   * Optional explicit list of question IDs. When provided, the session is
   * created with exactly these questions (in the given order) instead of
   * loading all questions from the bank/exam referenced by sourceId.
   * Used by the daily-challenge feature to start a session with a curated
   * set of 10 questions picked across one or more banks.
   */
  questionIds?: string[];
  /**
   * Optional difficulty filter ("easy" | "medium" | "hard" | "all").
   * When set to a non-"all" value, the questions gathered from the bank
   * (or exam) are filtered to keep only those whose `difficulty` matches.
   * Ignored when `questionIds` is provided (the caller has already chosen).
   */
  difficulty?: "easy" | "medium" | "hard" | "all";
}

// GET — list sessions for the current user (with answers for dashboard).
// Kept as a direct user-scoped query (no business rules) — will move to the
// repository during the P3 route-migration sweep.
export async function GET(request: Request) {
  try {
    // E6.7 — per-user rate limiting (100 req/min).
    const limit = await applyUserRateLimit(request);
    if (!limit.allowed && limit.response) return limit.response;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const sessions = await db.quizSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        answers: {
          select: {
            id: true,
            questionText: true,
            correctAnswer: true,
            userAnswer: true,
            isCorrect: true,
            explanation: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to load sessions:", error);
    return NextResponse.json(
      { error: "Failed to load sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // E6.7 — per-user rate limiting (100 req/min).
    const limit = await applyUserRateLimit(request);
    if (!limit.allowed && limit.response) return limit.response;

    const body = (await request.json()) as CreateSessionBody;

    // Resolve the current user (anonymous sessions remain allowed, as before).
    const authSession = await getServerSession(authOptions);
    let actor: { id: string; subscription?: string } | null = null;
    if (authSession?.user?.email) {
      const user = await db.user.findUnique({
        where: { email: authSession.user.email },
        select: { id: true, subscription: true },
      });
      if (user) actor = { id: user.id, subscription: user.subscription };
    }

    // P2: business logic moved to the application layer (use case).
    const result = await startSession(
      {
        title: body.title,
        mode: body.mode,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        questionIds: body.questionIds,
        difficulty: body.difficulty,
      },
      actor,
    );

    switch (result.kind) {
      case "ok":
        return NextResponse.json(result.session);
      case "missing_fields":
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      case "invalid_mode":
        return NextResponse.json(
          { error: "Invalid mode (must be 'immediate' or 'final')" },
          { status: 400 },
        );
      case "bank_not_found":
        return NextResponse.json({ error: "Bank not found" }, { status: 404 });
      case "exam_not_found":
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      case "no_questions":
        return NextResponse.json(
          { error: "No questions available for this source" },
          { status: 400 },
        );
      case "daily_limit_reached":
        return NextResponse.json(
          {
            error:
              "Limite quotidienne atteinte (plan gratuit). Passez à Premium pour des questions illimitées.",
            code: "DAILY_LIMIT_REACHED",
            usedToday: result.usedToday,
            used: result.usedToday,
            limit: result.limit ?? FREE_DAILY_LIMIT,
            upgradeUrl: "/api/subscription",
          },
          { status: 402 },
        );
    }
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
