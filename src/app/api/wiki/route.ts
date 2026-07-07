import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Collaborative wiki API (added in E5).
 *
 * Storage strategy (no schema change):
 *   Wiki articles are stored in the existing Article model. We use a
 *   `wiki-` category prefix to distinguish them from regular blog posts:
 *     - "wiki-general"        — Général
 *     - "wiki-methodologie"   — Méthodologie
 *     - "wiki-culture"        — Culture générale
 *     - "wiki-concours"       — Concours
 *     - "wiki-psychotechnique"— Tests psychotechniques
 *     - "wiki-temoignage"     — Témoignage
 *     - "wiki-actualite"      — Actualité
 *
 *   This means the existing blog view (which queries Article.where NOT
 *   starting with "wiki-") doesn't show wiki content, and vice-versa.
 *
 * Permissions:
 *   - Reading published wiki articles: public.
 *   - Reading your own drafts: requires auth.
 *   - Creating / editing / deleting: any authenticated user (treated as
 *     "contributor" — same rule as the blog). Author + admin can edit
 *     their own; admin can edit any.
 */

export const WIKI_CATEGORIES = [
  { value: "wiki-general", label: "Général" },
  { value: "wiki-methodologie", label: "Méthodologie" },
  { value: "wiki-culture", label: "Culture générale" },
  { value: "wiki-concours", label: "Concours" },
  { value: "wiki-psychotechnique", label: "Tests psychotechniques" },
  { value: "wiki-temoignage", label: "Témoignage" },
  { value: "wiki-actualite", label: "Actualité" },
];

/**
 * GET /api/wiki
 * Query params:
 *   - category:  one of WIKI_CATEGORIES values (without prefix is OK — we
 *                will add it). "all" (default) returns every wiki article.
 *   - mine:      "1" to include the current user's own drafts.
 *   - limit:     max items (default 50, capped at 100).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get("category") || "all";
    // Normalise: if the caller passes "general" we map to "wiki-general".
    const category =
      rawCategory === "all"
        ? "all"
        : rawCategory.startsWith("wiki-")
          ? rawCategory
          : `wiki-${rawCategory}`;
    const mine = searchParams.get("mine") === "1";
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );

    let where: Record<string, unknown> = {
      published: true,
      category: { startsWith: "wiki-" },
    };
    if (category !== "all") where.category = category;

    if (mine) {
      const session = await getServerSession(authOptions);
      const uid = (session?.user as { id?: string } | undefined)?.id;
      if (!uid) {
        return NextResponse.json(
          { error: "Connexion requise" },
          { status: 401 }
        );
      }
      // Show all of the user's own wiki articles (draft + published) PLUS
      // published wiki articles by others.
      const ownFilter: Record<string, unknown> = {
        authorId: uid,
        category: { startsWith: "wiki-" },
      };
      const pubFilter: Record<string, unknown> = {
        published: true,
        category: { startsWith: "wiki-" },
      };
      if (category !== "all") {
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
    console.error("Wiki GET error:", error);
    return NextResponse.json(
      { error: "Failed to load wiki articles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wiki
 * Create a new wiki article. Auth required (any authenticated contributor).
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
    const rawCategory =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().toLowerCase()
        : "wiki-general";
    const category = rawCategory.startsWith("wiki-")
      ? rawCategory
      : `wiki-${rawCategory}`;
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
    console.error("Wiki POST error:", error);
    return NextResponse.json(
      { error: "Failed to create wiki article" },
      { status: 500 }
    );
  }
}
