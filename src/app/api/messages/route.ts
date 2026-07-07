import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Private messaging API (added in E5).
 *
 * Storage strategy (no schema change):
 *   Each message is stored as a Post row with type="message".
 *   - Post.authorId = the sender's user id.
 *   - Post.content  = the message body.
 *   - Post.tags     = `to:<recipientId>` so we can find all messages
 *                     addressed to a given user with a `contains` query.
 *
 * This keeps everything inside the existing Post model — no migration
 * needed and no new tables.
 */

interface MessageRow {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: string;
  createdAt: string;
}

interface ConversationSummary {
  peerId: string;
  peerName: string;
  lastMessage: MessageRow;
  unread: number;
}

function parseRecipientId(tags: string): string | null {
  // Tags look like "to:abc123" — extract the recipient id.
  const m = tags.match(/to:([^\s,]+)/);
  return m ? m[1] : null;
}

/**
 * GET /api/messages
 *   → returns the current user's conversation list (one entry per peer),
 *     each with the last message + an unread count.
 *
 * GET /api/messages?with=USERID
 *   → returns the full thread between the current user and USERID
 *     (oldest first).
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const withUserId = searchParams.get("with");

    // Fetch every message where I'm the sender OR I'm the recipient.
    // SQLite's `contains` maps to LIKE %x% — we search for "to:<meId>" in tags.
    const sent = await db.post.findMany({
      where: { type: "message", authorId: meId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true } } },
    });
    const received = await db.post.findMany({
      where: { type: "message", tags: { contains: `to:${meId}` } },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true } } },
    });

    // Combine into a single sorted list (oldest first).
    const all: MessageRow[] = [...sent, ...received]
      .map((p) => ({
        id: p.id,
        authorId: p.authorId,
        authorName: p.author.name ?? "Utilisateur",
        content: p.content,
        tags: p.tags,
        createdAt: p.createdAt.toISOString(),
      }))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    // --- Thread mode: return messages with a specific user --------------
    if (withUserId) {
      const thread = all.filter((m) => {
        const recipient = parseRecipientId(m.tags);
        const peer = m.authorId === meId ? recipient : m.authorId;
        return peer === withUserId;
      });
      return NextResponse.json({ items: thread });
    }

    // --- Conversation list mode -----------------------------------------
    // Group by peer (the "other" user in each message).
    const byPeer = new Map<string, MessageRow[]>();
    for (const m of all) {
      const recipient = parseRecipientId(m.tags);
      const peer = m.authorId === meId ? recipient : m.authorId;
      if (!peer) continue;
      if (!byPeer.has(peer)) byPeer.set(peer, []);
      byPeer.get(peer)!.push(m);
    }

    // Pull peer names in one query.
    const peerIds = [...byPeer.keys()];
    const peers =
      peerIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: peerIds } },
            select: { id: true, name: true },
          })
        : [];
    const peerNameMap = new Map(
      peers.map((p) => [p.id, p.name ?? "Utilisateur"])
    );

    // Track unread state in localStorage on the client — the server can't
    // know which messages the user has already seen without an extra column.
    // We surface a simple heuristic: count messages received in the last 24h
    // that the client can compare to its last-seen timestamp.
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const conversations: ConversationSummary[] = [...byPeer.entries()]
      .map(([peerId, msgs]) => {
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter(
          (m) =>
            m.authorId !== meId &&
            now - new Date(m.createdAt).getTime() < oneDayMs
        ).length;
        return {
          peerId,
          peerName: peerNameMap.get(peerId) ?? "Utilisateur",
          lastMessage: last,
          unread,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime()
      );

    return NextResponse.json({ items: conversations });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Body: { toUserId, content }
 * Sends a private message from the current user to `toUserId`.
 * Stored as a Post with type="message" and tags=`to:<toUserId>`.
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
    const toUserId =
      typeof body.toUserId === "string" ? body.toUserId.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!toUserId) {
      return NextResponse.json(
        { error: "Destinataire manquant" },
        { status: 400 }
      );
    }
    if (toUserId === meId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous envoyer un message à vous-même" },
        { status: 400 }
      );
    }
    if (!content) {
      return NextResponse.json(
        { error: "Le message ne peut pas être vide" },
        { status: 400 }
      );
    }
    if (content.length > 4000) {
      return NextResponse.json(
        { error: "Message trop long (4000 caractères max)" },
        { status: 400 }
      );
    }

    // Verify the recipient exists.
    const recipient = await db.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true },
    });
    if (!recipient) {
      return NextResponse.json(
        { error: "Destinataire introuvable" },
        { status: 404 }
      );
    }

    const post = await db.post.create({
      data: {
        authorId: meId,
        content,
        type: "message",
        tags: `to:${toUserId}`,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json(
      {
        id: post.id,
        authorId: post.authorId,
        authorName: post.author.name ?? "Utilisateur",
        content: post.content,
        tags: post.tags,
        createdAt: post.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
