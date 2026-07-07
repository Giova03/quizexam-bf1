import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Mentorship API (added in E5).
 *
 * Storage strategy (no schema change):
 *   Each mentorship request is stored as a Post row with type=
 *   "mentorship-request".
 *   - Post.authorId  = the mentee (the user who requested the mentor).
 *   - Post.content   = an optional message from the mentee.
 *   - Post.tags      = `mentor:<mentorId>,status:<pending|accepted|declined>`
 *
 * Mentor discovery:
 *   Admins are always mentors. We also surface the top 10 users by XP
 *   (computed from completed QuizSessions — same formula as the
 *   leaderboard: totalCorrect * 10 + sessionCount * 5).
 */

interface MentorRow {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  establishment: string | null;
  xp: number;
  sessionCount: number;
  avgPct: number;
  isMentor: boolean; // true if ADMIN or top-XP
}

interface MentorshipRequestRow {
  id: string;
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  status: "pending" | "accepted" | "declined";
  message: string;
  createdAt: string;
}

function parseMentorId(tags: string): string | null {
  const m = tags.match(/mentor:([^\s,]+)/);
  return m ? m[1] : null;
}

function parseStatus(tags: string): "pending" | "accepted" | "declined" {
  const m = tags.match(/status:([^\s,]+)/);
  if (m && (m[1] === "accepted" || m[1] === "declined")) return m[1];
  return "pending";
}

function buildTags(mentorId: string, status: string): string {
  return `mentor:${mentorId},status:${status}`;
}

async function computeXpMap(): Promise<
  Map<string, { xp: number; sessionCount: number; avgPct: number; totalCorrect: number }>
> {
  const sessions = await db.quizSession.findMany({
    where: { completedAt: { not: null }, userId: { not: null } },
    select: {
      userId: true,
      score: true,
      totalQuestions: true,
    },
  });
  const map = new Map<
    string,
    { xp: number; sessionCount: number; totalCorrect: number; totalPct: number }
  >();
  for (const s of sessions) {
    if (!s.userId) continue;
    const entry = map.get(s.userId) ?? {
      xp: 0,
      sessionCount: 0,
      totalCorrect: 0,
      totalPct: 0,
    };
    entry.sessionCount += 1;
    entry.totalCorrect += s.score;
    entry.totalPct += (s.score / Math.max(1, s.totalQuestions)) * 100;
    entry.xp = entry.totalCorrect * 10 + entry.sessionCount * 5;
    map.set(s.userId, entry);
  }
  // Finalise — compute avgPct.
  const out = new Map<string, { xp: number; sessionCount: number; avgPct: number; totalCorrect: number }>();
  for (const [uid, e] of map.entries()) {
    out.set(uid, {
      xp: e.xp,
      sessionCount: e.sessionCount,
      avgPct: e.sessionCount > 0 ? Math.round(e.totalPct / e.sessionCount) : 0,
      totalCorrect: e.totalCorrect,
    });
  }
  return out;
}

