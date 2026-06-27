import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/forum/topics/[id]
 * Fetch a single topic with all its replies (oldest first).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, role: true } },
        bank: {
          select: { id: true, title: true, color: true, icon: true },
        },
        replies: {
          orderBy: [{ isBestAnswer: "desc" }, { createdAt: "asc" }],
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Sujet introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error("Forum topic GET error:", error);
    return NextResponse.json(
      { error: "Failed to load forum topic" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forum/topics/[id]
 * Delete a topic. Only the author or an admin can delete it.
 * Deleting a topic cascades to its replies (per the schema).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    const { id } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id },
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
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer ce sujet" },
        { status: 403 }
      );
    }

    await db.forumTopic.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forum topic DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete forum topic" },
      { status: 500 }
    );
  }
}
