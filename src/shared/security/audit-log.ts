/**
 * Audit Log — P2 (migration DB).
 *
 * Isomorphic facade over the audit trail:
 * - BROWSER: `logAction` posts to /api/audit-log, where the server derives
 *   the actor identity from the NextAuth session (never from the body) and
 *   persists via the AuditLog Prisma model. Fire-and-forget: an audit
 *   failure must never break the user's action.
 * - SERVER (API routes / use cases): `logAction` logs to the console; for
 *   durable storage import `recordAuditLog` from the infrastructure
 *   repository directly (`@/server/infrastructure/repositories/audit-log-repository`).
 *
 * `getAuditLog` is now async and reads from the database through
 * GET /api/audit-log (permission VIEW_ANALYTICS, i.e. ADMIN+).
 *
 * This module must stay importable from client components: no Prisma,
 * no Next.js server APIs here.
 */

export interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/** Input of `logAction` — identity fields are optional and server-derived. */
export interface AuditLogInput {
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Log an administrative action.
 * Browser → durable DB write via POST /api/audit-log (fire-and-forget).
 * Server  → console trace (use `recordAuditLog` for durable storage).
 */
export function logAction(entry: AuditLogInput): void {
  if (isBrowser()) {
    // The server derives userId/userEmail from the NextAuth session —
    // whatever the client sends for identity is ignored server-side.
    void fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {
      // Audit must never break the user's action.
    });
    return;
  }

  console.log(
    `[AUDIT] ${entry.userEmail ?? "?"} → ${entry.action} on ${entry.entity}:${entry.entityId}`,
  );
}

/**
 * Get recent audit entries (newest first).
 * Browser → GET /api/audit-log (ADMIN+ only; returns [] on any refusal).
 */
export async function getAuditLog(limit = 50): Promise<AuditEntry[]> {
  if (!isBrowser()) return [];
  try {
    const res = await fetch(
      `/api/audit-log?limit=${encodeURIComponent(String(limit))}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: AuditEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}
