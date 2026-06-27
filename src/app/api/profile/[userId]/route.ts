import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/[userId]
 * Public profile of any user. Returns limited data:
 *   - id, name, role, bio, establishment, createdAt
 *   - avatar (initial — derived from the name)
 *   - badges: the user's unlocked badges. Since XP/badges are tracked
 *     client-side per browser (zustand + localStorage), the public profile
 *     only includes badges the user explicitly published — for now, we
 *     return an empty array (the client can fall back to its own badge
 *     list if it's the current user). This keeps private state private.
 *   - stats: sessions completed, avg score, total questions answered,
 *     derived from QuizSession (server-side, so authoritative).
 *   - recentActivity: last 10 completed sessions (title + score + date).
 *
 * No email, no private fields, no referral info is exposed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        bio: true,
        establishment: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Compute public stats from completed sessions.
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

    // Compute the user's rank vs. all other users (based on total correct
    // answers — same metric used by /api/leaderboard for "xp").
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
      role: user.role,
      bio: user.bio ?? "",
      establishment: user.establishment ?? "",
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
      badges: [], // Public badges are not stored server-side; client falls back.
      recentActivity,
    });
  } catch (error) {
    console.error("Public profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile/[userId]
 * Update the public profile fields (bio, establishment) of the *current* user.
 *
 * The route is keyed by [userId] for consistency, but the body is only
 * applied if `userId` matches the authenticated user's id — or if the
 * requester is an admin. This prevents users from editing each other's
 * profiles while still allowing a single endpoint for the edit dialog.
 *
 * Body: { bio?, establishment?, name? }
 *   - bio:           free-form text, max 500 chars
 *   - establishment: free-form text, max 200 chars
 *   - name:          display name, max 100 chars
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const currentUserId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    const { userId } = await params;
    const isSelf = currentUserId === userId;
    const isAdmin = role === "ADMIN";
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que votre propre profil" },
        { status: 403 }
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
    console.error("Public profile PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
