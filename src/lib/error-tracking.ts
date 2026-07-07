/**
 * Error tracking — lightweight Sentry-like client (Feature E6.6).
 *
 * captureError(error, context) logs the error to the console and stores
 * it in localStorage (so it survives reloads). The admin panel can read
 * the stored errors via getStoredErrors() and show an error count badge.
 *
 * Designed to be hooked up to a real Sentry DSN later — just replace the
 * `captureError` body with a Sentry.captureException call.
 */

export interface TrackedError {
  /** Stable unique id (timestamp + random suffix). */
  id: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Error name (e.g. "TypeError", "Error"). */
  name: string;
  /** Error message. */
  message: string;
  /** Stack trace (truncated to 2 KB). */
  stack?: string;
  /** URL where the error occurred. */
  url?: string;
  /** Arbitrary context (component name, user id, action, …). */
  context?: Record<string, unknown>;
  /** Severity — defaults to "error". */
  severity?: "error" | "warning" | "info";
}

const STORAGE_KEY = "qebf-tracked-errors";
const MAX_ENTRIES = 100;
const MAX_STACK_LEN = 2000;

interface GlobalWithErrors {
  [key: string]: unknown;
}

/**
 * In-memory ring buffer (also persisted to localStorage) so:
 *   - The admin badge can read the count without parsing JSON on every render.
 *   - captureError works even if localStorage is unavailable (private mode).
 */
let memoryBuffer: TrackedError[] = [];
const GLOBAL_KEY = "qebf_error_buffer_v1";

function getGlobalBuffer(): TrackedError[] {
  if (typeof window === "undefined") return memoryBuffer;
  const g = window as unknown as GlobalWithErrors;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = memoryBuffer;
  } else {
    memoryBuffer = g[GLOBAL_KEY] as TrackedError[];
  }
  return memoryBuffer;
}

function loadFromStorage(): TrackedError[] {
  if (typeof window === "undefined") return memoryBuffer;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getGlobalBuffer();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryBuffer = parsed as TrackedError[];
      const g = window as unknown as GlobalWithErrors;
      g[GLOBAL_KEY] = memoryBuffer;
      return memoryBuffer;
    }
  } catch {
    // ignore
  }
  return getGlobalBuffer();
}

function saveToStorage(errors: TrackedError[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch {
    // ignore (quota exceeded, private mode, etc.)
  }
}

function genId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Capture an error. Logs to console + persists to localStorage.
 *
 * @param error  The Error object (or anything thrown).
 * @param context Optional metadata (component name, action, user id, …).
 * @param severity "error" (default) | "warning" | "info".
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
  severity: TrackedError["severity"] = "error",
): void {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : JSON.stringify(error));

  const entry: TrackedError = {
    id: genId(),
    timestamp: new Date().toISOString(),
    name: err.name || "Error",
    message: err.message || String(err),
    stack: err.stack?.slice(0, MAX_STACK_LEN),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    context,
    severity,
  };

  // Console log (always).
  if (severity === "error") {
    console.error("[captureError]", err, context ?? "");
  } else if (severity === "warning") {
    console.warn("[captureError]", err, context ?? "");
  } else {
    console.info("[captureError]", err, context ?? "");
  }

  // Persist (LRU — keep only the last MAX_ENTRIES).
  const buf = loadFromStorage();
  buf.push(entry);
  if (buf.length > MAX_ENTRIES) {
    memoryBuffer = buf.slice(buf.length - MAX_ENTRIES);
  } else {
    memoryBuffer = buf;
  }
  saveToStorage(memoryBuffer);
}

/**
 * Read all stored errors (most recent first).
 */
export function getStoredErrors(): TrackedError[] {
  return [...loadFromStorage()].reverse();
}

/**
 * Number of stored errors (for the admin badge).
 */
export function getErrorCount(): number {
  return loadFromStorage().length;
}

/**
 * Number of errors in the last `minutes` minutes.
 */
export function getRecentErrorCount(minutes = 60): number {
  const cutoff = Date.now() - minutes * 60_000;
  return loadFromStorage().filter(
    (e) => new Date(e.timestamp).getTime() >= cutoff,
  ).length;
}

/**
 * Clear all stored errors. Used by the admin "clear errors" button.
 */
export function clearStoredErrors(): void {
  memoryBuffer = [];
  saveToStorage([]);
}

/**
 * Install global error listeners (window.onerror + unhandledrejection).
 * Call this once on app mount. Returns a cleanup function.
 *
 * Subsequent calls are idempotent — the listeners are registered only once.
 */
let installed = false;
export function installGlobalErrorTracker(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const onError = (event: ErrorEvent) => {
    captureError(event.error ?? event.message, {
      type: "window.onerror",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    captureError(event.reason, { type: "unhandledrejection" });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
}
