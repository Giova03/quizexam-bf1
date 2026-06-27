import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheGet, cacheSet, CACHE_KEYS } from "@/lib/cache";
import {
  rateLimitCheck,
  getClientKey,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/banks
 *
 * Public, rate-limited list of question banks. Returns metadata only
 * (id, title, category, question count) — no questions, no correct
 * answers. Used by external integrators and the API docs view.
 *
 * Rate limit: 30 requests / minute / IP (in-memory counter).
 */
export async function GET(request: Request) {
  // --- Rate limit ---
  const key = getClientKey(request);
  const rl = rateLimitCheck(key);
  const headers = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Trop de requêtes. Réessayez dans quelques secondes.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers }
    );
  }

  try {
    // Reuse the same in-memory cache as the authed /api/banks endpoint.
    const cached = cacheGet<unknown>(CACHE_KEYS.banksList);
    let banks: Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      _count?: { questions: number };
    }>;
    if (cached) {
      banks = cached as typeof banks;
    } else {
      banks = await db.questionBank.findMany({
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { questions: true } } },
      });
      cacheSet(CACHE_KEYS.banksList, banks);
    }

    // Strip internal fields and reshape for public consumption.
    const publicBanks = banks.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      category: b.category,
      questionsCount: b._count?.questions ?? 0,
    }));

    return NextResponse.json(
      {
        banks: publicBanks,
        rateLimit: {
          limit: rl.limit,
          remaining: rl.remaining,
          reset: rl.reset,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error("public/banks GET error:", error);
    return NextResponse.json(
      { error: "Échec du chargement des banques" },
      { status: 500 }
    );
  }
}
