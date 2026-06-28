import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkLimit,
  FREE_LIMIT,
  PREMIUM_LIMIT,
  PLAN_FEATURES,
  type SubscriptionTier,
} from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";

/**
 * GET /api/subscription
 *
 * Returns the current user's subscription tier, daily quota usage, and the
 * list of features allowed by their plan. Used by the pricing modal and by
 * the "Améliorer" badge in the header.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id ?? null;
    const check = await checkLimit(userId);
    return NextResponse.json({
      tier: check.tier,
      isPremium: check.isPremium,
      usedToday: check.usedToday,
      remaining: Number.isFinite(check.remaining) ? check.remaining : null,
      limit: Number.isFinite(check.limit) ? check.limit : null,
      canStartMore: check.canStartMore,
      features: check.isPremium ? PREMIUM_LIMIT : FREE_LIMIT,
      planFeatures:
        check.tier === "premium" || check.tier === "admin"
          ? PLAN_FEATURES.premium
          : PLAN_FEATURES.free,
    });
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
 * "premium". No real payment processor is invoked. The column is updated
 * via raw SQL so we don't depend on the dev server's HMR-cached Prisma
 * client knowing about the new column (added in F5).
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
    const requestedTier: SubscriptionTier =
      body?.tier === "free" ? "free" : "premium";

    await db.$executeRaw`
      UPDATE "User" SET subscription = ${requestedTier} WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      tier: requestedTier,
      isPremium: requestedTier === "premium",
      message:
        requestedTier === "premium"
          ? "Abonnement Premium activé (mode démo)."
          : "Abonnement rétrogradé en Free.",
    });
  } catch (error) {
    console.error("subscription POST error:", error);
    return NextResponse.json(
      { error: "Échec de la mise à niveau" },
      { status: 500 }
    );
  }
}

