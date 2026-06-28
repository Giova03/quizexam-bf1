import { NextResponse } from "next/server";
import { db } from "@/lib/db";
<<<<<<< Updated upstream
import { cacheGet, cacheSet, CACHE_KEYS } from "@/lib/cache";
import {
  rateLimitCheck,
  getClientKey,
  rateLimitHeaders,
} from "@/lib/rate-limit";
=======
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
>>>>>>> Stashed changes

export const dynamic = "force-dynamic";

/**
 * GET /api/public/banks
<<<<<<< Updated upstream
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
=======
 * Public, rate-limited list of question banks (without question details).
 *
 * Query params:
 *   - category: filter by category (case-insensitive partial match)
 *   - limit:    max results (default 50, max 200)
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`public:banks:${ip}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
>>>>>>> Stashed changes
    );
  }

  try {
<<<<<<< Updated upstream
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
=======
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim();
    const limitParam = Number(searchParams.get("limit") ?? 50);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 200);

    const banks = await db.questionBank.findMany({
      where: category
        ? { category: { contains: category, mode: "insensitive" } }
        : undefined,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        subcategory: true,
        icon: true,
        color: true,
        level: true,
        createdAt: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      count: banks.length,
      total: await db.questionBank.count(
        category
          ? {
              where: {
                category: { contains: category, mode: "insensitive" },
              },
            }
          : undefined
      ),
      banks: banks.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        category: b.category,
        subcategory: b.subcategory,
        icon: b.icon,
        color: b.color,
        level: b.level,
        questionsCount: b._count.questions,
        createdAt: b.createdAt,
      })),
      rateLimit: {
        limit: rl.limit,
        remaining: rl.remaining,
        resetAt: rl.resetAt,
      },
    });
  } catch (error) {
    console.error("[public/banks] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des banques" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
