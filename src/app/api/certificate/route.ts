import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier } from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";

function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (userId) {
      const tier = await getUserTier(userId);
      if (tier !== "premium" && tier !== "admin") {
        return NextResponse.json(
          { error: "Les certificats sont réservés aux membres Premium.", code: "PREMIUM_REQUIRED" },
          { status: 403 }
        );
      }
    }

    const quizSession = await db.quizSession.findUnique({
      where: { id: sessionId },
      select: { id: true, title: true, score: true, totalQuestions: true, completedAt: true, userId: true },
    });

    if (!quizSession) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }
    if (!quizSession.completedAt) {
      return NextResponse.json({ error: "Session non terminée" }, { status: 400 });
    }
    if (quizSession.userId && quizSession.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const percentage = Math.round((quizSession.score / Math.max(1, quizSession.totalQuestions)) * 100);

    let userName = "Candidat anonyme";
    if (userId) {
      const u = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
      if (u?.name) userName = u.name;
    }

    const certificateId = `QEBF-${hashId(sessionId + quizSession.score.toString())}-${hashId(quizSession.completedAt.toISOString()).slice(0, 6)}`;

    return NextResponse.json({
      certificateId, userName, quizTitle: quizSession.title, score: quizSession.score,
      total: quizSession.totalQuestions, percentage, date: quizSession.completedAt.toISOString(),
      sessionId: quizSession.id, issuer: "QuizExam BF",
    });
  } catch (error) {
    console.error("certificate GET error:", error);
    return NextResponse.json({ error: "Échec de la génération du certificat" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body?.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (userId) {
      const tier = await getUserTier(userId);
      if (tier !== "premium" && tier !== "admin") {
        return NextResponse.json(
          { error: "Premium requis pour générer un certificat.", code: "PREMIUM_REQUIRED" },
          { status: 403 }
        );
      }
    }

    const quizSession = await db.quizSession.findUnique({
      where: { id: sessionId },
      select: { id: true, title: true, score: true, totalQuestions: true, completedAt: true, userId: true },
    });

    if (!quizSession?.completedAt) {
      return NextResponse.json({ error: "Session introuvable ou non terminée" }, { status: 404 });
    }
    if (quizSession.userId && quizSession.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const percentage = Math.round((quizSession.score / Math.max(1, quizSession.totalQuestions)) * 100);
    if (percentage < 80) {
      return NextResponse.json(
        { error: "Score insuffisant pour un certificat (minimum 80%).", code: "SCORE_TOO_LOW", percentage },
        { status: 400 }
      );
    }

    let userName = "Candidat anonyme";
    if (userId) {
      const u = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
      if (u?.name) userName = u.name;
    }

    const certificateId = `QEBF-${hashId(sessionId + quizSession.score.toString())}-${hashId(quizSession.completedAt.toISOString()).slice(0, 6)}`;

    return NextResponse.json({
      success: true, certificateId, userName, quizTitle: quizSession.title, score: quizSession.score,
      total: quizSession.totalQuestions, percentage, date: quizSession.completedAt.toISOString(),
      sessionId: quizSession.id, issuer: "QuizExam BF",
    });
  } catch (error) {
    console.error("certificate POST error:", error);
    return NextResponse.json({ error: "Échec de la génération du certificat" }, { status: 500 });
  }
}
