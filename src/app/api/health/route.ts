/**
 * GET /api/health — P6 observability.
 *
 * PUBLIC liveness/readiness probe for uptime monitors (UptimeRobot, Vercel
 * checks…). Deliberately leak-free: the response carries only aggregate
 * status, never error details, env names or data contents.
 *
 * - process ok  → 200 { ok: true, db: "up" | "down" | "unconfigured", uptimeSec, ts }
 * - a DB outage does NOT fail the probe (200 with db: "down"): the process
 *   itself is alive, which is what a restart decision needs. Swap to 503
 *   when you wire a monitor that distinguishes the two cases.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB_CHECK_TIMEOUT_MS = 3_000;

async function checkDatabase(): Promise<"up" | "down" | "unconfigured"> {
  // DATABASE_URL absente (ex. variables Vercel limitées au runtime ou projet
  // non configuré) : diagnostic explicite au lieu d'un "down" trompeur.
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) return "unconfigured";
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("db check timeout")), DB_CHECK_TIMEOUT_MS),
      ),
    ]);
    return "up";
  } catch {
    return "down";
  }
}

export async function GET() {
  const dbStatus = await checkDatabase();

  return NextResponse.json(
    {
      ok: true,
      db: dbStatus,
      uptimeSec: Math.round(process.uptime()),
      ts: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
