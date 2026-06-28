import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
/**
 * GET /api/articles/[id]
 * Fetch a single article. If the article is unpublished, only the author or
 * an admin can view it.
 */
export async function GET(
  _request: Request,
=======
export async function GET(
  request: Request,
>>>>>>> Stashed changes
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
<<<<<<< Updated upstream
    const article = await db.article.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article introuvable" },
        { status: 404 }
      );
    }

    // Gate unpublished articles to author + admin.
    if (!article.published) {
      const session = await getServerSession(authOptions);
      const uid = (session?.user as { id?: string } | undefined)?.id;
      const role = (session?.user as { role?: string } | undefined)?.role;
      if (uid !== article.authorId && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Cet article n'est pas encore publié" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Article GET error:", error);
    return NextResponse.json(
      { error: "Failed to load article" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/articles/[id]
 * Update an article. Only the author or an admin can edit.
 * Body: any subset of { title, content, excerpt, category, published, featuredImage }
 */
=======
    // Increment view count (best-effort, no await blocking the response)
    db.article
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    const article = await db.article.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!article) {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (error) {
    console.error("Failed to load article:", error);
    return NextResponse.json({ error: "Failed to load article" }, { status: 500 });
  }
}

>>>>>>> Stashed changes
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
<<<<<<< Updated upstream
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    const { id } = await params;
    const article = await db.article.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!article) {
      return NextResponse.json(
        { error: "Article introuvable" },
        { status: 404 }
      );
    }
    if (article.authorId !== userId && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cet article" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json(
          { error: "Le titre ne peut pas être vide" },
          { status: 400 }
        );
      }
      if (t.length > 200) {
        return NextResponse.json(
          { error: "Le titre est trop long (200 caractères max)" },
          { status: 400 }
        );
      }
      data.title = t;
    }
    if (typeof body.content === "string") {
      const c = body.content.trim();
      if (!c) {
        return NextResponse.json(
          { error: "Le contenu ne peut pas être vide" },
          { status: 400 }
        );
      }
      if (c.length > 100000) {
        return NextResponse.json(
          { error: "Le contenu est trop long (100 000 caractères max)" },
          { status: 400 }
        );
      }
      data.content = c;
    }
    if (typeof body.excerpt === "string") {
      data.excerpt = body.excerpt.trim();
    }
    if (typeof body.category === "string" && body.category.trim()) {
      data.category = body.category.trim().toLowerCase();
    }
    if (typeof body.published === "boolean") {
      data.published = body.published;
    }
    if (typeof body.featuredImage === "string") {
      data.featuredImage = body.featuredImage.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Aucun champ à mettre à jour" },
        { status: 400 }
      );
=======
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    const { id } = await params;
    const existing = await db.article.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }
    const isAdmin = user.role === "ADMIN";
    if (existing.authorId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const body = (await request.json()) as {
      title?: string;
      excerpt?: string;
      content?: string;
      tags?: string;
      coverUrl?: string;
      status?: string;
    };
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim().length >= 3) {
      data.title = body.title.trim();
    }
    if (typeof body.excerpt === "string") data.excerpt = body.excerpt.trim();
    if (typeof body.content === "string") data.content = body.content;
    if (typeof body.tags === "string") data.tags = body.tags.trim();
    if (typeof body.coverUrl === "string") data.coverUrl = body.coverUrl.trim();
    if (isAdmin && (body.status === "draft" || body.status === "published")) {
      data.status = body.status;
>>>>>>> Stashed changes
    }

    const updated = await db.article.update({
      where: { id },
      data,
<<<<<<< Updated upstream
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Article PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles/[id]
 * Delete an article. Only the author or an admin can delete it.
 */
export async function DELETE(
  _request: Request,
=======
      include: { author: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update article:", error);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
>>>>>>> Stashed changes
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
<<<<<<< Updated upstream
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    const { id } = await params;
    const article = await db.article.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!article) {
      return NextResponse.json(
        { error: "Article introuvable" },
        { status: 404 }
      );
    }
    if (article.authorId !== userId && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer cet article" },
        { status: 403 }
      );
    }

    await db.article.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Article DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
=======
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    const { id } = await params;
    const existing = await db.article.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }
    const isAdmin = user.role === "ADMIN";
    if (existing.authorId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    await db.article.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete article:", error);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
>>>>>>> Stashed changes
  }
}
