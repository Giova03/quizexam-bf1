import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
<<<<<<< Updated upstream
import { getUserTier } from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";

/**
 * Deterministic short hash for a certificate ID. Uses the FNV-1a 32-bit
 * algorithm — small, dependency-free, and good enough for an opaque
 * certificate ID (we also prepend the session id's last 8 chars so the
 * ID is unique per session even if two sessions score identically).
 */
function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0");
}

/**
 * GET /api/certificate?sessionId=X
 *
 * Returns the certificate data for the given completed session:
 *   { certificateId, userName, quizTitle, score, total, percentage, date, sessionId }
 *
 * Premium-only feature (free users get a 403 with code "PREMIUM_REQUIRED").
 * The session must belong to the calling user (or be anonymous — visitors
 * can still get a certificate for sessions they started anonymously on the
 * same browser, since there's no auth binding in that case).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
=======

export const dynamic = "force-dynamic";

const MIN_PERCENTAGE = 80;

/**
 * GET /api/certificate
 * Returns all certificates issued to the current user.
 *
 * Optional query: ?sessionId=xxx — returns the certificate for a specific
 * session if it exists, or null.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const cert = await db.certificate.findUnique({
        where: { sessionId },
      });
      return NextResponse.json(cert);
    }

    const certs = await db.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name },
      certificates: certs,
    });
  } catch (error) {
    console.error("[certificate] GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des certificats" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificate
 * Body: { sessionId: string }
 *
 * Issues a certificate for a completed session if:
 *  - the session belongs to the current user
 *  - the session is completed
 *  - the score percentage >= 80%
 *  - no certificate already exists for this session
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
>>>>>>> Stashed changes
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId requis" },
        { status: 400 }
      );
    }

<<<<<<< Updated upstream
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    // Freemium gate — certificates are Premium-only.
    if (userId) {
      const tier = await getUserTier(userId);
      if (tier !== "premium" && tier !== "admin") {
        return NextResponse.json(
          {
            error:
              "Les certificats sont réservés aux membres Premium. Passez à Premium pour les télécharger.",
            code: "PREMIUM_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

=======
>>>>>>> Stashed changes
    const quizSession = await db.quizSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
<<<<<<< Updated upstream
        title: true,
        score: true,
        totalQuestions: true,
        startedAt: true,
        completedAt: true,
        userId: true,
=======
        userId: true,
        title: true,
        score: true,
        totalQuestions: true,
        completedAt: true,
>>>>>>> Stashed changes
      },
    });

    if (!quizSession) {
      return NextResponse.json(
        { error: "Session introuvable" },
        { status: 404 }
      );
    }
<<<<<<< Updated upstream
=======
    if (quizSession.userId !== user.id) {
      return NextResponse.json(
        { error: "Cette session ne vous appartient pas" },
        { status: 403 }
      );
    }
>>>>>>> Stashed changes
    if (!quizSession.completedAt) {
      return NextResponse.json(
        { error: "Session non terminée" },
        { status: 400 }
      );
    }
<<<<<<< Updated upstream
    // If the session belongs to a different user, deny.
    if (quizSession.userId && quizSession.userId !== userId) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const percentage = Math.round(
      (quizSession.score / Math.max(1, quizSession.totalQuestions)) * 100
    );

    // Resolve the user's name (fallback to a generic label if anonymous).
    let userName = "Candidat anonyme";
    if (userId) {
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (u?.name) userName = u.name;
    }

    const certificateId = `QEBF-${hashId(
      sessionId + quizSession.score.toString()
    )}-${hashId(quizSession.completedAt.toISOString()).slice(0, 6)}`;

    return NextResponse.json({
      certificateId,
      userName,
      quizTitle: quizSession.title,
      score: quizSession.score,
      total: quizSession.totalQuestions,
      percentage,
      date: quizSession.completedAt.toISOString(),
      sessionId: quizSession.id,
      issuer: "QuizExam BF",
    });
  } catch (error) {
    console.error("certificate GET error:", error);
    return NextResponse.json(
      { error: "Échec de la génération du certificat" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificate
 *
 * Body: { sessionId: string }
 *
 * Generates and "issues" a certificate for the given session. In this
 * mock implementation it just returns the same payload as GET — there's
 * no separate certificate store. The client uses window.print() to
 * produce a printable PDF (no PDF library needed, per the task spec).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body?.sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId requis" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (userId) {
      const tier = await getUserTier(userId);
      if (tier !== "premium" && tier !== "admin") {
        return NextResponse.json(
          {
            error: "Premium requis pour générer un certificat.",
            code: "PREMIUM_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const quizSession = await db.quizSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        score: true,
        totalQuestions: true,
        completedAt: true,
        userId: true,
      },
    });
    if (!quizSession?.completedAt) {
      return NextResponse.json(
        { error: "Session introuvable ou non terminée" },
        { status: 404 }
      );
    }
    if (quizSession.userId && quizSession.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const percentage = Math.round(
      (quizSession.score / Math.max(1, quizSession.totalQuestions)) * 100
    );
    if (percentage < 80) {
      return NextResponse.json(
        {
          error:
            "Score insuffisant pour un certificat (minimum 80%).",
          code: "SCORE_TOO_LOW",
          percentage,
=======

    const percentage =
      quizSession.totalQuestions > 0
        ? Math.round(
            (quizSession.score / quizSession.totalQuestions) * 100
          )
        : 0;

    if (percentage < MIN_PERCENTAGE) {
      return NextResponse.json(
        {
          error: `Score insuffisant pour un certificat (${percentage}% < ${MIN_PERCENTAGE}%)`,
          percentage,
          required: MIN_PERCENTAGE,
>>>>>>> Stashed changes
        },
        { status: 400 }
      );
    }

<<<<<<< Updated upstream
    let userName = "Candidat anonyme";
    if (userId) {
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (u?.name) userName = u.name;
    }

    const certificateId = `QEBF-${hashId(
      sessionId + quizSession.score.toString()
    )}-${hashId(quizSession.completedAt.toISOString()).slice(0, 6)}`;

    return NextResponse.json({
      success: true,
      certificateId,
      userName,
      quizTitle: quizSession.title,
      score: quizSession.score,
      total: quizSession.totalQuestions,
      percentage,
      date: quizSession.completedAt.toISOString(),
      sessionId: quizSession.id,
      issuer: "QuizExam BF",
    });
  } catch (error) {
    console.error("certificate POST error:", error);
    return NextResponse.json(
      { error: "Échec de la génération du certificat" },
=======
    // Check if a certificate already exists for this session
    const existing = await db.certificate.findUnique({
      where: { sessionId },
    });
    if (existing) {
      return NextResponse.json(existing);
    }

    const cert = await db.certificate.create({
      data: {
        userId: user.id,
        sessionId,
        title: quizSession.title,
        score: quizSession.score,
        totalQuestions: quizSession.totalQuestions,
        percentage,
      },
    });

    return NextResponse.json(cert);
  } catch (error) {
    console.error("[certificate] POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la délivrance du certificat" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
