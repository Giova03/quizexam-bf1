import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
<<<<<<< Updated upstream
import { applySm2, type SpacedCard } from "@/lib/spaced-repetition-store";
=======
>>>>>>> Stashed changes

export const dynamic = "force-dynamic";

/**
<<<<<<< Updated upstream
 * GET /api/spaced-repetition?ids=q1,q2,q3
 *
 * Returns the full question data for the given IDs. The client tracks which
 * cards are due (via the Zustand persisted store in localStorage) and sends
 * the list of due question IDs here. The server looks them up and returns
 * the question text, options, correct answer and explanation so the client
 * can render the flashcard review interface.
 *
 * If no IDs are provided, an empty array is returned.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

=======
 * API pour la révision espacée.
 *
 * GET  ?ids=q1,q2,q3  → renvoie les données complètes des questions dont les
 *                       IDs sont fournis (le client filtre ensuite les cartes
 *                       dues via le store Zustand).
 *
 * POST { questionId, quality, bankId }
 *                       → enregistre une révision côté serveur (journal
 *                       d'audit) et renvoie l'ACK. Le scheduling réel est
 *                       calculé côté client par le store SM-2.
 */

export async function GET(request: Request) {
  try {
>>>>>>> Stashed changes
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") ?? "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
<<<<<<< Updated upstream
      return NextResponse.json({ questions: [], dueCount: 0 });
    }

    const questions = await db.question.findMany({
      where: { id: { in: ids } },
=======
      return NextResponse.json({ questions: [] });
    }

    // Limite pour éviter les abus
    const safeIds = ids.slice(0, 200);

    const questions = await db.question.findMany({
      where: { id: { in: safeIds } },
>>>>>>> Stashed changes
      select: {
        id: true,
        bankId: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
<<<<<<< Updated upstream
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
=======
        explanation: true,
        difficulty: true,
        bank: {
          select: { id: true, title: true, color: true, icon: true },
        },
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Failed to load spaced-repetition questions:", error);
    return NextResponse.json(
      { error: "Failed to load spaced-repetition questions" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}

<<<<<<< Updated upstream
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
=======
export async function POST(request: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = (await request.json()) as {
      questionId?: string;
      quality?: number;
      bankId?: string;
    };

    if (!body.questionId || typeof body.quality !== "number") {
      return NextResponse.json(
        { error: "questionId et quality sont requis" },
>>>>>>> Stashed changes
        { status: 400 }
      );
    }

<<<<<<< Updated upstream
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
=======
    // Validation : la question doit exister
    const question = await db.question.findUnique({
      where: { id: body.questionId },
      select: { id: true, bankId: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Question introuvable" }, { status: 404 });
    }

    // Le scheduling est calculé côté client (store SM-2) car il est persisté
    // dans localStorage. L'API se contente de valider l'existence de la
    // question et de renvoyer un ACK. On pourrait à l'avenir loguer ces
    // révisions dans une table dédiée pour analyse.

    return NextResponse.json({
      ok: true,
      questionId: body.questionId,
      quality: Math.max(0, Math.min(5, Math.floor(body.quality))),
      recordedAt: new Date().toISOString(),
>>>>>>> Stashed changes
    });
  } catch (error) {
    console.error("Failed to record spaced-repetition review:", error);
    return NextResponse.json(
      { error: "Failed to record review" },
      { status: 500 }
    );
  }
}
