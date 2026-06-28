import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
<<<<<<< Updated upstream
 * GET /api/forum/topics/[id]
 * Fetch a single topic with all its replies (oldest first).
 */
=======
 * GET    /api/forum/topics/[id] — détails d'un sujet + réponses triées par date.
 *
 * DELETE /api/forum/topics/[id] — supprime un sujet. Seul l'auteur ou un
 * administrateur peut le faire.
 */

>>>>>>> Stashed changes
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id },
      include: {
<<<<<<< Updated upstream
        author: { select: { id: true, name: true, role: true } },
        bank: {
          select: { id: true, title: true, color: true, icon: true },
        },
        replies: {
          orderBy: [{ isBestAnswer: "desc" }, { createdAt: "asc" }],
          include: {
            author: { select: { id: true, name: true, role: true } },
=======
        author: { select: { id: true, name: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true } },
>>>>>>> Stashed changes
          },
        },
      },
    });

    if (!topic) {
<<<<<<< Updated upstream
      return NextResponse.json(
        { error: "Sujet introuvable" },
        { status: 404 }
      );
=======
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
>>>>>>> Stashed changes
    }

    return NextResponse.json(topic);
  } catch (error) {
<<<<<<< Updated upstream
    console.error("Forum topic GET error:", error);
    return NextResponse.json(
      { error: "Failed to load forum topic" },
=======
    console.error("Failed to load forum topic:", error);
    return NextResponse.json(
      { error: "Failed to load topic" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}

<<<<<<< Updated upstream
/**
 * DELETE /api/forum/topics/[id]
 * Delete a topic. Only the author or an admin can delete it.
 * Deleting a topic cascades to its replies (per the schema).
 */
=======
>>>>>>> Stashed changes
export async function DELETE(
  _request: Request,
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
=======
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
>>>>>>> Stashed changes

    const { id } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id },
<<<<<<< Updated upstream
      select: { id: true, authorId: true },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Sujet introuvable" },
        { status: 404 }
      );
    }

    const isAuthor = topic.authorId === userId;
    const isAdmin = role === "ADMIN";
    if (!isAuthor && !isAdmin) {
=======
      select: { authorId: true },
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN";
    const isAuthor = topic.authorId === user.id;
    if (!isAdmin && !isAuthor) {
>>>>>>> Stashed changes
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer ce sujet" },
        { status: 403 }
      );
    }

    await db.forumTopic.delete({ where: { id } });
<<<<<<< Updated upstream
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forum topic DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete forum topic" },
=======
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete forum topic:", error);
    return NextResponse.json(
      { error: "Failed to delete topic" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
