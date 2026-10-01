"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { useTranslation } from "@/lib/use-translation";

/**
 * V16 — Bannière de consentement légal.
 *
 * « J'ai élaboré les politiques d'utilisation et de confidentialité… je ne
 * vois pas ça sur la page d'accueil, on devrait pouvoir avertir
 * l'utilisateur » : les pages /terms et /privacy (loi burkinabè
 * n°001-2004/AN) existent depuis la v13 mais étaient noyées dans le footer.
 * Cette bannière AVERTIT désormais chaque visiteur dès sa première visite
 * (mémoire localStorage, 12 mois), avec liens directs vers les deux pages.
 */

const CONSENT_KEY = "quizexam-legal-consent-v1";
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

function hasValidConsent(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < TWELVE_MONTHS_MS;
  } catch {
    return false;
  }
}

export function LegalConsentBanner() {
  const { t } = useTranslation();
  // null = pas encore hydraté (on ne rend rien côté serveur),
  // true/false = décision client (localStorage, 12 mois).
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    // Différé (micro-tâche) : évite un setState synchrone dans l'effet
    // (rendus en cascade) et garantit la décision après hydratation.
    const id = window.setTimeout(() => setVisible(!hasValidConsent()), 0);
    return () => window.clearTimeout(id);
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(CONSENT_KEY, String(Date.now()));
    } catch {
      /* stockage indisponible : on ferme simplement */
    }
    setVisible(false);
  }

  if (visible === null) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="legal-banner"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label={t("legal.banner.aria")}
          className="fixed inset-x-2 bottom-2 z-[90] sm:inset-x-4 sm:bottom-4"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:gap-4 dark:border-white/10 dark:bg-slate-900/95">
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="text-xs leading-relaxed text-slate-600 sm:text-[13px] dark:text-slate-300">
                {t("legal.banner.intro")}{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                >
                  {t("legal.terms")}
                </a>{" "}
                ·{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                >
                  {t("legal.privacy")}
                </a>
                {" — "}
                {t("legal.banner.law")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={accept}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:flex-none"
              >
                {t("legal.banner.accept")}
              </button>
              <button
                type="button"
                onClick={accept}
                aria-label={t("legal.banner.aria")}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
