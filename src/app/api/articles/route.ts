import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/articles
 * List published articles. Authors and admins can also see their own drafts
 * via ?mine=1.
 *
 * Query params:
 *   - category:  filter by category slug
 *   - mine:      "1" to include the current user's drafts
 *   - limit:     max items (default 50)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const mine = searchParams.get("mine") === "1";
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );

    // Prisma's `where` accepts OR / AND / etc. — type it loosely so we can
    // build either a simple published+category filter or an OR filter that
    // includes the user's own drafts.
    let where: Record<string, unknown> = { published: true };
    if (category && category !== "all") where.category = category;

    if (mine) {
      const session = await getServerSession(authOptions);
      const uid = (session?.user as { id?: string } | undefined)?.id;
      if (!uid) {
        return NextResponse.json(
          { error: "Connexion requise" },
          { status: 401 }
        );
      }
      // Show all of the user's own articles (draft + published) PLUS published by others.
      const ownFilter: Record<string, unknown> = { authorId: uid };
      const pubFilter: Record<string, unknown> = { published: true };
      if (category && category !== "all") {
        ownFilter.category = category;
        pubFilter.category = category;
      }
      where = { OR: [ownFilter, pubFilter] };
    }

    const articles = await db.article.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const items = articles.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      content: a.content,
      category: a.category,
      published: a.published,
      featuredImage: a.featuredImage,
      authorId: a.authorId,
      author: a.author,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Articles GET error:", error);
    return NextResponse.json(
      { error: "Failed to load articles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articles
 * Create a new article. Admin or any authenticated contributor can post.
 * (The platform treats every authenticated user as a potential contributor;
 *  posts default to draft (published=false) so an admin review isn't required
 *  but is possible.)
 *
 * Body: { title, content, excerpt?, category?, published?, featuredImage? }
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
    const excerpt =
      typeof body.excerpt === "string"
        ? body.excerpt.trim()
        : content.slice(0, 180);
    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().toLowerCase()
        : "general";
    const published = body.published === true;
    const featuredImage =
      typeof body.featuredImage === "string" && body.featuredImage.trim()
        ? body.featuredImage.trim()
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
    if (content.length > 100000) {
      return NextResponse.json(
        { error: "Le contenu est trop long (100 000 caractères max)" },
        { status: 400 }
      );
    }

    const article = await db.article.create({
      data: {
        title,
        content,
        excerpt,
        category,
        published,
        featuredImage,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Articles POST error:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
