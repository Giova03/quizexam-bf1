import { NextResponse } from "next/server";
import { listBanks } from "@/server/application/content/list-banks";
import { invalidateBanksListCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/banks?level=BEPC|BAC|LICENCE|CONCOURS|TOUS
 *
 * P3: logic moved to the application layer (level filter resolved by the
 * BANK DOMAIN, caching owned by the use case). Response contract unchanged:
 * invalid/missing/TOUS levels return all banks, level filters include the
 * "TOUS" wildcard banks.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLevel = searchParams.get("level")?.toUpperCase().trim() ?? "";

    const result = await listBanks(rawLevel);
    return NextResponse.json(result.banks);
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
