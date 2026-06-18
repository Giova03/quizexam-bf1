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

    const updated = await db.sessionAnswer.update({
      where: { id: answerId },
      data: {
        userAnswer,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to submit answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
