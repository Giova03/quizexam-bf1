/**
 * Freemium plan limits (added in F5).
 *
 * P3: this module is now CLIENT-SAFE CONSTANTS ONLY (no DB import). The
 * quota logic (tier resolution, daily counting, limit checks) moved to the
 * application layer — see src/server/application/subscription/check-quota.ts
 * and the subscription repository for the data access.
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
