"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "quizexam-install-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  return isMobileUA || isSmallScreen;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  // Android/Chrome
  const chromeStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  return iosStandalone || chromeStandalone;
}

/** Detect iOS Safari (where beforeinstallprompt never fires). */
function computeIosHint(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;
  if (!shouldShowDismissed()) return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  return isIOS && isSafari && isMobile();
}

function shouldShowDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return true;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return true;
    return Date.now() - dismissedAt > DISMISS_DURATION_MS;
  } catch {
    return true;
  }
}

function markDismissed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * PWA install prompt banner.
 *
 * Listens for the `beforeinstallprompt` event (Chrome/Edge/Android) and shows
 * a sticky bottom banner with "Installer l'app" + "Plus tard" buttons.
 *
 * On iOS Safari, `beforeinstallprompt` never fires — instead we show a small
 * hint banner directing the user to use the Share → "Sur l'écran d'accueil"
 * action, but only on mobile.
 *
 * The banner is suppressed:
 *   - When the app is already running in standalone mode (installed).
 *   - When the user dismissed it less than 7 days ago.
 *   - On desktop unless a `beforeinstallprompt` event has fired.
 */
export function InstallPrompt() {
  // Compute initial state lazily — runs once on mount (client only).
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (isStandalone()) return false;
    if (!shouldShowDismissed()) return false;
    // On iOS Safari (no beforeinstallprompt event), show a hint banner
    // immediately when the user is on mobile.
    return computeIosHint();
  });
  // iOS hint is a static computed value (doesn't change after mount).
  const iosHint = computeIosHint();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (!shouldShowDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) {
      // Fallback (e.g. iOS or unsupported browser): open a help dialog.
      alert(
        "Pour installer l'application :\n\n" +
          "• Chrome (Android) : menu ⋮ → « Installer l'application »\n" +
          "• Safari (iOS) : bouton Partager → « Sur l'écran d'accueil »\n" +
          "• Edge / Chrome (PC) : icône d'installation dans la barre d'URL"
      );
      return;
    }
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
      // Clear the deferred event so it can fire again later if needed.
      setDeferred(null);
    } catch {
      /* user dismissed the native prompt */
    }
  }, [deferred]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'application QuizExam BF"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-2xl items-center gap-3 border-t bg-white/95 p-3 shadow-2xl backdrop-blur dark:bg-card/95 sm:m-3 sm:rounded-2xl sm:border sm:bottom-3 sm:left-auto sm:right-3 sm:shadow-xl"
    >
      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white sm:flex">
        <Smartphone className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          Installer QuizExam BF
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {iosHint
            ? "Appuyez sur Partager puis « Sur l'écran d'accueil » pour installer l'app."
            : "Accédez hors ligne, recevez des notifications et profitez d'une expérience plein écran."}
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleInstall}
        className="shrink-0 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
      >
        <Download className="h-4 w-4" />
        Installer l&apos;app
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDismiss}
        className="shrink-0 px-2"
        aria-label="Plus tard"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Plus tard</span>
      </Button>
    </div>
  );
}
