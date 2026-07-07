import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  cacheGet,
  cacheSet,
  invalidateBanksListCache,
  CACHE_KEYS,
  EDUCATION_LEVELS,
} from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * Valid education levels. Used to validate the `?level=` query param so
 * callers cannot inject arbitrary SQL/Prisma filter values.
 *
 * "TOUS" means "applies to every level" — banks with this level are always
 * returned regardless of the filter (so a bank tagged TOUS shows up under
 * BEPC, BAC, LICENCE and CONCOURS filters alike).
 */
const VALID_LEVELS = new Set<string>(EDUCATION_LEVELS);

export async function GET(request: Request) {
  try {
    // Parse the optional `?level=` query param.
    // - If `level` is missing or invalid → return all banks (no filter).
    // - If `level=TOUS` → also return all banks (no filter).
    // - Otherwise → return banks whose `educationLevel` is either the
    //   requested level OR "TOUS" (the "applies to every level" wildcard).
    const { searchParams } = new URL(request.url);
    const rawLevel = searchParams.get("level")?.toUpperCase().trim() ?? "";

    // Cache key includes the level so different filters don't shadow each other.
    const cacheKey = `${CACHE_KEYS.banksList}:level=${rawLevel || "ALL"}`;

    const cached = cacheGet<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where =
      rawLevel && VALID_LEVELS.has(rawLevel) && rawLevel !== "TOUS"
        ? {
            OR: [
              { educationLevel: rawLevel },
              { educationLevel: "TOUS" },
            ],
          }
        : undefined;

    const banks = await db.questionBank.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });

    cacheSet(cacheKey, banks);
    return NextResponse.json(banks);
  } catch (error) {
    console.error("Failed to list banks:", error);
    return NextResponse.json(
      { error: "Failed to load question banks" },
      { status: 500 }
    );
  }
}

// Invalide le cache si la route est étendue pour des écritures (POST futur)
export async function POST() {
  // Invalidate every cached variant (no level + every known level) since a
  // new bank affects potentially all of them.
  invalidateBanksListCache();
  return NextResponse.json({ ok: true });
}
