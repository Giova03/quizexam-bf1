import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { listQuestionsForActor } from "@/server/application/content/list-questions-for-actor";

export const dynamic = "force-dynamic";

/**
 * GET /api/questions?bankId=X — questions for revision mode. Auth required.
 *
 * P3: business logic moved to the application layer. Visibility of the
 * answer key (correctAnswer / correctAnswer2 / explanation) is decided by
 * the QUESTION DOMAIN (`questionViewForActor`): staff roles (EDITOR and
 * above, per the shared RBAC — now including SUPER_ADMIN) see everything,
 * students get the questions stripped of the answer key to prevent
 * cheating. Client contract unchanged.
 */
export async function GET(request: Request) {
  try {
    // Authentication required
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

    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
    if (!bankId) return NextResponse.json({ error: "bankId required" }, { status: 400 });

    const result = await listQuestionsForActor(bankId, user.role);
    return NextResponse.json({ questions: result.questions });
  } catch (error) {
    console.error("Failed to load questions:", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
