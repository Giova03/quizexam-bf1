import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Live revision sessions API (added in E5).
 *
 * Storage strategy (no schema change):
 *   Each live session is stored in the existing Event model with
 *   type="live-session".
 *   - Event.title       = the session title
 *   - Event.description = JSON string `{ bankId, hostName }` so we can
 *                         recover the bank link without an extra column.
 *   - Event.startDate   = the scheduled date/time.
 *   - Event.createdBy   = the host (current user).
 *   - Event.endDate     = null (single-instant sessions).
 *
 * Joining is "simulated" — the join endpoint just returns the session
 * details so the client can navigate to the underlying bank and start a
 * quiz. The client tracks which sessions the user has joined via
 * localStorage (see live-sessions-view.tsx).
 */

interface LiveSessionItem {
  id: string;
  title: string;
  bankId: string;
  hostName: string;
  hostId: string;
  scheduledAt: string;
  createdAt: string;
}

function parseDescription(
  desc: string
): { bankId?: string; hostName?: string } {
  try {
    const parsed = JSON.parse(desc);
    if (parsed && typeof parsed === "object") {
      return {
        bankId: typeof parsed.bankId === "string" ? parsed.bankId : undefined,
        hostName:
          typeof parsed.hostName === "string" ? parsed.hostName : undefined,
      };
    }
  } catch {
    // Not JSON — fall through.
  }
  return {};
}

function toLiveSessionItem(e: {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  createdAt: Date;
  createdBy: string;
  creator: { name: string | null } | null;
}): LiveSessionItem {
  const meta = parseDescription(e.description);
  return {
    id: e.id,
    title: e.title,
    bankId: meta.bankId ?? "",
    hostName: meta.hostName ?? e.creator?.name ?? "Hôte",
    hostId: e.createdBy,
    scheduledAt: e.startDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

/**
 * GET /api/live-sessions
 *   → returns all upcoming + recent live sessions (type="live-session"),
 *     ordered by scheduledAt ascending. Includes already-started sessions
 *     for the next 3 hours so users can join sessions in progress.
 *
 * Query params:
 *   - all: "1" to include past sessions too (default: hide older than 3h).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "1";

    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const events = await db.event.findMany({
      where: {
        type: "live-session",
        ...(includeAll ? {} : { startDate: { gte: threeHoursAgo } }),
      },
      orderBy: { startDate: "asc" },
      include: { creator: { select: { name: true } } },
    });

    const items = events.map(toLiveSessionItem);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Live sessions GET error:", error);
    return NextResponse.json(
      { error: "Failed to load live sessions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/live-sessions
 * Body: { title, bankId, scheduledAt }
 * Creates a new live session. Auth required (admin or any contributor —
 * same rule as the blog/wiki: every authenticated user is a contributor).
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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const bankId = typeof body.bankId === "string" ? body.bankId.trim() : "";
    const scheduledAtRaw =
      typeof body.scheduledAt === "string" ? body.scheduledAt : "";

    if (!title) {
      return NextResponse.json(
        { error: "Le titre est requis" },
        { status: 400 }
      );
    }
    if (title.length > 120) {
      return NextResponse.json(
        { error: "Le titre est trop long (120 caractères max)" },
        { status: 400 }
      );
    }
    if (!bankId) {
      return NextResponse.json(
        { error: "La banque de questions est requise" },
        { status: 400 }
      );
    }
    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { error: "Date programmée invalide" },
        { status: 400 }
      );
    }

    // Verify the bank exists.
    const bank = await db.questionBank.findUnique({
      where: { id: bankId },
      select: { id: true, title: true },
    });
    if (!bank) {
      return NextResponse.json(
        { error: "Banque introuvable" },
        { status: 404 }
      );
    }

    const me = await db.user.findUnique({
      where: { id: meId },
      select: { name: true },
    });

    const event = await db.event.create({
      data: {
        title,
        description: JSON.stringify({
          bankId,
          bankTitle: bank.title,
          hostName: me?.name ?? "Hôte",
        }),
        type: "live-session",
        startDate: scheduledAt,
        createdBy: meId,
      },
      include: { creator: { select: { name: true } } },
    });

    return NextResponse.json(toLiveSessionItem(event), { status: 201 });
  } catch (error) {
    console.error("Live sessions POST error:", error);
    return NextResponse.json(
      { error: "Failed to create live session" },
      { status: 500 }
    );
  }
}
