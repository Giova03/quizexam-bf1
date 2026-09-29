import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSubscriptionOverview } from "@/server/application/subscription/get-overview";
import { setSubscriptionTier } from "@/server/application/subscription/set-tier";

export const dynamic = "force-dynamic";

/**
 * GET /api/subscription
 *
 * Returns the current user's subscription tier, daily quota usage, and the
 * list of features allowed by their plan. Used by the pricing modal and by
 * the "Améliorer" badge in the header.
 *
 * P3: logic moved to the application layer (quota + tier resolution out of
 * lib). Response contract unchanged.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id ?? null;

    const overview = await getSubscriptionOverview(userId);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("subscription GET error:", error);
    return NextResponse.json(
      { error: "Échec du chargement de l'abonnement" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription
 *
 * Mock upgrade — flips the calling user's `subscription` column to
 * "premium". No real payment processor is invoked yet (FedaPay arrives in
 * P5). P3: logic moved to the application layer; the column update uses the
 * typed Prisma client (the legacy raw-SQL workaround is obsolete). Contract
 * unchanged.
 *
 * Body: { tier?: "premium" | "free" }   (default: "premium")
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await setSubscriptionTier(userId, body?.tier);

    return NextResponse.json({
      success: true,
      tier: result.tier,
      isPremium: result.isPremium,
      message: result.message,
    });
  } catch (error) {
    console.error("subscription POST error:", error);
    return NextResponse.json(
      { error: "Échec de la mise à niveau" },
      { status: 500 }
    );
  }
}
