import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
<<<<<<< Updated upstream
 * GET /api/forum/topics/[id]/replies
 * List all replies for a topic (oldest first).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!topic) {
      return NextResponse.json(
        { error: "Sujet introuvable" },
        { status: 404 }
      );
    }
    const replies = await db.forumReply.findMany({
      where: { topicId: id },
      orderBy: [{ isBestAnswer: "desc" }, { createdAt: "asc" }],
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
    return NextResponse.json(replies);
  } catch (error) {
    console.error("Forum replies GET error:", error);
    return NextResponse.json(
      { error: "Failed to load replies" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forum/topics/[id]/replies
 * Create a reply on a topic. Requires authentication.
 * Also bumps the topic's updatedAt so it sorts to the top of the list.
 */
=======
 * POST /api/forum/topics/[id]/replies — ajoute une réponse à un sujet.
 * Corps attendu : { content }.
 */

>>>>>>> Stashed changes
export async function POST(
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
    if (!userId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const { id: topicId } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });
    if (!topic) {
      return NextResponse.json(
        { error: "Sujet introuvable" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json(
        { error: "Le contenu est requis" },
=======
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const topic = await db.forumTopic.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Le contenu de la réponse est obligatoire" },
>>>>>>> Stashed changes
        { status: 400 }
      );
    }
    if (content.length > 5000) {
      return NextResponse.json(
<<<<<<< Updated upstream
        { error: "Le contenu est trop long (5000 caractères max)" },
=======
        { error: "La réponse ne doit pas dépasser 5000 caractères" },
>>>>>>> Stashed changes
        { status: 400 }
      );
    }

<<<<<<< Updated upstream
    // Create the reply and bump the topic's updatedAt atomically.
    const [reply] = await db.$transaction([
      db.forumReply.create({
        data: { topicId, authorId: userId, content },
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      }),
      db.forumTopic.update({
        where: { id: topicId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error("Forum replies POST error:", error);
=======
    const reply = await db.forumReply.create({
      data: {
        topicId: id,
        authorId: user.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error("Failed to create forum reply:", error);
>>>>>>> Stashed changes
    return NextResponse.json(
      { error: "Failed to create reply" },
      { status: 500 }
    );
  }
}
