import { NextResponse } from "next/server";
import { getBank } from "@/server/application/content/get-bank";

export const dynamic = "force-dynamic";

/**
 * GET /api/banks/[id] — one bank with all its questions (ordered).
 *
 * P3: logic moved to the application layer; the raw-SQL media backfill
 * (imageUrl / audioUrl, legacy F4 workaround) now lives in the bank
 * repository. Client contract unchanged.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await getBank(id);
    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Bank not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.bank);
  } catch (error) {
    console.error("Failed to load bank:", error);
    return NextResponse.json(
      { error: "Failed to load bank" },
      { status: 500 }
    );
  }
}
