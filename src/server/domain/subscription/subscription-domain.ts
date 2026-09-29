/**
 * Subscription Domain — Premium tier business logic.
 *
 * Pure logic for subscription tiers, limits, and policy enforcement.
 */

export type SubscriptionTier = "free" | "premium" | "admin";

export interface SubscriptionLimits {
  dailyQuestionLimit: number;
  canUploadPdf: boolean;
  canUseAiTutor: boolean;
  canGetCertificates: boolean;
  canUseOfflineBanks: number; // max banks downloadable
  canViewAdvancedStats: boolean;
  canUseSpacedRepetition: boolean;
  canUseAdaptiveQuiz: boolean;
  canExportAnki: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    dailyQuestionLimit: 50,
    canUploadPdf: false,
    canUseAiTutor: false,
    canGetCertificates: false,
    canUseOfflineBanks: 1,
    canViewAdvancedStats: false,
    canUseSpacedRepetition: false,
    canUseAdaptiveQuiz: false,
    canExportAnki: true,
  },
  premium: {
    dailyQuestionLimit: Infinity,
    canUploadPdf: true,
    canUseAiTutor: true,
    canGetCertificates: true,
    canUseOfflineBanks: Infinity,
    canViewAdvancedStats: true,
    canUseSpacedRepetition: true,
    canUseAdaptiveQuiz: true,
    canExportAnki: true,
  },
  admin: {
    dailyQuestionLimit: Infinity,
    canUploadPdf: true,
    canUseAiTutor: true,
    canGetCertificates: true,
    canUseOfflineBanks: Infinity,
    canViewAdvancedStats: true,
    canUseSpacedRepetition: true,
    canUseAdaptiveQuiz: true,
    canExportAnki: true,
  },
};

/**
 * Get the subscription tier from a user's role and subscription field.
 */
export function getTier(role: string | undefined, subscription: string | undefined): SubscriptionTier {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "admin";
  if (subscription === "premium") return "premium";
  return "free";
}

/**
 * Get the limits for a given tier.
 */
export function getLimits(tier: SubscriptionTier): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier];
}

/**
 * Check if the user can perform a specific action.
 */
export function canPerform(
  tier: SubscriptionTier,
  action: keyof SubscriptionLimits,
): boolean {
  const limits = SUBSCRIPTION_LIMITS[tier];
  const value = limits[action];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/**
 * Check if the user has remaining daily questions.
 */
export function hasRemainingQuestions(
  tier: SubscriptionTier,
  questionsAnsweredToday: number,
): boolean {
  const limit = SUBSCRIPTION_LIMITS[tier].dailyQuestionLimit;
  return questionsAnsweredToday < limit;
}

/**
 * Calculate remaining questions for today.
 */
export function remainingQuestions(
  tier: SubscriptionTier,
  questionsAnsweredToday: number,
): number {
  const limit = SUBSCRIPTION_LIMITS[tier].dailyQuestionLimit;
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - questionsAnsweredToday);
}
