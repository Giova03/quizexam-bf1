"use client";

// ============================================================================
// Push notifications — thin wrapper around the native Notification API.
//
// No service worker / push subscription: we rely on `new Notification()`
// which works on desktop browsers (Chrome/Edge/Firefox/Safari) and on
// Android Chrome. iOS Safari 16.4+ supports it when installed as a PWA.
//
// The "daily reminder" is implemented with `setTimeout` (per the spec):
// it fires once a day at the user's chosen time and re-arms itself for
// the next day. The timeout only lives for the lifetime of the page —
// it's intentionally simple (no service worker), so it only fires while
// the app tab is open.
// ============================================================================

const PREFS_KEY = "quizexam-push-prefs";

export interface PushPrefs {
  enabled: boolean;
  /** 24h time in "HH:MM" format. */
  reminderTime: string;
  /** ISO timestamp of the last shown reminder (for debugging / UI). */
  lastReminder?: string;
}

const DEFAULT_PREFS: PushPrefs = {
  enabled: false,
  reminderTime: "19:00",
};

// In-memory registry of active timeouts so we can cancel them when
// re-scheduling or disabling notifications. We keep a Set (not a single
// number) because scheduleDailyReminder may chain timeouts across days.
const timeoutIds = new Set<ReturnType<typeof setTimeout>>();

/**
 * Returns true if the browser supports the Notification API.
 * SSR-safe (returns false on the server).
 */
export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns the current Notification permission, or null if unsupported.
 */
export function getPermission(): NotificationPermission | null {
  if (!isSupported()) return null;
  return Notification.permission;
}

/**
 * Requests permission from the user to display notifications.
 * Resolves to true if permission was granted, false otherwise
 * (denied, dismissed, or unsupported).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    // Some browsers (older Safari) still use the callback form; the
    // promise form is universally supported in modern browsers.
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

/**
 * Shows a browser notification immediately. No-op if unsupported or
 * permission hasn't been granted.
 */
export function showNotification(
  title: string,
  body?: string,
  options?: NotificationOptions
): void {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/logo-quizexam.svg",
      badge: "/logo-quizexam.svg",
      tag: "quizexam-notification",
      ...options,
    });
    // Auto-close after 8 seconds so we don't leave orphans in the
    // notification center on OSes that keep them open.
    setTimeout(() => {
      try {
        n.close();
      } catch {
        /* ignore */
      }
    }, 8000);
  } catch {
    // Some environments (e.g. iOS Safari without PWA install) throw on
    // `new Notification()`. Swallow — the caller can fall back to a toast.
  }
}

/**
 * Reads the user's push preferences from localStorage. Returns the
 * default prefs (enabled: false, 19:00) if nothing is stored yet.
 */
export function getPrefs(): PushPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PushPrefs>;
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {
    /* ignore — corrupt JSON */
  }
  return { ...DEFAULT_PREFS };
}

/**
 * Persists the user's push preferences to localStorage.
 */
export function savePrefs(prefs: PushPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore — private mode / quota */
  }
}

/**
 * Cancels all pending scheduled reminder timeouts.
 */
export function clearScheduledReminders(): void {
  for (const id of timeoutIds) {
    clearTimeout(id);
  }
  timeoutIds.clear();
}

/**
 * Schedules a daily reminder using setTimeout.
 *
 * The reminder fires once a day at the given "HH:MM" time and
 * re-arms itself for the next day each time it fires (so it keeps
 * running while the app tab stays open). The chain is cancelled
 * automatically when `clearScheduledReminders()` is called or when
 * a new schedule is set.
 *
 * No-op if notifications are unsupported or permission isn't granted.
 */
export function scheduleDailyReminder(
  time: string,
  title: string = "QuizExam BF — Rappel quotidien",
  body: string = "C'est l'heure de votre session quotidienne ! Gardez votre série 🔥"
): void {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!/^\d{2}:\d{2}$/.test(time)) return;

  // Cancel any previously scheduled chain first.
  clearScheduledReminders();

  const scheduleNext = () => {
    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    // If the target time has already passed today, schedule for tomorrow.
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    const delay = next.getTime() - now.getTime();

    // setTimeout's delay is capped at ~2^31 ms (~24.8 days) in modern
    // browsers, so a 24h delay is well within range.
    const id = setTimeout(() => {
      showNotification(title, body);
      try {
        savePrefs({ ...getPrefs(), lastReminder: new Date().toISOString() });
      } catch {
        /* ignore */
      }
      // Re-arm for the next day (closure captures `time`, `title`, `body`).
      scheduleNext();
    }, delay);
    timeoutIds.add(id);
  };

  scheduleNext();
}
