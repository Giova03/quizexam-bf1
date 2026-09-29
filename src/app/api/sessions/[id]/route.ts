import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
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
      include: {
        answers: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // P0: Ownership check — only the session owner or an admin can view it
    if (session.userId && session.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // For exam-backed sessions, surface the exam's durationMin
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
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
