import { NextResponse } from "next/server";
import { db } from "@/lib/db";
<<<<<<< Updated upstream
import { cacheGet, cacheSet, CACHE_KEYS } from "@/lib/cache";
=======
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/cache";
>>>>>>> Stashed changes

export const dynamic = "force-dynamic";

const CACHE_KEY = "banks:list";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
<<<<<<< Updated upstream
    // Cache the banks list for 5 minutes (default TTL) to avoid hitting the
    // DB on every page load. The cache is invalidated by the admin mutation
    // endpoints (create/update/delete bank, create/update/delete question —
    // since the per-bank question count is part of the response).
    const cached = cacheGet<unknown>(CACHE_KEYS.banksList);
=======
    // Essaye d'abord le cache mémoire
    const cached = cacheGet<unknown[]>(CACHE_KEY);
>>>>>>> Stashed changes
    if (cached) {
      return NextResponse.json(cached);
    }

    const banks = await db.questionBank.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });

<<<<<<< Updated upstream
    cacheSet(CACHE_KEYS.banksList, banks);
=======
    // Stocke en cache pour 5 minutes
    cacheSet(CACHE_KEY, banks, CACHE_TTL_MS);

>>>>>>> Stashed changes
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
  cacheInvalidate(CACHE_KEY);
  return NextResponse.json({ ok: true });
}
