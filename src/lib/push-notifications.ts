<<<<<<< Updated upstream
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
=======
/**
 * push-notifications.ts — client-side push notification helpers.
 *
 * Wraps the Notification API with safe guards for unsupported browsers,
 * SSR environments, and permission states. Also exposes a daily-reminder
 * scheduler that uses setTimeout (re-scheduled each day) — no service
 * worker required for the basic use-case.
 */

const REMINDER_KEY = "quizexam-push-reminder";

export interface PushSettings {
  enabled: boolean;
  time: string; // "HH:MM" 24h format
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof Notification !== "undefined";
}

/**
 * Returns the current permission state. Returns "unsupported" if the
 * Notification API is not available (e.g. SSR or older browsers).
 */
export function getPermission(): NotificationPermission | "unsupported" {
  if (!isBrowser()) return "unsupported";
>>>>>>> Stashed changes
  return Notification.permission;
}

/**
<<<<<<< Updated upstream
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
=======
 * Request notification permission from the user. Returns the new state.
 * Resolves to "unsupported" if the API is missing.
 */
export async function requestPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isBrowser()) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

/**
 * Show a local notification immediately. Returns false if not possible
 * (unsupported, permission not granted, or window not focused optional).
 */
export function showNotification(
  title: string,
  options?: NotificationOptions & { requireInteraction?: boolean }
): boolean {
  if (!isBrowser()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, {
      icon: "/logo-quizexam.svg",
      badge: "/logo-quizexam.svg",
      ...options,
    });
    // Auto-close after 8 seconds unless requireInteraction is set
    if (!options?.requireInteraction) {
      setTimeout(() => n.close(), 8000);
    }
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch (e) {
    console.error("Failed to show notification:", e);
>>>>>>> Stashed changes
    return false;
  }
}

/**
<<<<<<< Updated upstream
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
=======
 * Schedule a daily reminder at the given time (HH:MM).
 * Uses a re-scheduled setTimeout to remain accurate across days.
 * Persists the schedule in localStorage so it survives reloads; the
 * tour is re-armed on each page load by `restoreReminderIfEnabled()`.
 */
export function scheduleDailyReminder(time: string, message?: string): void {
  if (!isBrowser()) return;
  clearDailyReminder();

  const [h, m] = time.split(":").map((s) => parseInt(s, 10));
  if (isNaN(h) || isNaN(m)) return;

  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    // Today's slot already passed → schedule for tomorrow
    next.setDate(next.getDate() + 1);
  }
  const delay = next.getTime() - now.getTime();

  try {
    localStorage.setItem(
      REMINDER_KEY,
      JSON.stringify({
        time,
        message: message ?? "Il est temps de réviser vos quiz ! 📚",
        scheduledFor: next.toISOString(),
      })
    );
  } catch {
    // ignore
  }

  const timer = setTimeout(() => {
    if (Notification.permission === "granted") {
      showNotification("QuizExam BF — Rappel quotidien", {
        body: message ?? "Il est temps de réviser vos quiz ! 📚",
        tag: "daily-reminder",
      });
    }
    // Re-arm for the next day
    scheduleDailyReminder(time, message);
  }, delay);

  // Persist the timer id on the window object so clearDailyReminder can find it
  (window as unknown as { __pushReminderTimer?: ReturnType<typeof setTimeout> }).__pushReminderTimer = timer;
}

/**
 * Cancel any pending daily reminder.
 */
export function clearDailyReminder(): void {
  if (!isBrowser()) return;
  const w = window as unknown as { __pushReminderTimer?: ReturnType<typeof setTimeout> };
  if (w.__pushReminderTimer) {
    clearTimeout(w.__pushReminderTimer);
    delete w.__pushReminderTimer;
  }
  try {
    localStorage.removeItem(REMINDER_KEY);
  } catch {
    // ignore
  }
}

/**
 * On app load, re-arm the reminder if the user previously enabled it.
 * Safe to call multiple times.
 */
export function restoreReminderIfEnabled(): void {
  if (!isBrowser()) return;
  if (Notification.permission !== "granted") return;
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { time: string; message?: string };
    if (parsed.time) {
      scheduleDailyReminder(parsed.time, parsed.message);
    }
  } catch {
    // ignore
  }
}

/**
 * Persist the user's push settings in localStorage so the UI stays in sync.
 */
export function loadPushSettings(): PushSettings {
  if (!isBrowser()) return { enabled: false, time: "19:00" };
  try {
    const raw = localStorage.getItem("quizexam-push-settings");
    if (!raw) return { enabled: false, time: "19:00" };
    const parsed = JSON.parse(raw) as Partial<PushSettings>;
    return {
      enabled: !!parsed.enabled,
      time: parsed.time ?? "19:00",
    };
  } catch {
    return { enabled: false, time: "19:00" };
  }
}

export function savePushSettings(s: PushSettings): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem("quizexam-push-settings", JSON.stringify(s));
  } catch {
    // ignore
  }
>>>>>>> Stashed changes
}
