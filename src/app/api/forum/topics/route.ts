import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/forum/topics
 * List forum topics with optional filters and pagination.
 * Query params:
 *   - bankId:    filter topics linked to a specific question bank
 *   - category:  filter by category slug (e.g. "general", "histoire")
 *   - page:      page number (1-indexed, default 1)
 *   - pageSize:  items per page (default 20, max 50)
 *   - q:         optional full-text search on title + content
 *
 * The response includes a lightweight author (id, name, role) and the
 * reply count for each topic, plus the last activity timestamp
 * (updatedAt — bumped whenever a reply is added).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId") || undefined;
    const category = searchParams.get("category") || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    // Build the where clause. We use undefined (rather than null) so Prisma
    // skips the filter entirely when the param is missing.
    const where: Record<string, unknown> = {};
    if (bankId) where.bankId = bankId;
    if (category && category !== "all") where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ];
    }

    const [topics, total] = await Promise.all([
      db.forumTopic.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, name: true, role: true },
          },
          bank: {
            select: { id: true, title: true, color: true, icon: true },
          },
          _count: { select: { replies: true } },
          replies: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              createdAt: true,
              author: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.forumTopic.count({ where }),
    ]);

    // Flatten the last reply into a top-level `lastActivity` field for the UI.
    const items = topics.map((t) => {
      const lastReply = t.replies[0];
      return {
        id: t.id,
        title: t.title,
        content: t.content,
        category: t.category,
        bankId: t.bankId,
        bank: t.bank,
        author: t.author,
        repliesCount: t._count.replies,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastActivity: lastReply
          ? { at: lastReply.createdAt, author: lastReply.author }
          : { at: t.createdAt, author: t.author },
      };
    });

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("Forum topics GET error:", error);
    return NextResponse.json(
      { error: "Failed to load forum topics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forum/topics
 * Create a new forum topic. Requires authentication.
 * Body: { title, content, category?, bankId? }
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
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().toLowerCase()
        : "general";
    const bankId =
      typeof body.bankId === "string" && body.bankId.trim()
        ? body.bankId.trim()
        : null;

    if (!title) {
      return NextResponse.json(
        { error: "Le titre est requis" },
        { status: 400 }
      );
    }
    if (title.length > 200) {
      return NextResponse.json(
        { error: "Le titre est trop long (200 caractères max)" },
        { status: 400 }
      );
    }
    if (!content) {
      return NextResponse.json(
        { error: "Le contenu est requis" },
        { status: 400 }
      );
    }
    if (content.length > 10000) {
      return NextResponse.json(
        { error: "Le contenu est trop long (10000 caractères max)" },
        { status: 400 }
      );
    }

    // If a bankId is provided, verify it exists so we don't create dangling refs.
    if (bankId) {
      const bank = await db.questionBank.findUnique({
        where: { id: bankId },
        select: { id: true },
      });
      if (!bank) {
        return NextResponse.json(
          { error: "Banque de questions introuvable" },
          { status: 404 }
        );
      }
    }

    const topic = await db.forumTopic.create({
      data: {
        title,
        content,
        category,
        bankId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        bank: {
          select: { id: true, title: true, color: true, icon: true },
        },
        _count: { select: { replies: true } },
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error("Forum topics POST error:", error);
    return NextResponse.json(
      { error: "Failed to create forum topic" },
      { status: 500 }
    );
  }
}
