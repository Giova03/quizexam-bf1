import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchAnswerBody {
  userAnswer: "A" | "B" | "C" | "D";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  try {
    const { id, answerId } = await params;

    // P0: Authentication required
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: authSession.user.email },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // P0: Verify session ownership
    const quizSession = await db.quizSession.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!quizSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (quizSession.userId && quizSession.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = (await request.json()) as PatchAnswerBody;
    const { userAnswer } = body;

    if (!["A", "B", "C", "D"].includes(userAnswer)) {
      return NextResponse.json({ error: "Invalid userAnswer value" }, { status: 400 });
    }

    // Verify the answer belongs to this session
    const existing = await db.sessionAnswer.findUnique({
      where: { id: answerId },
    });
    if (!existing || existing.sessionId !== id) {
      return NextResponse.json({ error: "Answer not found in this session" }, { status: 404 });
    }

    const isCorrect = existing.correctAnswer === userAnswer;

    await db.sessionAnswer.update({
      where: { id: answerId },
      data: {
        userAnswer,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    // Return the FULL session with all answers
    const fullSession = await db.quizSession.findUnique({
      where: { id },
      include: {
        answers: { orderBy: { id: "asc" } },
      },
    });

    if (!fullSession) {
      return NextResponse.json({ error: "Session not found after update" }, { status: 404 });
    }

    let durationMin: number | null = null;
    if (fullSession.sourceType === "exam") {
      const exam = await db.exam.findUnique({
        where: { id: fullSession.sourceId },
        select: { durationMin: true },
      });
      durationMin = exam?.durationMin ?? null;
    }

    return NextResponse.json({ ...fullSession, durationMin });
  } catch (error) {
    console.error("Failed to submit answer:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
