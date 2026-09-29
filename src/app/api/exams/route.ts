import { NextResponse } from "next/server";
import { listExams } from "@/server/application/content/list-exams";
import { cacheInvalidate, CACHE_KEYS } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams — list of official exams (5-minute in-memory cache,
 * invalidated by the admin mutation endpoints).
 *
 * P3: logic moved to the application layer. Response contract unchanged.
 */
export async function GET() {
  try {
    const result = await listExams();
    return NextResponse.json(result.exams);
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
  cacheInvalidate(CACHE_KEYS.examsList);
  return NextResponse.json({ ok: true });
}
