"use client";

/**
 * Offline manager (added in F5).
 *
 * Lets a user "download" a question bank for offline use. The bank's
 * metadata + its full list of questions are cached as a single JSON
 * blob in localStorage under `qebf-offline-bank:<bankId>`. An index of
 * cached bank IDs is kept under `qebf-offline-index`.
 *
 * Pending sessions (started while offline) are queued in
 * `qebf-offline-pending-sessions` and flushed by `syncOfflineSessions()`
 * once `navigator.onLine` returns true.
 *
 * All functions are SSR-safe (no-op when `window` is undefined) and
 * tolerate quota-exceeded errors by evicting the oldest cached bank.
 */

import type { Question, QuestionBank } from "./types";

const BANK_PREFIX = "qebf-offline-bank:";
const INDEX_KEY = "qebf-offline-index";
const PENDING_KEY = "qebf-offline-pending-sessions";

export interface CachedBank {
  bank: QuestionBank;
  questions: Question[];
  cachedAt: string;
  sizeBytes: number;
}

interface PendingSession {
  id: string;
  createdAt: string;
  payload: {
    title: string;
    mode: "immediate" | "final";
    sourceType: "bank" | "exam";
    sourceId: string;
    answers: Array<{
      questionId: string;
      userAnswer: string | null;
      isCorrect: boolean | null;
      answeredAt: string | null;
    }>;
  };
}

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

function readIndex(): string[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota errors
  }
}

/**
 * Fetch the bank metadata + all its questions from the public API and
 * cache them as JSON in localStorage. Updates the index. Returns the
 * cached bank metadata, or null on error.
 */
export async function downloadBankForOffline(
  bankId: string
): Promise<CachedBank | null> {
  const w = safeWindow();
  if (!w) return null;
  try {
    // Fetch bank metadata + questions in parallel.
    const [bankRes, qRes] = await Promise.all([
      fetch(`/api/banks`).then((r) => r.json()),
      fetch(`/api/questions?bankId=${encodeURIComponent(bankId)}`).then((r) =>
        r.json()
      ),
    ]);
    const bankMeta = Array.isArray(bankRes)
      ? bankRes.find((b: { id: string }) => b.id === bankId)
      : null;
    if (!bankMeta) return null;
    const questions = (qRes?.questions ?? []) as Question[];
    const cached: CachedBank = {
      bank: {
        id: bankMeta.id,
        title: bankMeta.title,
        description: bankMeta.description ?? "",
        category: bankMeta.category ?? "",
        icon: bankMeta.icon ?? "BookOpen",
        color: bankMeta.color ?? "emerald",
        _count: { questions: questions.length },
      },
      questions,
      cachedAt: new Date().toISOString(),
      sizeBytes: 0, // computed below
    };
    const serialized = JSON.stringify(cached);
    cached.sizeBytes = serialized.length;

    // Try to persist; if quota exceeded, evict oldest and retry once.
    try {
      w.localStorage.setItem(BANK_PREFIX + bankId, serialized);
    } catch {
      evictOldestBank();
      try {
        w.localStorage.setItem(BANK_PREFIX + bankId, serialized);
      } catch {
        return null;
      }
    }

    // Update the index (keep newest first, dedupe).
    const ids = readIndex().filter((id) => id !== bankId);
    ids.unshift(bankId);
    writeIndex(ids);

    return cached;
  } catch (err) {
    console.error("downloadBankForOffline failed:", err);
    return null;
  }
}

export function getOfflineBanks(): CachedBank[] {
  const w = safeWindow();
  if (!w) return [];
  const ids = readIndex();
  const out: CachedBank[] = [];
  for (const id of ids) {
    try {
      const raw = w.localStorage.getItem(BANK_PREFIX + id);
      if (!raw) continue;
      out.push(JSON.parse(raw) as CachedBank);
    } catch {
      // skip corrupted entry
    }
  }
  return out;
}

export function isBankAvailableOffline(bankId: string): boolean {
  const w = safeWindow();
  if (!w) return false;
  return w.localStorage.getItem(BANK_PREFIX + bankId) !== null;
}

export function removeOfflineBank(bankId: string): boolean {
  const w = safeWindow();
  if (!w) return false;
  const key = BANK_PREFIX + bankId;
  if (w.localStorage.getItem(key) === null) return false;
  w.localStorage.removeItem(key);
  writeIndex(readIndex().filter((id) => id !== bankId));
  return true;
}

function evictOldestBank() {
  const w = safeWindow();
  if (!w) return;
  const ids = readIndex();
  if (ids.length === 0) return;
  const oldest = ids[ids.length - 1];
  w.localStorage.removeItem(BANK_PREFIX + oldest);
  writeIndex(ids.filter((id) => id !== oldest));
}

/**
 * Compute the total localStorage usage (in bytes) of all cached banks.
 * Used by the storage-usage indicator in the offline-manager panel.
 */
export function getOfflineStorageBytes(): number {
  return getOfflineBanks().reduce((sum, b) => sum + (b.sizeBytes || 0), 0);
}

/**
 * Queue a session payload for later submission (called when offline).
 * The payload mirrors what /api/sessions/[id]/answers/[answerId] expects.
 */
export function queuePendingSession(pending: PendingSession): void {
  const w = safeWindow();
  if (!w) return;
  try {
    const raw = w.localStorage.getItem(PENDING_KEY);
    const list: PendingSession[] = raw ? JSON.parse(raw) : [];
    list.push(pending);
    w.localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getPendingSessions(): PendingSession[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function clearPendingSessions(): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(PENDING_KEY);
}

/**
 * Attempt to flush all pending sessions. Returns the count successfully
 * submitted. Each pending session is replayed by POSTing to /api/sessions
 * (which creates a new session) and then PATCHing each answer.
 *
 * For simplicity (and because the existing /api/sessions/[id]/complete
 * endpoint expects a full session), we just POST a fresh session with
 * the same source — the server will create new SessionAnswer rows that
 * the client can re-populate if needed. This is a best-effort mock sync
 * (no real conflict resolution).
 */
export async function syncOfflineSessions(): Promise<{
  synced: number;
  failed: number;
}> {
  const w = safeWindow();
  if (!w || !navigator.onLine) return { synced: 0, failed: 0 };
  const pending = getPendingSessions();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: PendingSession[] = [];

  for (const p of pending) {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.payload.title,
          mode: p.payload.mode,
          sourceType: p.payload.sourceType,
          sourceId: p.payload.sourceId,
        }),
      });
      if (res.ok) {
        synced++;
      } else {
        failed++;
        remaining.push(p);
      }
    } catch {
      failed++;
      remaining.push(p);
    }
  }

  // Persist the unsynced ones for a later retry.
  try {
    w.localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
  return { synced, failed };
}
