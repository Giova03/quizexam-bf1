import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/me
 * Returns the current user's profile, including private fields (email,
 * referral code, referredBy) that the public endpoint hides.
 *
 * Also computes the user's stats server-side (sessions completed, avg score,
 * total questions, rank).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        establishment: true,
        referralCode: true,
        referredBy: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const sessions = await db.quizSession.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        title: true,
        score: true,
        totalQuestions: true,
        startedAt: true,
        completedAt: true,
        sourceType: true,
      },
    });

    const totalSessions = sessions.length;
    const totalCorrect = sessions.reduce((sum, s) => sum + s.score, 0);
    const totalQuestions = sessions.reduce(
      (sum, s) => sum + s.totalQuestions,
      0
    );
    const avgScore =
      totalSessions > 0
        ? Math.round(
            sessions.reduce(
              (sum, s) =>
                sum + (s.score / Math.max(1, s.totalQuestions)) * 100,
              0
            ) / totalSessions
          )
        : 0;

    // Rank among all users (same metric as the public profile + leaderboard).
    const allSessions = await db.quizSession.findMany({
      where: { completedAt: { not: null } },
      select: { score: true, userId: true },
    });
    const userMap: Record<string, number> = {};
    for (const s of allSessions) {
      const uid = s.userId ?? "anon";
      userMap[uid] = (userMap[uid] ?? 0) + s.score;
    }
    const ranked = Object.entries(userMap).sort((a, b) => b[1] - a[1]);
    const rank = ranked.findIndex(([uid]) => uid === user.id) + 1;
    const totalUsers = ranked.length;

    const recentActivity = sessions.slice(0, 10).map((s) => ({
      id: s.id,
      title: s.title,
      sourceType: s.sourceType,
      score: s.score,
      total: s.totalQuestions,
      pct: Math.round((s.score / Math.max(1, s.totalQuestions)) * 100),
      completedAt: s.completedAt,
    }));

    const initial = (user.name ?? "?").charAt(0).toUpperCase();

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio ?? "",
      establishment: user.establishment ?? "",
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      createdAt: user.createdAt,
      avatar: { initial },
      stats: {
        totalSessions,
        avgScore,
        totalCorrect,
        totalQuestions,
        rank: rank > 0 ? rank : totalUsers,
        totalUsers,
      },
      badges: [],
      recentActivity,
    });
  } catch (error) {
    console.error("Profile/me GET error:", error);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile/me
 * Update the current user's profile (bio, establishment, name).
 * Equivalent to PATCH /api/profile/[userId] but keyed on the session,
 * so callers don't need to know their own id.
 *
 * Body: { bio?, establishment?, name? }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data: Record<string, string> = {};

    if (typeof body.bio === "string") {
      const bio = body.bio.trim();
      if (bio.length > 500) {
        return NextResponse.json(
          { error: "La bio est trop longue (500 caractères max)" },
          { status: 400 }
        );
      }
      data.bio = bio;
    }
    if (typeof body.establishment === "string") {
      const establishment = body.establishment.trim();
      if (establishment.length > 200) {
        return NextResponse.json(
          { error: "L'établissement est trop long (200 caractères max)" },
          { status: 400 }
        );
      }
      data.establishment = establishment;
    }
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Le nom ne peut pas être vide" },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: "Le nom est trop long (100 caractères max)" },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Aucun champ à mettre à jour" },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        establishment: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Profile/me PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
