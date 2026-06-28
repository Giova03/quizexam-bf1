import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
const EVENT_TYPES = ["exam", "contest", "deadline"] as const;
type EventType = (typeof EVENT_TYPES)[number];

/**
 * GET /api/events
 * List upcoming events (startDate >= now - 1 day by default, so events
 * happening today still appear). Sorted by startDate ascending.
 *
 * Query params:
 *   - limit:  max number of events to return (default 50)
 *   - all:    if "1", include past events too (admin overview)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const includePast = searchParams.get("all") === "1";

    const where: { startDate?: { gte: Date } } = {};
    if (!includePast) {
      // Show events from yesterday onwards (so today's events remain visible).
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - 1);
      where.startDate = { gte: cutoff };
    }

    const events = await db.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      take: limit,
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    const items = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      startDate: e.startDate,
      endDate: e.endDate,
      createdBy: e.createdBy,
      creator: e.creator,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Events GET error:", error);
    return NextResponse.json(
      { error: "Failed to load events" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event. Admin only.
 * Body: { title, description?, type?, startDate, endDate? }
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
    const role = (session.user as { role?: string }).role;
    if (!userId || role !== "ADMIN") {
      return NextResponse.json(
        { error: "Réservé aux administrateurs" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const typeRaw =
      typeof body.type === "string" ? body.type.toLowerCase() : "deadline";
    const type: EventType = (EVENT_TYPES as readonly string[]).includes(typeRaw)
      ? (typeRaw as EventType)
      : "deadline";

    const startDateStr =
      typeof body.startDate === "string" ? body.startDate : "";
    const endDateStr =
      typeof body.endDate === "string" ? body.endDate : "";

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
    if (!startDateStr) {
      return NextResponse.json(
        { error: "La date de début est requise" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Date de début invalide" },
        { status: 400 }
      );
    }
    let endDate: Date | null = null;
    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Date de fin invalide" },
          { status: 400 }
        );
      }
      if (endDate < startDate) {
        return NextResponse.json(
          { error: "La date de fin doit être après la date de début" },
          { status: 400 }
        );
      }
    }
=======
/** GET /api/events — list upcoming + recent events (sorted by date asc). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "100"));
    const upcomingOnly = searchParams.get("upcoming") === "true";

    const where = upcomingOnly ? { date: { gte: new Date() } } : {};
    const events = await db.event.findMany({
      where,
      orderBy: { date: "asc" },
      take: limit,
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to list events:", error);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

/** POST /api/events — admin only. */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
    }
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      date?: string;
      endDate?: string;
      location?: string;
      category?: string;
    };
    const title = body.title?.trim();
    const dateStr = body.date;
    if (!title || !dateStr) {
      return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
>>>>>>> Stashed changes

    const event = await db.event.create({
      data: {
        title,
<<<<<<< Updated upstream
        description,
        type,
        startDate,
        endDate,
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Events POST error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
=======
        description: body.description?.trim() ?? "",
        date,
        endDate: body.endDate ? new Date(body.endDate) : null,
        location: body.location?.trim() ?? "",
        category: body.category?.trim() || "info",
        createdBy: user?.id ?? null,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
>>>>>>> Stashed changes
  }
}
