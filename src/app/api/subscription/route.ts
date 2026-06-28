import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
<<<<<<< Updated upstream
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
=======

export const dynamic = "force-dynamic";

const PLANS = {
  free: {
    name: "Gratuit",
    price: 0,
    dailyQuestionLimit: 50,
    features: [
      "Accès à toutes les banques de questions",
      "50 questions par jour",
      "Mode correction immédiate et finale",
      "Tableau de bord de progression",
      "Favoris et révision espacée",
    ],
  },
  premium: {
    name: "Premium",
    price: 2000, // FCFA / month
    dailyQuestionLimit: 9999,
    features: [
      "Questions illimitées",
      "Tutor IA personnalisé (analyse des erreurs)",
      "Certificats téléchargeables",
      "Statistiques avancées (graphiques Recharts)",
      "Export Anki illimité",
      "Mode compétition multijoueur",
      "Support prioritaire",
    ],
  },
} as const;

/**
 * GET /api/subscription
 * Returns the current user's subscription status + available plans.
>>>>>>> Stashed changes
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
<<<<<<< Updated upstream
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
=======
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscription: true,
        subscriptionUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const isPremium =
      user.subscription === "premium" &&
      (!user.subscriptionUntil ||
        user.subscriptionUntil.getTime() > Date.now());

    return NextResponse.json({
      current: {
        plan: isPremium ? "premium" : "free",
        subscription: user.subscription,
        subscriptionUntil: user.subscriptionUntil,
        isPremium,
        dailyQuestionLimit: isPremium
          ? PLANS.premium.dailyQuestionLimit
          : PLANS.free.dailyQuestionLimit,
      },
      plans: PLANS,
    });
  } catch (error) {
    console.error("[subscription] GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'abonnement" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription
<<<<<<< Updated upstream
 *
 * Mock upgrade — flips the calling user's `subscription` column to
 * "premium". No real payment processor is invoked. The column is updated
 * via raw SQL so we don't depend on the dev server's HMR-cached Prisma
 * client knowing about the new column (added in F5).
 *
 * Body: { tier?: "premium" | "free" }   (default: "premium")
=======
 * Body: { plan: "free" | "premium" }
 *
 * Switches the current user's plan. For demo purposes, premium is granted
 * immediately with a 30-day validity (no payment integration here).
>>>>>>> Stashed changes
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
<<<<<<< Updated upstream
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
=======
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const plan = body?.plan;
    if (plan !== "free" && plan !== "premium") {
      return NextResponse.json(
        { error: "Plan invalide (attendu: 'free' ou 'premium')" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const subscriptionUntil =
      plan === "premium"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null;

    await db.user.update({
      where: { id: user.id },
      data: {
        subscription: plan,
        subscriptionUntil,
      },
    });

    return NextResponse.json({
      success: true,
      plan,
      subscriptionUntil,
      dailyQuestionLimit:
        plan === "premium"
          ? PLANS.premium.dailyQuestionLimit
          : PLANS.free.dailyQuestionLimit,
    });
  } catch (error) {
    console.error("[subscription] POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'abonnement" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
<<<<<<< Updated upstream
=======

// Export the plans + limit logic so other routes (sessions) can reuse it.
export const SUBSCRIPTION_PLANS = PLANS;
export const FREE_DAILY_LIMIT = PLANS.free.dailyQuestionLimit;
>>>>>>> Stashed changes
