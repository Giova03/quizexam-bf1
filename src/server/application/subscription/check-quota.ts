/**
 * Check Daily Quota Use Case — application layer.
 *
 * Replaces `checkLimit` from src/lib/subscription-limits (which could not
 * stay in lib: it imports the DB). Failure semantics preserved: any
 * repository error degrades to "free" / 0 instead of throwing, so a DB
 * hiccup can never 500 the freemium gate.
 *
 * Consumers: start-session use case, /api/ai-tutor, /api/certificate.
 */

import { FREE_DAILY_LIMIT, type SubscriptionTier } from "@/lib/subscription-limits";
import {
  findUserSubscription,
  countQuestionsAnsweredToday,
} from "@/server/infrastructure/repositories/subscription-repository";

export interface QuotaCheck {
  tier: SubscriptionTier;
  isPremium: boolean;
  usedToday: number;
  remaining: number;
  limit: number;
  canStartMore: boolean;
}

/** Effective tier of a user (legacy `getUserTier` — "free" fallback). */
export async function getUserTier(
  userId: string | null | undefined,
): Promise<SubscriptionTier> {
  if (!userId) return "free";
  return findUserSubscription(userId);
}

/**
 * Full daily-quota check. Premium/admin users get unlimited remaining
 * (Number.POSITIVE_INFINITY, like the legacy checkLimit).
 */
export async function checkDailyQuota(
  userId: string | null | undefined,
): Promise<QuotaCheck> {
  const tier = await getUserTier(userId);

  if (tier === "premium" || tier === "admin") {
    return {
      tier,
      isPremium: true,
      usedToday: 0,
      remaining: Number.POSITIVE_INFINITY,
      limit: Number.POSITIVE_INFINITY,
      canStartMore: true,
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
  };
}
