"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useTranslation } from "@/lib/use-translation";

/**
 * GoogleButton (V8) — Connexion Google qui FONCTIONNE dès maintenant.
 *
 * DEUX chemins actifs en parallèle, par ordre de priorité :
 *
 *   1. GOOGLE IDENTITY SERVICES (GIS) — chemin principal, actif avec le seul
 *      CLIENT ID (public par nature) : le bouton officiel Google est rendu,
 *      le popup renvoie un ID Token vérifié côté serveur par le provider
 *      "google-idtoken" (src/lib/auth.ts). AUCUN client secret nécessaire.
 *      Prérequis côté Google Cloud Console : ajouter l'origine du site
 *      (https://quizexam-bf1-5tlh.vercel.app) dans « Authorized JavaScript
 *      origins » du client OAuth.
 *
 *   2. OAUTH REDIRECT NEXTAUTH — si GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 *      sont configurés côté serveur, le bouton « Continuer avec Google »
 *      custom déclenche le flux OAuth classique via signIn("google").
 *
 *   3. Si ni GIS ni le provider serveur ne sont disponibles : encart
 *      informatif dépliable avec les instructions exactes (au lieu d'un
 *      bouton fantôme).
 *
 * Après la connexion (n'importe quel chemin), NextAuth crée ou lie le compte
 * local par email (voir findOrCreateGoogleUser dans src/lib/auth.ts) : les
 * sessions, XP, badges et le code de parrainage d'un compte existant sont
 * conservés.
 */

/** Client ID OAuth Google — public par nature (figure dans les pages HTML). */
const GOOGLE_CLIENT_ID_FALLBACK =
  "447645518029-6kv7hant8ogjo9lbto888hfimidp9mus.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;

/* -------------------------------------------------------------- */
/* Typage minimal de Google Identity Services                      */
/* -------------------------------------------------------------- */

interface GsiCredentialResponse {
  credential?: string;
}

interface GsiButtonConfig {
  type?: string;
  theme?: string;
  size?: string;
  text?: string;
  shape?: string;
  logo_alignment?: string;
  width?: number;
  locale?: string;
}

interface GsiIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: GsiCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonConfig) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiIdApi } };
  }
}

/** Charge le script GIS une seule fois (promise mémoïsée). */
let gsiScriptPromise: Promise<boolean> | null = null;

function loadGsiScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(Boolean(window.google?.accounts?.id));
    script.onerror = () => {
      gsiScriptPromise = null; // permettra un re-tentatif au prochain mount
      resolve(false);
    };
    document.head.appendChild(script);
    // Filet de sécurité : si le script n'a pas répondu en 8 s (réseau lent,
    // extension de blocage), on libère le fallback sans bloquer l'UI.
    window.setTimeout(() => {
      if (!window.google?.accounts?.id) resolve(false);
    }, 8000);
  });
  return gsiScriptPromise;
}

/* -------------------------------------------------------------- */
/* Hook : le provider serveur "google" (OAuth redirect) est-il actif ? */
/* -------------------------------------------------------------- */

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
        /* providers endpoint unreachable — fallback only */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return googleEnabled;
}

/* -------------------------------------------------------------- */
/* Composant                                                       */
/* -------------------------------------------------------------- */

interface GoogleButtonProps {
  /** Optional override text. Defaults to "Continuer avec Google". */
  label?: string;
  className?: string;
  /** Callback fired when the OAuth redirect starts (to close dialogs, etc.). */
  onRedirectStart?: () => void;
}

export function GoogleButton({
  label,
  className = "",
  onRedirectStart,
}: GoogleButtonProps) {
  const googleEnabled = useGoogleEnabled();
  const { t, locale } = useTranslation();
  const [showHint, setShowHint] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const gisContainerRef = useRef<HTMLDivElement | null>(null);
  const text = label ?? t("auth.google.continue");

  // V8 — GIS : rendre le bouton officiel Google dès que le script est prêt.
  useEffect(() => {
    let cancelled = false;
    loadGsiScript().then((ok) => {
      if (!cancelled && ok) setGisReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gisReady) return;
    const container = gisContainerRef.current;
    const idApi = window.google?.accounts?.id;
    if (!container || !idApi) return;

    try {
      idApi.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          const credential = response?.credential;
          if (!credential) {
            setErrorMessage(t("auth.google.failed"));
            return;
          }
          setPending(true);
          setErrorMessage(null);
          onRedirectStart?.();
          signIn("credentials", {
            idToken: credential,
            callbackUrl: "/",
          })
            .then((res) => {
              if (res?.error) {
                setErrorMessage(t("auth.google.failed"));
                setPending(false);
              }
              // succès : redirection plein écran gérée par NextAuth
            })
            .catch(() => {
              setErrorMessage(t("auth.google.failed"));
              setPending(false);
            });
        },
        cancel_on_tap_outside: true,
      });
      idApi.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: Math.min(container.clientWidth || 320, 400),
        locale: locale === "en" ? "en" : "fr",
      });
    } catch {
      // GIS a refusé le rendu (origin non autorisé, etc.) → fallback visible.
      setGisReady(false);
    }
  }, [gisReady, locale, onRedirectStart, t]);

  /** Chemin 2 : OAuth redirect NextAuth (nécessite le secret côté serveur). */
  const handleLegacyRedirect = useCallback(() => {
    setPending(true);
    onRedirectStart?.();
    signIn("google", { callbackUrl: "/" }).catch(() => setPending(false));
  }, [onRedirectStart]);

  return (
    <div className={className}>
      {/* Chemin 1 : bouton officiel Google (GIS) — prioritaire */}
      {gisReady ? (
        <div
          ref={gisContainerRef}
          className="flex min-h-11 w-full justify-center"
          aria-label={text}
        />
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setErrorMessage(null);
            if (!googleEnabled) {
              setShowHint((v) => !v);
              return;
            }
            handleLegacyRedirect();
          }}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-input bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:translate-y-0 dark:bg-white/95 dark:hover:bg-white ${className}`}
          aria-label={text}
        >
          {/* Official Google "G" logo (4-color) */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 48 48"
            aria-hidden="true"
            className={`shrink-0 ${pending ? "animate-spin" : ""}`}
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
          {pending ? t("auth.google.connecting") : text}
        </button>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50/70 p-2.5 text-[11px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300"
        >
          {errorMessage}
        </p>
      )}

      {!googleEnabled && !gisReady && showHint && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 overflow-hidden"
        >
          <p className="rounded-lg border border-blue-200 bg-blue-50/70 p-2.5 text-[11px] leading-relaxed text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-200">
            {t("auth.google.notConfigured")}{" "}
            <a
              href="/setup"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              {t("auth.openDiagnostics")}
            </a>
          </p>
        </motion.div>
      )}

      {/* Encart affiché quand GIS est prêt mais que Google refuse l'origine
          (popup « origin not allowed ») — instructions exactes. */}
      {gisReady && showHint && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 overflow-hidden"
        >
          <p className="rounded-lg border border-blue-200 bg-blue-50/70 p-2.5 text-[11px] leading-relaxed text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-200">
            {t("auth.google.origins")}{" "}
            <code className="rounded bg-blue-100 px-1 py-0.5 text-[10px] dark:bg-blue-900/60">
              https://quizexam-bf1-5tlh.vercel.app
            </code>{" "}
            {t("auth.google.origins2")}{" "}
            <a
              href="/setup"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              {t("auth.openDiagnostics")}
            </a>
          </p>
        </motion.div>
      )}
    </div>
  );
}
