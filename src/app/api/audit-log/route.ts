/**
 * Audit Log API — P2.
 *
 * POST /api/audit-log  — record an administrative action.
 *   - Authentication required; staff only (EDITOR+, i.e. CREATE_QUESTION).
 *   - The actor identity (userId / userEmail) is ALWAYS derived from the
 *     NextAuth session — identity fields in the body are ignored, so a
 *     client cannot forge someone else's audit trail.
 *   - Best-effort by design: a storage failure returns 200 { ok: false } so
 *     the audit never breaks the user's action (see repository contract).
 *
 * GET /api/audit-log?limit=50 — read the trail (ADMIN+, VIEW_ANALYTICS).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/shared/security/rbac";
import {
  recordAuditLog,
  listAuditLogs,
} from "@/server/infrastructure/repositories/audit-log-repository";

export const dynamic = "force-dynamic";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true },
  });
}

/** Field sanitizer — audit payloads are stored as short strings. */
function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : undefined;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Staff only — anonymous/visitor clients have nothing legitimate to log.
    if (!hasPermission(user.role, "CREATE_QUESTION")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
    }

    const action = cleanString(body.action, 200);
    const entity = cleanString(body.entity, 100);
    const entityId = cleanString(body.entityId, 200);
    if (!action || !entity || !entityId) {
      return NextResponse.json(
        { error: "action, entity et entityId sont requis" },
        { status: 400 },
      );
    }

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined;

    await recordAuditLog({
      // Identity from the session, NEVER from the body.
      userId: user.id,
      userEmail: user.email,
      action,
      entity,
      entityId,
      oldValue: cleanString(body.oldValue, 10_000),
      newValue: cleanString(body.newValue, 10_000),
      ip: cleanString(body.ip, 64),
      metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record audit entry:", error);
    // Audit is best-effort: never break the caller's flow.
    return NextResponse.json({ ok: false });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // ADMIN+ (VIEW_ANALYTICS). Note: the stricter VIEW_AUDIT_LOG permission
    // (SUPER_ADMIN) is reserved for future purge/export features.
    if (!hasPermission(user.role, "VIEW_ANALYTICS")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsed = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(parsed) ? parsed : 50;

    // P4: optional filters for the admin journal tab.
    const entity = url.searchParams.get("entity")?.trim() || undefined;
    const action = url.searchParams.get("action")?.trim() || undefined;

    const entries = await listAuditLogs(limit, {
      entity,
      actionPrefix: action,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to load audit log:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
