"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslation } from "@/lib/use-translation";

/**
 * GoogleButton (V3) — "Continuer avec Google" sign-in button.
 *
 * Rendered only when the Google OAuth provider is actually configured on the
 * server (i.e. GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set). We detect
 * that at runtime via NextAuth's native GET /api/auth/providers endpoint:
 * if "google" is not listed, the whole button is hidden so users never hit
 * a dead OAuth flow.
 *
 * On click we delegate to signIn("google") which performs the full redirect
 * flow. After Supabase-side Google OAuth returns, NextAuth creates or links
 * the local account (see src/lib/auth.ts — account linking is done by email
 * so existing credentials accounts are recovered automatically).
 */

interface GoogleButtonProps {
  /** Optional override text. Defaults to "Continuer avec Google". */
  label?: string;
  className?: string;
  /** Callback fired when the OAuth redirect starts (to close dialogs, etc.). */
  onRedirectStart?: () => void;
}

export function useGoogleEnabled() {
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((providers) => {
        if (!cancelled && providers && typeof providers === "object") {
          setGoogleEnabled("google" in providers);
        }
      })
      .catch(() => {
        /* providers endpoint unreachable — keep the button hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return googleEnabled;
}

export function GoogleButton({
  label,
  className = "",
  onRedirectStart,
}: GoogleButtonProps) {
  const googleEnabled = useGoogleEnabled();
  const { t } = useTranslation();
  const text = label ?? t("auth.google.continue");

  if (!googleEnabled) return null;

  return (
    <button
      type="button"
      onClick={() => {
        onRedirectStart?.();
        signIn("google", { callbackUrl: "/" });
      }}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-input bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 dark:bg-white/95 dark:hover:bg-white ${className}`}
      aria-label={text}
    >
      {/* Official Google "G" logo (4-color) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
        />
        <path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        />
      </svg>
      {text}
    </button>
  );
}
