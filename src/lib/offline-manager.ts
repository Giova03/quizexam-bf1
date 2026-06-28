<<<<<<< Updated upstream
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
=======
/**
 * Offline manager for QuizExam BF.
 *
 * Allows users to download question banks for offline study, list/remove
 * stored banks, and queue session results to be synced back to the server
 * when the connection is restored.
 *
 * Storage: IndexedDB (much higher quota than localStorage). Falls back to
 * an in-memory map when IndexedDB is unavailable (SSR, private mode, etc.)
 * so the public API never throws.
 *
 * All functions are isomorphic: they no-op on the server.
 */

const DB_NAME = "quizexam-offline";
const DB_VERSION = 1;
const STORE_BANKS = "banks";
const STORE_SESSIONS = "sessions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OfflineQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  correctAnswer2?: string | null;
  explanation: string;
  difficulty?: string;
}

export interface OfflineBank {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  icon?: string;
  color?: string;
  questions: OfflineQuestion[];
  downloadedAt: string; // ISO date
  sizeBytes: number;
}

export interface OfflineSession {
  id: string; // local UUID
  title: string;
  mode: "immediate" | "final";
  sourceType: "bank" | "exam";
  sourceId: string;
  bankId?: string;
  answers: Array<{
    questionId: string;
    userAnswer: string | null;
    userAnswer2?: string | null;
    answeredAt: string;
  }>;
  startedAt: string;
  completedAt: string;
  synced: boolean;
  syncedAt?: string;
}

export interface OfflineBankSummary {
  id: string;
  title: string;
  category: string;
  questionCount: number;
  downloadedAt: string;
  sizeBytes: number;
}

export interface SyncResult {
  total: number;
  success: number;
  failed: number;
  details: Array<{ id: string; ok: boolean; error?: string }>;
}

