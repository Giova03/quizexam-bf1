/**
 * Staff Audit Helper — application layer (P4).
 *
 * One-call audit trail for staff mutations:
 * 1. The actor identity is ALWAYS derived from the NextAuth session —
 *    a client body has no right over who appears in the trail.
 * 2. Payload strings are truncated (mirrors the /api/audit-log sanitizers).
 * 3. Delegates to the resilient audit repository — a FAILED audit write
 *    never breaks the caller's request (best-effort contract, see
 *    audit-log-repository.ts).
 *
 * Routes call it AFTER the mutation succeeded:
 *   const actor = staffActorFromSession(session);
 *   await logStaffAction(actor, { action: "bank.create", entity: "QuestionBank", entityId: bank.id, newValue: bank });
 */

import { recordAuditLog } from "@/server/infrastructure/repositories/audit-log-repository";

/** Same limits as the /api/audit-log sanitizers (single source of truth). */
const MAX_VALUE_LENGTH = 10_000;
const MAX_METADATA_JSON = 8_000;

export interface StaffActor {
  id: string;
  email: string;
}

export interface StaffActionInput {
  /** Dot-notation-ish verb, e.g. "question.create", "user.role_change". */
  action: string;
  /** Prisma model name, e.g. "Question", "QuestionBank", "User". */
  entity: string;
  entityId: string;
  /** State BEFORE the mutation (object → JSON-stringified, truncated). */
  oldValue?: unknown;
  /** State AFTER the mutation (object → JSON-stringified, truncated). */
  newValue?: unknown;
  /** Extra structured context (kept as JSON in the AuditLog.metadata column). */
  metadata?: Record<string, unknown>;
}

interface SessionUserLike {
  id?: string;
  email?: string | null;
  role?: string;
}

/**
 * Extract a stable audit actor from a NextAuth session. The JWT always
 * carries `id` and `email` (see lib/auth.ts callbacks); if `id` is somehow
 * missing on an old token, the email is a stable-enough fallback.
 */
export function staffActorFromSession(session: unknown): StaffActor {
  const user = (session as { user?: SessionUserLike } | null)?.user ?? {};
  const email = typeof user.email === "string" ? user.email : "";
  const id = typeof user.id === "string" && user.id.length > 0 ? user.id : email;
  return { id, email };
}

/** JSON-stringify a before/after payload, truncated to the storage limit. */
function stringifyValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  let json: string;
  if (typeof value === "string") {
    json = value;
  } else {
    try {
      json = JSON.stringify(value);
    } catch {
      // Circular structure or BigInt — degrade instead of breaking the route.
      return undefined;
    }
  }
  return json.length > MAX_VALUE_LENGTH ? json.slice(0, MAX_VALUE_LENGTH) : json;
}

/** Cap oversized metadata so one entry cannot bloat the table. */
function safeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  try {
    const json = JSON.stringify(metadata);
    return json.length <= MAX_METADATA_JSON
      ? metadata
      : { truncated: json.slice(0, MAX_METADATA_JSON) };
  } catch {
    return undefined;
  }
}

/**
 * Record one staff action. Never throws (repository is best-effort by
 * contract); silently skips anonymous actors (id === "" means no identity
 * was derivable — the trail must stay attributable).
 */
export async function logStaffAction(
  actor: StaffActor,
  input: StaffActionInput,
): Promise<void> {
  if (!actor.id) {
    console.warn("[AUDIT] Action non journalisée — identité de session absente:", input.action);
    return;
  }
  await recordAuditLog({
    userId: actor.id,
    userEmail: actor.email,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    oldValue: stringifyValue(input.oldValue),
    newValue: stringifyValue(input.newValue),
    metadata: safeMetadata(input.metadata),
  });
}
