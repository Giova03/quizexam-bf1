import { NextResponse } from "next/server";
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
    const body = (await request.json()) as PatchAnswerBody;
    const { userAnswer } = body;

    if (!["A", "B", "C", "D"].includes(userAnswer)) {
      return NextResponse.json(
        { error: "Invalid userAnswer value" },
        { status: 400 }
      );
    }

    // Fetch the answer to verify it belongs to the session
    const existing = await db.sessionAnswer.findUnique({
      where: { id: answerId },
    });
    if (!existing || existing.sessionId !== id) {
      return NextResponse.json(
        { error: "Answer not found in this session" },
        { status: 404 }
      );
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

    // Return the FULL session with all answers so the client can update state
    const fullSession = await db.quizSession.findUnique({
      where: { id },
      include: {
        answers: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!fullSession) {
      return NextResponse.json(
        { error: "Session not found after update" },
        { status: 404 }
      );
    }

    // Include durationMin for exam sessions
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
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