// ---------------------------------------------------------------------------
// IndexedDB helpers (lazy + SSR-safe)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryBanks = new Map<string, OfflineBank>();
const memorySessions = new Map<string, OfflineSession>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_BANKS)) {
          db.createObjectStore(STORE_BANKS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function txGetAll<T>(store: string): Promise<T[]> {
  return openDb().then(async (db) => {
    if (!db) {
      const m = store === STORE_BANKS ? memoryBanks : memorySessions;
      return Array.from(m.values()) as unknown as T[];
    }
    return new Promise((resolve) => {
      try {
        const t = db.transaction(store, "readonly");
        const req = t.objectStore(store).getAll();
        req.onsuccess = () => resolve((req.result ?? []) as T[]);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  });
}

function txPut<T>(store: string, value: T): Promise<void> {
  return openDb().then(async (db) => {
    if (!db) {
      if (store === STORE_BANKS) {
        memoryBanks.set((value as unknown as { id: string }).id, value as unknown as OfflineBank);
      } else {
        memorySessions.set((value as unknown as { id: string }).id, value as unknown as OfflineSession);
      }
      return;
    }
    return new Promise((resolve) => {
      try {
        const t = db.transaction(store, "readwrite");
        t.objectStore(store).put(value);
        t.oncomplete = () => resolve();
        t.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

function txDelete(store: string, key: string): Promise<void> {
  return openDb().then(async (db) => {
    if (!db) {
      if (store === STORE_BANKS) memoryBanks.delete(key);
      else memorySessions.delete(key);
      return;
    }
    return new Promise((resolve) => {
      try {
        const t = db.transaction(store, "readwrite");
        t.objectStore(store).delete(key);
        t.oncomplete = () => resolve();
        t.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

function txGet<T>(store: string, key: string): Promise<T | null> {
  return openDb().then(async (db) => {
    if (!db) {
      const m = store === STORE_BANKS ? memoryBanks : memorySessions;
      return (m.get(key) as unknown as T) ?? null;
    }
    return new Promise((resolve) => {
      try {
        const t = db.transaction(store, "readonly");
        const req = t.objectStore(store).get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Public API: banks
// ---------------------------------------------------------------------------

/**
 * Fetches a bank (with all its questions + correct answers) from the server
 * and stores it locally for offline use.
 *
 * @returns the stored OfflineBank object
 */
export async function downloadBankForOffline(bankId: string): Promise<OfflineBank> {
  if (!bankId) throw new Error("bankId requis");

  const res = await fetch(`/api/banks/${bankId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Banque introuvable (${res.status})`);
  }
  const bank = await res.json();

  const questions: OfflineQuestion[] = (bank.questions ?? []).map((q: Record<string, unknown>) => ({
    id: String(q.id),
    question: String(q.question ?? ""),
    optionA: String(q.optionA ?? ""),
    optionB: String(q.optionB ?? ""),
    optionC: String(q.optionC ?? ""),
    optionD: String(q.optionD ?? ""),
    correctAnswer: String(q.correctAnswer ?? "A") as OfflineQuestion["correctAnswer"],
    correctAnswer2: (q.correctAnswer2 as string | null | undefined) ?? null,
    explanation: String(q.explanation ?? ""),
    difficulty: q.difficulty ? String(q.difficulty) : "medium",
  }));

  const offlineBank: OfflineBank = {
    id: bank.id,
    title: bank.title,
    description: bank.description ?? "",
    category: bank.category ?? "",
    subcategory: bank.subcategory ?? "",
    icon: bank.icon ?? "BookOpen",
    color: bank.color ?? "emerald",
    questions,
    downloadedAt: new Date().toISOString(),
    sizeBytes: JSON.stringify(questions).length,
  };

  await txPut(STORE_BANKS, offlineBank);
  return offlineBank;
}

/**
 * Lists all banks currently stored offline (without the full question list,
 * just a summary — used by the UI).
 */
export async function getOfflineBanks(): Promise<OfflineBankSummary[]> {
  const all = await txGetAll<OfflineBank>(STORE_BANKS);
  return all.map((b) => ({
    id: b.id,
    title: b.title,
    category: b.category,
    questionCount: b.questions.length,
    downloadedAt: b.downloadedAt,
    sizeBytes: b.sizeBytes,
  }));
}

/**
 * Returns the full offline bank object (with all questions) if available.
 */
export async function getOfflineBank(bankId: string): Promise<OfflineBank | null> {
  return txGet<OfflineBank>(STORE_BANKS, bankId);
}

/**
 * Quick synchronous check whether a given bank is available offline.
 * Note: this reads from the in-memory cache only, so it returns `false` on
 * the first render after a page load even if the bank is in IndexedDB.
 * For accurate results, use `await getOfflineBank(bankId)`.
 */
export function isBankAvailableOffline(bankId: string): boolean {
  if (!bankId) return false;
  if (memoryBanks.has(bankId)) return true;
  // Best-effort: kick off an async check and cache the result, but return
  // false synchronously on the first call.
  if (isBrowser()) {
    void txGet<OfflineBank>(STORE_BANKS, bankId).then((b) => {
      if (b && !memoryBanks.has(bankId)) memoryBanks.set(bankId, b);
    });
  }
  return false;
}

/**
 * Removes a bank from offline storage.
 */
export async function removeOfflineBank(bankId: string): Promise<void> {
  await txDelete(STORE_BANKS, bankId);
  memoryBanks.delete(bankId);
}

// ---------------------------------------------------------------------------
// Public API: offline sessions (queue + sync)
// ---------------------------------------------------------------------------

function generateLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "local-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Queues a completed session locally so it can be synced to the server
 * when the connection is restored. The session includes the user's answers
 * (not just the score) so the server can grade it accurately.
 *
 * @returns the local session ID (UUID)
 */
export async function queueOfflineSession(input: {
  title: string;
  mode: "immediate" | "final";
  sourceType: "bank" | "exam";
  sourceId: string;
  bankId?: string;
  answers: Array<{
    questionId: string;
    userAnswer: string | null;
    userAnswer2?: string | null;
  }>;
}): Promise<string> {
  const now = new Date().toISOString();
  const offlineSession: OfflineSession = {
    id: generateLocalId(),
    title: input.title,
    mode: input.mode,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    bankId: input.bankId,
    answers: input.answers.map((a) => ({
      questionId: a.questionId,
      userAnswer: a.userAnswer,
      userAnswer2: a.userAnswer2 ?? null,
      answeredAt: now,
    })),
    startedAt: now,
    completedAt: now,
    synced: false,
  };
  await txPut(STORE_SESSIONS, offlineSession);
  return offlineSession.id;
}

/**
 * Lists all locally-queued sessions (synced or not).
 */
export async function getOfflineSessions(): Promise<OfflineSession[]> {
  return txGetAll<OfflineSession>(STORE_SESSIONS);
}

/**
 * Attempts to submit each unsynced offline session to the server via the
 * standard /api/sessions flow:
 *   1. POST /api/sessions          → creates the session + answer rows
 *   2. GET  /api/sessions/[id]     → fetches the server-assigned answerIds
 *   3. PATCH /api/sessions/[id]/answers/[answerId] → records each answer
 *   4. POST /api/sessions/[id]/complete → finalises the score
 *
 * Should be called when the connection is restored, or manually from the UI.
 *
 * @returns a SyncResult summarising the operation
 */
export async function syncOfflineSessions(): Promise<SyncResult> {
  const sessions = await getOfflineSessions();
  const pending = sessions.filter((s) => !s.synced);

  const result: SyncResult = {
    total: pending.length,
    success: 0,
    failed: 0,
    details: [],
  };

  if (pending.length === 0) return result;

  for (const session of pending) {
    try {
      // 1. Create the session on the server.
      const createRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: session.title,
          mode: session.mode,
          sourceType: session.sourceType,
          sourceId: session.sourceId,
          questionIds: session.answers.map((a) => a.questionId),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err?.error || `create failed (${createRes.status})`);
      }

      const created = await createRes.json();
      const newSessionId = created.id as string;

      // 2. Fetch the server-side answer rows to map questionId → answerId.
      const detailRes = await fetch(`/api/sessions/${newSessionId}`);
      if (!detailRes.ok) {
        throw new Error(`detail fetch failed (${detailRes.status})`);
      }
      const detail = await detailRes.json();
      const serverAnswers: Array<{ id: string; questionId: string }> =
        detail.answers ?? [];

      // 3. PATCH each answer.
      for (const a of session.answers) {
        const match = serverAnswers.find((sa) => sa.questionId === a.questionId);
        if (!match) continue;
        // Skip null answers (skipped questions) — leave isCorrect null.
        if (!a.userAnswer) continue;
        try {
          await fetch(`/api/sessions/${newSessionId}/answers/${match.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAnswer: a.userAnswer }),
          });
        } catch {
          // Best-effort: continue with the next answer.
        }
      }

      // 4. Mark the session as completed.
      try {
        await fetch(`/api/sessions/${newSessionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // Best-effort: the session is still created and answered.
      }

      // 5. Mark local copy as synced.
      session.synced = true;
      session.syncedAt = new Date().toISOString();
      await txPut(STORE_SESSIONS, session);

      result.success += 1;
      result.details.push({ id: session.id, ok: true });
    } catch (e) {
      result.failed += 1;
      result.details.push({
        id: session.id,
        ok: false,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  return result;
}

/**
 * Removes all synced sessions older than `keepDays` days to keep storage
 * tidy. Defaults to 7 days.
 */
export async function purgeSyncedSessions(keepDays = 7): Promise<number> {
  const sessions = await getOfflineSessions();
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  let purged = 0;
  for (const s of sessions) {
    if (s.synced && s.syncedAt && new Date(s.syncedAt).getTime() < cutoff) {
      await txDelete(STORE_SESSIONS, s.id);
      memorySessions.delete(s.id);
      purged += 1;
    }
  }
  return purged;
}

/**
 * Computes the total storage used by offline banks (in bytes).
 */
export async function getOfflineStorageSize(): Promise<number> {
  const banks = await txGetAll<OfflineBank>(STORE_BANKS);
  return banks.reduce((sum, b) => sum + (b.sizeBytes ?? 0), 0);
}

/**
 * Registers a one-time listener that automatically syncs offline sessions
 * when the browser goes back online. Returns an unsubscribe function.
 */
export function registerAutoSync(onSynced?: (r: SyncResult) => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = async () => {
    try {
      const result = await syncOfflineSessions();
      onSynced?.(result);
    } catch (e) {
      console.error("[offline-manager] auto-sync failed:", e);
    }
  };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
>>>>>>> Stashed changes
}
