/**
 * Audit Log — P1
 *
 * Tracks all administrative actions for accountability.
 * Stored in the AuditLog table (to be added to Prisma schema).
 *
 * For now, uses a simple in-memory + localStorage approach.
 * Will be migrated to a proper DB table in the schema update.
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

const AUDIT_KEY = "quizexam-audit-log";
const MAX_ENTRIES = 500;

/**
 * Log an administrative action.
 */
export function logAction(entry: Omit<AuditEntry, "id" | "timestamp">): void {
  const fullEntry: AuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  // In browser: store in localStorage
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
      existing.unshift(fullEntry);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(existing.slice(0, MAX_ENTRIES)));
    } catch {
      // localStorage might be full or unavailable
    }
  }

  // Always log to console for server-side visibility
  console.log(`[AUDIT] ${entry.userEmail} → ${entry.action} on ${entry.entity}:${entry.entityId}`);
}

/**
 * Get recent audit entries.
 */
export function getAuditLog(limit = 50): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const entries = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
    return entries.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Clear the audit log.
 */
export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUDIT_KEY);
}
