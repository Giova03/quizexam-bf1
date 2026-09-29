/**
 * Set Subscription Tier Use Case — application layer.
 *
 * POST /api/subscription business logic — mock upgrade/downgrade (no real
 * payment processor yet; FedaPay arrives in P5). The tier flip goes through
 * the typed repository now (the legacy raw-SQL workaround predates the
 * generated client knowing the column). Response contract unchanged.
 */

import { setUserSubscriptionTier } from "@/server/infrastructure/repositories/subscription-repository";

export type RequestedTier = "premium" | "free";

export type SetTierResult = {
  kind: "ok";
  tier: RequestedTier;
  isPremium: boolean;
  message: string;
};

export async function setSubscriptionTier(
  userId: string,
  requested: unknown,
): Promise<SetTierResult> {
  // Legacy rule: anything but "free" upgrades to premium (default).
  const tier: RequestedTier = requested === "free" ? "free" : "premium";

  await setUserSubscriptionTier(userId, tier);

  return {
    kind: "ok",
    tier,
    isPremium: tier === "premium",
    message:
      tier === "premium"
        ? "Abonnement Premium activé (mode démo)."
        : "Abonnement rétrogradé en Free.",
  };
}
