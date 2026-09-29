import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionForActor, PermissionError } from "@/server/application/quiz/get-session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // P0: Authentication required
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: authSession.user.email },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // P2: business logic moved to the application layer (use case).
    const result = await getSessionForActor(id, { id: user.id, role: user.role });

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { session, durationMin } = result.view;
    return NextResponse.json({ ...session, durationMin });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("Failed to load session:", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
