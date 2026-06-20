import { NextResponse } from "next/server";
import { ensureAdminAccount } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST() {
  try { await ensureAdminAccount(); return NextResponse.json({ success: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Init failed" }, { status: 500 }); }
}
