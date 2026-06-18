import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.quizSession.findUnique({
      where: { id },
      include: { answers: true },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Compute the final score
    const correctCount = session.answers.filter(
      (a) => a.isCorrect === true
    ).length;

    const updated = await db.quizSession.update({
      where: { id },
      data: {
        score: correctCount,
        completedAt: new Date(),
      },
      include: { answers: { orderBy: { id: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to complete session:", error);
    return NextResponse.json(
      { error: "Failed to complete session" },
      { status: 500 }
    );
  }
}
