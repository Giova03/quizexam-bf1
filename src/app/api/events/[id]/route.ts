import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
/**
 * GET /api/events/[id]
 * Fetch a single event by id.
 */
export async function GET(
  _request: Request,
=======
export async function GET(
  _req: Request,
>>>>>>> Stashed changes
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
<<<<<<< Updated upstream
    const event = await db.event.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Événement introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Event GET error:", error);
    return NextResponse.json(
      { error: "Failed to load event" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event. Admin only.
 */
export async function DELETE(
  _request: Request,
=======
    const event = await db.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error) {
    console.error("Failed to load event:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
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
    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "Réservé aux administrateurs" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.event.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Événement introuvable" },
        { status: 404 }
      );
    }

    await db.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Event DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
=======
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
    }
    const { id } = await params;
    await db.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
>>>>>>> Stashed changes
  }
}
