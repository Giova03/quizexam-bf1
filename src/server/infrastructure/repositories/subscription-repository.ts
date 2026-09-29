/**
 * Subscription Repository — infrastructure layer (server only).
 *
 * P3: replaces the raw-SQL helpers that lived in src/lib/subscription-limits
 * with typed Prisma access. The `subscription` column is part of the
 * generated client since P2, so the legacy raw-SQL workaround is no longer
 * needed. Failure semantics are preserved: reads degrade to "free" / 0
 * instead of throwing.
 */

import { db } from "@/lib/db";

/** Effective tier of a user row ("free" fallback for unknown values). */
export type StoredTier = "free" | "premium" | "admin";

export async function findUserSubscription(
  userId: string,
): Promise<StoredTier> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { subscription: true },
    });
    const sub = user?.subscription;
    if (sub === "premium" || sub === "admin") return sub;
    return "free";
  } catch {
    return "free";
  }
}

/**
 * Count how many questions the user has already "consumed" today across
 * all sessions started in the current UTC day. Anonymous sessions (no
 * userId) are not counted — those are rate-limited at the IP layer by the
 * public API instead.
 */
export async function countQuestionsAnsweredToday(
  userId: string,
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  try {
    const agg = await db.quizSession.aggregate({
      _sum: { totalQuestions: true },
      where: {
        userId,
        startedAt: { gte: startOfDay },
      },
    });
    const total = agg._sum.totalQuestions;
    return typeof total === "number" ? total : 0;
  } catch {
    return 0;
  }
}

/** Flip a user's subscription tier (typed update, replaces legacy raw SQL). */
export async function setUserSubscriptionTier(
  userId: string,
  tier: StoredTier,
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { subscription: tier },
  });
}
