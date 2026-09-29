import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitAnswer, PermissionError } from "@/server/application/quiz/submit-answer";

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

    const body = (await request.json()) as PatchAnswerBody;

    // P2: business logic moved to the application layer (use case).
    // Bonus fix: correctness now handles dual-answer questions (correctAnswer2)
    // via the quiz domain's checkAnswer.
    const result = await submitAnswer(id, answerId, { id: user.id, role: user.role }, body.userAnswer);

    switch (result.kind) {
      case "ok":
        return NextResponse.json({
          ...result.session,
          durationMin: result.durationMin,
        });
      case "invalid_answer":
        return NextResponse.json({ error: "Invalid userAnswer value" }, { status: 400 });
      case "session_completed":
        // P3 strict state machine: completed sessions are frozen. 409 tells
        // the client the resource is in a state that forbids this change.
        return NextResponse.json(
          { error: "Session déjà terminée" },
          { status: 409 },
        );
      case "session_not_found":
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      case "answer_not_found":
        return NextResponse.json(
          { error: "Answer not found in this session" },
          { status: 404 },
        );
    }
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("Failed to submit answer:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
