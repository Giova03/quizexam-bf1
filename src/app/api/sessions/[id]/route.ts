import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await db.quizSession.findUnique({
      where: { id },
      include: {
        answers: {
          orderBy: { id: "asc" },
        },
      },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // For exam-backed sessions, surface the exam's durationMin so the
    // client can display a strict countdown timer (Mode Examen
    // Chronométré). For bank sessions, durationMin stays null.
    let durationMin: number | null = null;
    if (session.sourceType === "exam") {
      const exam = await db.exam.findUnique({
        where: { id: session.sourceId },
        select: { durationMin: true },
      });
      durationMin = exam?.durationMin ?? null;
    }

    return NextResponse.json({ ...session, durationMin });
  } catch (error) {
    console.error("Failed to load session:", error);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 }
    );
  }
}
