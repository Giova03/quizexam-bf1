import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/forum/topics/[id]/best-answer
 * Mark a reply as the best answer for a topic.
 *
 * Only the topic author or an admin can do this.
 * Body: { replyId: string }
 *
 * This unmarks any previously-selected best answer so at most one reply
 * per topic can be the best answer at a time.
 */
export async function PATCH(
  request: Request,
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

    const { id: topicId } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id: topicId },
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
        {
          error:
            "Seul l'auteur du sujet (ou un administrateur) peut désigner la meilleure réponse",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const replyId =
      typeof body.replyId === "string" ? body.replyId.trim() : "";
    if (!replyId) {
      return NextResponse.json(
        { error: "replyId est requis" },
        { status: 400 }
      );
    }

    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true, topicId: true },
    });
    if (!reply || reply.topicId !== topicId) {
      return NextResponse.json(
        { error: "Réponse introuvable pour ce sujet" },
        { status: 404 }
      );
    }

    // Atomically: clear any existing best answer, then mark the chosen reply.
    await db.$transaction([
      db.forumReply.updateMany({
        where: { topicId, isBestAnswer: true },
        data: { isBestAnswer: false },
      }),
      db.forumReply.update({
        where: { id: replyId },
        data: { isBestAnswer: true },
      }),
    ]);

    return NextResponse.json({ success: true, replyId });
  } catch (error) {
    console.error("Forum best-answer PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to mark best answer" },
      { status: 500 }
    );
  }
}
