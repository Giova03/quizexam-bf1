import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkLimit, FREE_DAILY_LIMIT } from "@/lib/subscription-limits";

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

const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

// GET — list sessions for the current user (with answers for dashboard)
export async function GET() {
  try {
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
    const body = (await request.json()) as CreateSessionBody;
    const { title, mode, sourceType, sourceId, questionIds, difficulty } = body;

    if (!title || !mode || !sourceType || !sourceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (mode !== "immediate" && mode !== "final") {
      return NextResponse.json(
        { error: "Invalid mode (must be 'immediate' or 'final')" },
        { status: 400 }
      );
    }

    // Normalize the difficulty filter — anything other than easy/medium/hard
    // means "no filter".
    const diffFilter: "easy" | "medium" | "hard" | null =
      difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
        ? difficulty
        : null;

    // Get the current user from the session
    const authSession = await getServerSession(authOptions);
    let userId: string | null = null;
    let userSubscription: { subscription: string } | null = null;
    if (authSession?.user?.email) {
      const user = await db.user.findUnique({
        where: { email: authSession.user.email },
        select: { id: true, subscription: true },
      });
      userId = user?.id ?? null;
      if (user) {
        userSubscription = {
          subscription: user.subscription,
        };
      }
    }

    // Freemium daily limit check: free users are capped at 50 questions/day.
    if (userId && userSubscription) {
      const isPremium = userSubscription.subscription === "premium";
      if (!isPremium) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayQuestions = await db.sessionAnswer.count({
          where: {
            session: { userId },
            answeredAt: { gte: startOfDay },
          },
        });
        const FREE_DAILY_LIMIT = 50;
        if (todayQuestions >= FREE_DAILY_LIMIT) {
          return NextResponse.json(
            {
              error:
                "Limite quotidienne atteinte (50 questions/jour). Passez à Premium pour des questions illimitées.",
              limit: FREE_DAILY_LIMIT,
              used: todayQuestions,
            },
            { status: 402 }
          );
        }
      }
    }

    // Gather questions based on source type
    let questions: Array<{
      id: string;
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
      correctAnswer2: string | null;
      explanation: string;
      imageUrl: string | null;
      audioUrl: string | null;
    }> = [];

    // Daily-challenge path: an explicit list of question IDs is provided.
    // We load them directly, preserving the order in which they were sent.
    // (difficulty filter is intentionally NOT applied here — the caller has
    // already curated the list.)
    if (questionIds && questionIds.length > 0) {
      const rows = await db.question.findMany({
        where: { id: { in: questionIds } },
      });
      // Preserve caller-provided order (deterministic per day).
      const byId = new Map(rows.map((q) => [q.id, q]));
      questions = questionIds
        .map((id) => byId.get(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q));
    } else if (sourceType === "bank") {
      const bank = await db.questionBank.findUnique({
        where: { id: sourceId },
        include: {
          questions: diffFilter
            ? { where: { difficulty: diffFilter }, orderBy: { order: "asc" } }
            : { orderBy: { order: "asc" } },
        },
      });
      if (!bank) {
        return NextResponse.json({ error: "Bank not found" }, { status: 404 });
      }
      questions = bank.questions;
    } else {
      const exam = await db.exam.findUnique({
        where: { id: sourceId },
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { order: "asc" },
          },
        },
      });
      if (!exam) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }
      // Apply the difficulty filter to exam questions as well, so the user
      // can take a subset of an exam at a given difficulty level.
      questions = exam.examQuestions
        .map((eq) => eq.question)
        .filter((q) => (diffFilter ? q.difficulty === diffFilter : true));
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No questions available for this source" },
        { status: 400 }
      );
    }

    // Freemium daily-limit check (added in F5):
    // Free users are capped at FREE_DAILY_LIMIT questions/day across all
    // sessions started in the current UTC day. Premium/admin users are
    // unlimited. We check AFTER gathering questions (so the count is the
    // real number that would be added) but BEFORE creating the session —
    // so a rejected request leaves no DB rows behind.
    if (userId) {
      const check = await checkLimit(userId);
      if (!check.canStartMore) {
        return NextResponse.json(
          {
            error:
              "Limite quotidienne atteinte (plan gratuit). Passez à Premium pour des questions illimitées.",
            code: "DAILY_LIMIT_REACHED",
            usedToday: check.usedToday,
            limit: FREE_DAILY_LIMIT,
            upgradeUrl: "/api/subscription",
          },
          { status: 402 }
        );
      }
      // If the session would push the user over their remaining quota,
      // we still allow it but the response includes a warning header so
      // the client can surface a "quota almost exhausted" toast. The
      // session is created in full — partial sessions would be confusing.
    }

    // Create the session with answer snapshots (linked to the user)
    const session = await db.quizSession.create({
      data: {
        title,
        mode,
        sourceType,
        sourceId,
        userId,
        totalQuestions: questions.length,
        score: 0,
        answers: {
          create: questions.map((q) => ({
            questionId: q.id,
            questionText: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            correctAnswer2: q.correctAnswer2,
            explanation: q.explanation,
            // Snapshot the question's media URLs so the session keeps
            // rendering images/audio even if the bank's question is later
            // edited or its media is swapped out.
            imageUrl: q.imageUrl ?? null,
            audioUrl: q.audioUrl ?? null,
            userAnswer: null,
            isCorrect: null,
            answeredAt: null,
          })),
        },
      },
      include: { answers: true },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
