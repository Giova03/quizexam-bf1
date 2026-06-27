import { db } from "./db";

/**
 * Freemium plan limits (added in F5).
 *
 * The actual `subscription` column lives on the User table ("free" |
 * "premium" | "admin"). FREE_LIMIT caps the number of *questions answered*
 * per UTC day for free users — counted as the sum of totalQuestions across
 * sessions started today by that user. Premium/admin users are unlimited.
 */

export type SubscriptionTier = "free" | "premium" | "admin";

export const FREE_DAILY_LIMIT = 50;

export const FREE_LIMIT = {
  dailyQuestions: FREE_DAILY_LIMIT,
  pdfUpload: false,
  aiTutor: false,
  certificates: false,
  offlineBanks: 1,
} as const;

export const PREMIUM_LIMIT = {
  dailyQuestions: Number.POSITIVE_INFINITY,
  pdfUpload: true,
  aiTutor: true,
  certificates: true,
  offlineBanks: Number.POSITIVE_INFINITY,
} as const;

/** Plan metadata used by the pricing-modal UI. */
export const PLAN_FEATURES = {
  free: [
    "50 questions par jour",
    "Accès à toutes les banques publiques",
    "Mode correction immédiate et finale",
    "Tableau de bord analytique",
    "Mode hors ligne (1 banque)",
  ],
  premium: [
    "Questions illimitées",
    "Téléversement PDF pour générer des QCM",
    "Tuteur IA personnalisé",
    "Certificats de réussite téléchargeables",
    "Mode hors ligne illimité",
    "Support prioritaire",
  ],
} as const;

export interface LimitCheck {
  tier: SubscriptionTier;
  isPremium: boolean;
  usedToday: number;
  remaining: number;
  limit: number;
  canStartMore: boolean;
}

/**
 * Resolve the effective subscription tier for a user id. Falls back to
 * "free" if the user does not exist or the column is missing.
 */
export async function getUserTier(
  userId: string | null | undefined
): Promise<SubscriptionTier> {
  if (!userId) return "free";
  try {
    const rows = await db.$queryRaw<{ subscription: string | null }[]>`
      SELECT subscription FROM "User" WHERE id = ${userId}
    `;
    const sub = rows[0]?.subscription;
    if (sub === "premium" || sub === "admin") return sub;
    return "free";
  } catch {
    return "free";
  }
}

/**
 * Count how many questions the user has already "consumed" today across
 * all sessions started in the current UTC day. Sessions without a user id
 * (anonymous) are not counted — those are rate-limited at the IP layer
 * by the public API instead.
 */
export async function countQuestionsToday(
  userId: string
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  try {
    const rows = await db.$queryRaw<{ total: bigint }[]>`
      SELECT COALESCE(SUM("totalQuestions"), 0) AS total
      FROM "QuizSession"
      WHERE "userId" = ${userId}
        AND "startedAt" >= ${startOfDay}
    `;
    const n = rows[0]?.total;
    if (typeof n === "bigint") return Number(n);
    if (typeof n === "number") return n;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Full limit check for the given user. Premium/admin users get unlimited
 * remaining (canStartMore always true). Free users see their remaining
 * daily quota.
 */
export async function checkLimit(
  userId: string | null | undefined
): Promise<LimitCheck> {
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
  const usedToday = userId ? await countQuestionsToday(userId) : 0;
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
