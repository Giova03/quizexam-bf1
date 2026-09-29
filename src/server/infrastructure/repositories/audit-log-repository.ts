/**
 * Audit Log Repository — infrastructure layer (server only).
 *
 * P2: durable storage for the audit trail, replacing the P1 localStorage
 * approach. Prisma is the only technology-aware dependency here.
 *
 * Resilience contract: a FAILED audit WRITE must never break the caller's
 * request — we degrade to a console warning. Reads may throw (the API route
 * maps failures to a 500).
 */

import { db } from "@/lib/db";
import type { AuditLog } from "@prisma/client";
import type { AuditEntry } from "@/shared/security/audit-log";

export interface AuditRecordInput {
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

function rowToEntry(row: AuditLog): AuditEntry {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata) {
    try {
      const parsed: unknown = JSON.parse(row.metadata);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      // Malformed metadata — surface it as-is under a dedicated key.
      metadata = { raw: row.metadata };
    }
  }

  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    oldValue: row.oldValue ?? undefined,
    newValue: row.newValue ?? undefined,
    timestamp: row.createdAt.toISOString(),
    ip: row.ip ?? undefined,
    metadata,
  };
}

/**
 * Persist an audit entry. Never throws.
 */
export async function recordAuditLog(input: AuditRecordInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        ip: input.ip ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    // Typical case: the AuditLog table does not exist yet (deploy happened
    // before `prisma db push`). Audit must stay a best-effort concern.
    console.warn("[AUDIT] Échec de l'écriture du journal d'audit:", error);
  }
}

/**
 * List the most recent audit entries (newest first).
 */
export async function listAuditLogs(limit = 50): Promise<AuditEntry[]> {
  const rows = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(rowToEntry);
}

/**
 * List audit entries for one entity (newest first).
 */
export async function listAuditLogsForEntity(
  entity: string,
  entityId: string,
  limit = 50,
): Promise<AuditEntry[]> {
  const rows = await db.auditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(rowToEntry);
}
