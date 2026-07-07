import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Join a live session (added in E5).
 *
 * POST /api/live-sessions/join
 * Body: { sessionId }
 *
 * Returns the live session details + the underlying bank so the client
 * can navigate to the bank and start a quiz. Joining is "simulated" —
 * we don't track the roster server-side (no schema field for it). The
 * client tracks joined sessions in localStorage.
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

    const body = await request.json();
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId manquant" },
        { status: 400 }
      );
    }

    const event = await db.event.findUnique({
      where: { id: sessionId },
      include: { creator: { select: { name: true } } },
    });

    if (!event || event.type !== "live-session") {
      return NextResponse.json(
        { error: "Session introuvable" },
        { status: 404 }
      );
    }

    // Parse the description for the bankId + hostName.
    let bankId = "";
    let bankTitle = "";
    let hostName = event.creator?.name ?? "Hôte";
    try {
      const meta = JSON.parse(event.description);
      if (meta && typeof meta === "object") {
        bankId = typeof meta.bankId === "string" ? meta.bankId : "";
        bankTitle = typeof meta.bankTitle === "string" ? meta.bankTitle : "";
        if (typeof meta.hostName === "string") hostName = meta.hostName;
      }
    } catch {
      // ignore
    }

    // Fetch the bank so the client gets its current title + question count.
    let bank: { id: string; title: string; questionCount: number } | null = null;
    if (bankId) {
      const b = await db.questionBank.findUnique({
        where: { id: bankId },
        select: { id: true, title: true, _count: { select: { questions: true } } },
      });
      if (b) {
        bank = {
          id: b.id,
          title: b.title,
          questionCount: b._count.questions,
        };
      }
    }

    return NextResponse.json({
      id: event.id,
      title: event.title,
      bankId,
      bankTitle: bank?.title ?? bankTitle,
      hostName,
      hostId: event.createdBy,
      scheduledAt: event.startDate.toISOString(),
      bank,
    });
  } catch (error) {
    console.error("Live sessions join error:", error);
    return NextResponse.json(
      { error: "Failed to join live session" },
      { status: 500 }
    );
  }
}
