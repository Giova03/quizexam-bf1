import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheGet, cacheSet, CACHE_KEYS } from "@/lib/cache";

export const dynamic = "force-dynamic";

const CACHE_KEY = "exams:list";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Cache the exams list for 5 minutes (default TTL). Invalidated by the
    // admin mutation endpoints (create/delete exam).
    const cached = cacheGet<unknown>(CACHE_KEYS.examsList);
    if (cached) {
      return NextResponse.json(cached);
    }

    const exams = await db.exam.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { examQuestions: true } },
      },
    });

    cacheSet(CACHE_KEYS.examsList, exams);
    return NextResponse.json(exams);
  } catch (error) {
    console.error("Failed to list exams:", error);
    return NextResponse.json(
      { error: "Failed to load exams" },
      { status: 500 }
    );
  }
}

// Invalide le cache si la route est étendue pour des écritures (POST futur)
export async function POST() {
  cacheInvalidate(CACHE_KEY);
  return NextResponse.json({ ok: true });
}