/**
 * GET /api/mentorship
 * Returns:
 *   - mentors: list of users eligible to be mentors (ADMIN + top-10 by XP).
 *   - myRequests: requests I sent (as a mentee), with status.
 *   - incomingRequests: requests I received (as a mentor), pending ones first.
 *   - myMentor: my currently-accepted mentor (or null).
 *   - myMentees: my currently-accepted mentees.
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
    const meId = (session.user as { id?: string }).id;
    if (!meId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    // --- 1. Build the mentor list -------------------------------------
    const xpMap = await computeXpMap();

    // Admins are always mentors.
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        role: true,
        bio: true,
        establishment: true,
      },
    });

    // Top 10 non-admin users by XP.
    const topUserIds = [...xpMap.entries()]
      .filter(([uid]) => !admins.some((a) => a.id === uid))
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10)
      .map(([uid]) => uid);

    const topUsers =
      topUserIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: topUserIds } },
            select: {
              id: true,
              name: true,
              role: true,
              bio: true,
              establishment: true,
            },
          })
        : [];

    const allMentorUsers = [...admins, ...topUsers];
    const mentors: MentorRow[] = allMentorUsers
      .filter((u) => u.id !== meId) // don't list yourself
      .map((u) => {
        const stats = xpMap.get(u.id) ?? {
          xp: 0,
          sessionCount: 0,
          avgPct: 0,
          totalCorrect: 0,
        };
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          bio: u.bio,
          establishment: u.establishment,
          xp: stats.xp,
          sessionCount: stats.sessionCount,
          avgPct: stats.avgPct,
          isMentor: u.role === "ADMIN" || stats.xp >= 500,
        };
      })
      .sort((a, b) => b.xp - a.xp);

    // --- 2. Mentorship requests involving the current user ------------
    const sentRequests = await db.post.findMany({
      where: { type: "mentorship-request", authorId: meId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    });

    // Received: I'm the mentor (tags contains mentor:<myId>).
    const receivedRequests = await db.post.findMany({
      where: {
        type: "mentorship-request",
        tags: { contains: `mentor:${meId}` },
      },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    });

    // Pull mentor + mentee names in one query.
    const involvedIds = new Set<string>();
    for (const r of sentRequests) {
      const mid = parseMentorId(r.tags);
      if (mid) involvedIds.add(mid);
    }
    for (const r of receivedRequests) {
      involvedIds.add(r.authorId);
    }
    const involvedUsers =
      involvedIds.size > 0
        ? await db.user.findMany({
            where: { id: { in: [...involvedIds] } },
            select: { id: true, name: true },
          })
        : [];
    const nameMap = new Map(involvedUsers.map((u) => [u.id, u.name]));

    const myRequests: MentorshipRequestRow[] = sentRequests.map((r) => {
      const mentorId = parseMentorId(r.tags) ?? "";
      return {
        id: r.id,
        mentorId,
        mentorName: nameMap.get(mentorId) ?? "Mentor",
        menteeId: r.authorId,
        menteeName: r.author.name ?? "Mentoré",
        status: parseStatus(r.tags),
        message: r.content,
        createdAt: r.createdAt.toISOString(),
      };
    });

    const incomingRequests: MentorshipRequestRow[] = receivedRequests.map(
      (r) => {
        const mentorId = parseMentorId(r.tags) ?? "";
        return {
          id: r.id,
          mentorId,
          mentorName: nameMap.get(mentorId) ?? "Mentor",
          menteeId: r.authorId,
          menteeName: r.author.name ?? "Mentoré",
          status: parseStatus(r.tags),
          message: r.content,
          createdAt: r.createdAt.toISOString(),
        };
      }
    );

    // --- 3. Accepted relationships ------------------------------------
    const myMentor = myRequests.find((r) => r.status === "accepted") ?? null;
    const myMentees = incomingRequests.filter((r) => r.status === "accepted");

    return NextResponse.json({
      mentors,
      myRequests,
      incomingRequests,
      myMentor,
      myMentees,
    });
  } catch (error) {
    console.error("Mentorship GET error:", error);
    return NextResponse.json(
      { error: "Failed to load mentorship data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentorship
 * Body: { mentorId, message? }
 * Creates a pending mentorship request from the current user to `mentorId`.
 * Refuses duplicate pending requests to the same mentor.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const meId = (session.user as { id?: string }).id;
    if (!meId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const mentorId =
      typeof body.mentorId === "string" ? body.mentorId.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!mentorId) {
      return NextResponse.json(
        { error: "Mentor manquant" },
        { status: 400 }
      );
    }
    if (mentorId === meId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas être votre propre mentor" },
        { status: 400 }
      );
    }
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message trop long (1000 caractères max)" },
        { status: 400 }
      );
    }

    // Verify the mentor exists.
    const mentor = await db.user.findUnique({
      where: { id: mentorId },
      select: { id: true, name: true, role: true },
    });
    if (!mentor) {
      return NextResponse.json(
        { error: "Mentor introuvable" },
        { status: 404 }
      );
    }

    // Refuse duplicate pending requests to the same mentor.
    const existing = await db.post.findFirst({
      where: {
        type: "mentorship-request",
        authorId: meId,
        tags: { contains: `mentor:${mentorId}` },
      },
    });
    if (existing && parseStatus(existing.tags) === "pending") {
      return NextResponse.json(
        { error: "Vous avez déjà une demande en attente avec ce mentor" },
        { status: 409 }
      );
    }
    // If a previous accepted request exists, refuse to create another.
    if (existing && parseStatus(existing.tags) === "accepted") {
      return NextResponse.json(
        { error: "Ce mentor vous accompagne déjà" },
        { status: 409 }
      );
    }

    const post = await db.post.create({
      data: {
        authorId: meId,
        content: message,
        type: "mentorship-request",
        tags: buildTags(mentorId, "pending"),
      },
    });

    return NextResponse.json(
      {
        id: post.id,
        mentorId,
        mentorName: mentor.name,
        menteeId: meId,
        status: "pending",
        message: post.content,
        createdAt: post.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Mentorship POST error:", error);
    return NextResponse.json(
      { error: "Failed to create mentorship request" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mentorship
 * Body: { requestId, action: "accept" | "decline" }
 * Lets a mentor accept or decline a pending request addressed to them.
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
    const meId = (session.user as { id?: string }).id;
    if (!meId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestId =
      typeof body.requestId === "string" ? body.requestId.trim() : "";
    const action = body.action === "accept" ? "accepted" : "declined";

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId manquant" },
        { status: 400 }
      );
    }

    const post = await db.post.findUnique({
      where: { id: requestId },
    });
    if (!post || post.type !== "mentorship-request") {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 }
      );
    }

    // Only the mentor (target of the request) can accept/decline.
    const mentorId = parseMentorId(post.tags);
    if (mentorId !== meId) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cette demande" },
        { status: 403 }
      );
    }

    if (parseStatus(post.tags) !== "pending") {
      return NextResponse.json(
        { error: "Cette demande a déjà été traitée" },
        { status: 400 }
      );
    }

    await db.post.update({
      where: { id: requestId },
      data: { tags: buildTags(mentorId!, action) },
    });

    return NextResponse.json({
      id: requestId,
      status: action,
    });
  } catch (error) {
    console.error("Mentorship PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update mentorship request" },
      { status: 500 }
    );
  }
}
