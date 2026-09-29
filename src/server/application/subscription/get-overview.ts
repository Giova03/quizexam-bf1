/**
 * Get Subscription Overview Use Case — application layer.
 *
 * GET /api/subscription business logic. Replicates the legacy response
 * byte-for-byte (pricing modal + "Améliorer" badge contract):
 *
 * - tier comes from the stored `subscription` column only ("free" fallback),
 *   exactly like the legacy `getUserTier` — role-aware tiering is a domain
 *   capability deliberately NOT activated here to preserve behavior;
 * - premium/admin: unlimited → remaining / limit serialized as null
 *   (Number.isFinite guard of the legacy route);
 * - `features` uses the legacy FREE_LIMIT / PREMIUM_LIMIT shapes;
 * - `planFeatures` uses the PLAN_FEATURES marketing copy.
 */

import {
  FREE_DAILY_LIMIT,
  FREE_LIMIT,
  PREMIUM_LIMIT,
  PLAN_FEATURES,
  type SubscriptionTier,
} from "@/lib/subscription-limits";
import {
  findUserSubscription,
  countQuestionsAnsweredToday,
} from "@/server/infrastructure/repositories/subscription-repository";

export interface SubscriptionOverview {
  tier: SubscriptionTier;
  isPremium: boolean;
  usedToday: number;
  remaining: number | null;
  limit: number | null;
  canStartMore: boolean;
  features: typeof FREE_LIMIT | typeof PREMIUM_LIMIT;
  planFeatures: readonly string[];
}

export async function getSubscriptionOverview(
  userId: string | null,
): Promise<SubscriptionOverview> {
  const tier: SubscriptionTier = userId
    ? await findUserSubscription(userId)
    : "free";

  if (tier === "premium" || tier === "admin") {
    return {
      tier,
      isPremium: true,
      usedToday: 0,
      remaining: null, // Infinity → null (legacy serialization)
      limit: null,
      canStartMore: true,
      features: PREMIUM_LIMIT,
      planFeatures: PLAN_FEATURES.premium,
    };
  }

  const usedToday = userId ? await countQuestionsAnsweredToday(userId) : 0;
  const remaining = Math.max(0, FREE_DAILY_LIMIT - usedToday);
  return {
    tier: "free",
    isPremium: false,
    usedToday,
    remaining,
    limit: FREE_DAILY_LIMIT,
    canStartMore: remaining > 0,
    features: FREE_LIMIT,
    planFeatures: PLAN_FEATURES.free,
  };
}
