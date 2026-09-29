import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const session = await db.quizSession.findUnique({
      where: { id },
      include: { answers: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // P0: Ownership check
    if (session.userId && session.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // P0: Prevent double-completion
    if (session.completedAt) {
      return NextResponse.json({ error: "Session déjà terminée" }, { status: 400 });
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
    return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
  }
}
