import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applySm2, type SpacedCard } from "@/lib/spaced-repetition-store";

/**
 * GET /api/spaced-repetition?ids=id1,id2,...
 *
 * Returns the full question rows for the supplied IDs, preserving the order in
 * which the IDs were provided. Used by the spaced-repetition client to load the
 * cards that are due for review today.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") ?? "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ questions: [], dueCount: 0 });
    }

    const questions = await db.question.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        bankId: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        correctAnswer2: true,
        explanation: true,
        difficulty: true,
        bank: { select: { id: true, title: true, color: true, icon: true } },
      },
    });

    // Preserve the order of the incoming IDs (so client ordering is kept).
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));

    return NextResponse.json({
      questions: ordered,
      dueCount: ordered.length,
    });
  } catch (error) {
    console.error("Failed to load spaced-repetition cards:", error);
    return NextResponse.json(
      { error: "Failed to load spaced-repetition cards" },
      { status: 500 }
    );
  }
}

interface ReviewBody {
  questionId: string;
  quality: number;
  /** Optional card state (for stateless callers). If omitted, the server
   *  assumes defaults for a brand-new card. */
  card?: SpacedCard;
}

/**
 * POST /api/spaced-repetition
 * Body: { questionId: string, quality: 0-5, card?: SpacedCard }
 *
 * Records a review by applying the SM-2 algorithm to the supplied card state
 * (or to a fresh card if none is provided). Returns the updated SpacedCard so
 * callers that prefer server-side computation can persist it themselves.
 *
 * NOTE: The primary client (the spaced-repetition view) performs the SM-2
 * update locally in the Zustand store; this endpoint exists for symmetry,
 * external integrations and future server-side persistence.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ReviewBody;
    const { questionId, quality } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId requis" },
        { status: 400 }
      );
    }

    if (
      typeof quality !== "number" ||
      quality < 0 ||
      quality > 5 ||
      !Number.isInteger(quality)
    ) {
      return NextResponse.json(
        { error: "quality doit être un entier entre 0 et 5" },
        { status: 400 }
      );
    }

    // Pull the question (mainly to validate it exists).
    const question = await db.question.findUnique({
      where: { id: questionId },
      select: { id: true, bankId: true },
    });
    if (!question) {
      return NextResponse.json(
        { error: "Question introuvable" },
        { status: 404 }
      );
    }

    // Apply SM-2 either to a supplied card or to a fresh one.
    const base: SpacedCard = body.card ?? {
      questionId,
      bankId: question.bankId,
      ease: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: new Date().toISOString(),
      lastReview: null,
    };

    const updated = applySm2(base, quality);

    return NextResponse.json({
      success: true,
      questionId,
      quality,
      card: updated,
    });
  } catch (error) {
    console.error("Failed to record spaced-repetition review:", error);
    return NextResponse.json(
      { error: "Failed to record review" },
      { status: 500 }
    );
  }
}
