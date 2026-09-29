"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  PartyPopper,
  School,
  Building2,
  Target,
  Sparkles,
  BookOpenCheck,
  Trophy,
  WifiOff,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

/**
 * OnboardingWizard (V3) — full-screen multi-step welcome flow shown once
 * after signup (or first login on a fresh account).
 *
 * Steps: 0 welcome → 1 education level → 2 favourite subjects → 3 daily goal.
 * Everything animates (AnimatePresence slide/fade, progress bar, confetti on
 * completion). The result is persisted to the server (POST
 * /api/profile/onboarding → User.onboardingDone + educationLevel) and to
 * localStorage (daily goal + interests) so the dashboard can pre-personalise.
 *
 * Failure modes are silent-by-design: if the API is unreachable the wizard
 * still closes and stores a local dismissal flag so it never blocks the user.
 */

const STORAGE_DISMISSED = "onboarding:v3:done";

const LEVELS = [
  {
    id: "BEPC",
    label: "BEPC",
    hint: "Collège · 3e",
    icon: School,
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    id: "BAC",
    label: "Baccalauréat",
    hint: "Lycée · Terminale",
    icon: GraduationCap,
    gradient: "from-cyan-400 to-sky-500",
  },
  {
    id: "LICENCE",
    label: "Licence",
    hint: "Enseignement supérieur",
    icon: Building2,
    gradient: "from-amber-400 to-orange-500",
  },
  {
    id: "CONCOURS",
    label: "Concours",
    hint: "ENA, Douanes, Police…",
    icon: Target,
    gradient: "from-rose-400 to-pink-500",
  },
] as const;

const GOALS = [
  { id: 10, label: "10 questions / jour", hint: "Rythme tranquille", icon: BookOpenCheck },
  { id: 20, label: "20 questions / jour", hint: "Rythme conseillé", icon: Sparkles },
  { id: 30, label: "30 questions / jour", hint: "Objectif concours", icon: Trophy },
] as const;

const FALLBACK_SUBJECTS = [
  "Mathématiques",
  "Français",
  "Culture générale",
  "Histoire-Géographie",
  "Sciences",
  "Anglais",
  "Droit",
  "Économie",
  "Philosophie",
  "Physique-Chimie",
  "SVT",
  "Logique",
];

interface OnboardingWizardProps {
  /** Rendered only when the session is authenticated (parent controls this). */
  active: boolean;
}

export function OnboardingWizard({ active }: OnboardingWizardProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  // Lazy init: skip the network probe entirely when a dismissal flag is
  // already stored (avoids a synchronous setState inside the effect below).
  const [checking, setChecking] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.localStorage.getItem(STORAGE_DISMISSED);
  });
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [goal, setGoal] = useState<number>(20);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(FALLBACK_SUBJECTS);
  const userName = session?.user?.name?.split(" ")[0] ?? "";

  /* ---- Decide whether to show the wizard ---- */
  useEffect(() => {
    if (!active || !checking) return;
    let cancelled = false;

    fetch("/api/profile/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.onboardingDone === false) {
          setOpen(true);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_DISMISSED, "1");
          }
        }
        // If the API says done, or errors (likely local dev without DB),
        // never show — fail-open so onboarding never blocks the app.
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, checking]);

  /* ---- Fetch bank categories for the interests step ---- */
  useEffect(() => {
    if (!open) return;
    fetch("/api/banks")
      .then((res) => (res.ok ? res.json() : []))
      .then((banks) => {
        if (!Array.isArray(banks) || banks.length === 0) return;
        const categories = [
          ...new Set(
            banks.map((b: { category?: string }) => b.category?.trim()).filter(Boolean)
          ),
        ] as string[];
        if (categories.length > 0) {
          setAvailableSubjects(categories.sort((a, b) => a.localeCompare(b, "fr")).slice(0, 12));
        }
      })
      .catch(() => {
        /* keep fallback list */
      });
  }, [open]);

  const finish = useCallback(
    async (skipped: boolean) => {
      setSaving(true);
      try {
        await fetch("/api/profile/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            educationLevel: level ?? undefined,
            skipped,
          }),
        });
      } catch {
        /* best-effort — local flags already saved */
      }
      try {
        if (level) window.localStorage.setItem("onboarding:level", level);
        window.localStorage.setItem("onboarding:interests", JSON.stringify(subjects));
        window.localStorage.setItem("onboarding:dailyGoal", String(goal));
        window.localStorage.setItem(STORAGE_DISMISSED, "1");
      } catch {
        /* storage unavailable */
      }
      setSaving(false);
      setOpen(false);
      if (!skipped) {
        toast.success("Bienvenue à bord ! Votre profil est prêt. 🎉", {
          description: "Vous pouvez le modifier à tout moment dans les réglages.",
        });
      }
    },
    [level, subjects, goal]
  );

  const toggleSubject = (subject: string) => {
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const progress = useMemo(() => ((step + 1) / 4) * 100, [step]);

  if (!active || checking || !open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#04140f]/80 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenue sur QuizExam BF"
      >
        {/* Confetti on last step */}
        {step === 3 && <Confetti />}

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-background shadow-2xl"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-[#04140f] px-6 pb-6 pt-7 text-emerald-50">
            <div className="absolute inset-0 bg-grid-dark" aria-hidden="true" />
            <div
              className="aurora-blob h-40 w-40 bg-emerald-500/30"
              style={{ top: "-40%", left: "-5%" }}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => finish(true)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-emerald-100/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Passer l'onboarding"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative">
              <div className="mb-3 flex items-center gap-1.5" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i <= step ? "w-7 bg-gradient-to-r from-emerald-400 to-teal-400" : "w-3 bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Étape {step + 1} / 4
              </p>
              <p className="mt-1 text-sm text-emerald-100/70">
                Personnalisez votre expérience
              </p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative min-h-[320px] px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 && (
                  <div className="flex flex-col items-center py-6 text-center">
                    <div className="animate-float flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/25">
                      <PartyPopper className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">
                      Bienvenue{userName ? `, ${userName}` : ""} !
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      Vous venez de rejoindre la plateforme de préparation aux
                      concours du Burkina Faso. En 30 secondes, configurons
                      ensemble votre espace pour que chaque révision compte.
                    </p>
                    <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
                      {[
                        { icon: Target, label: "Objectifs" },
                        { icon: BookOpenCheck, label: "Révisions" },
                        { icon: WifiOff, label: "Hors ligne" },
                      ].map((f) => (
                        <div
                          key={f.label}
                          className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/40 p-3"
                        >
                          <f.icon className="h-5 w-5 text-emerald-500" />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <StepTitle
                      title="Quel est votre niveau d'études ?"
                      subtitle="Nous filtrons les banques de questions pour ne montrer que ce qui vous concerne."
                    />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {LEVELS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLevel(l.id)}
                          className={`group flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                            level === l.id
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                              : "hover:border-primary/40 hover:bg-muted/50"
                          }`}
                          aria-pressed={level === l.id}
                        >
                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${l.gradient} text-white shadow-md transition-transform group-hover:scale-105`}
                          >
                            <l.icon className="h-5.5 w-5.5" />
                          </span>
                          <span className="font-display text-sm font-bold">{l.label}</span>
                          <span className="text-xs text-muted-foreground">{l.hint}</span>
                          {level === l.id && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                              <Check className="h-3 w-3" />
                              Sélectionné
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <StepTitle
                      title="Quelles matières vous intéressent ?"
                      subtitle="Sélectionnez-en autant que vous voulez — elles seront mises en avant sur votre accueil."
                    />
                    <div className="mt-5 flex flex-wrap gap-2">
                      {availableSubjects.map((subject) => {
                        const selected = subjects.includes(subject);
                        return (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => toggleSubject(subject)}
                            className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "bg-background hover:border-primary/40 hover:bg-muted"
                            }`}
                            aria-pressed={selected}
                          >
                            {selected && <Check className="mr-1 inline h-3.5 w-3.5" />}
                            {subject}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <StepTitle
                      title="Quel est votre objectif quotidien ?"
                      subtitle="La régularité gagne sur la quantité. Vous pourrez le modifier plus tard."
                    />
                    <div className="mt-5 space-y-3">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGoal(g.id)}
                          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                            goal === g.id
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                              : "hover:border-primary/40 hover:bg-muted/50"
                          }`}
                          aria-pressed={goal === g.id}
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              goal === g.id
                                ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <g.icon className="h-5 w-5" />
                          </span>
                          <span className="flex-1">
                            <span className="block font-display text-sm font-bold">
                              {g.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {g.hint}
                            </span>
                          </span>
                          {goal === g.id && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (step === 0 ? finish(true) : setStep((s) => s - 1))}
              disabled={saving}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 0 ? "Plus tard" : "Retour"}
            </Button>
            {step < 3 ? (
              <Button
                size="sm"
                className="min-w-32 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                onClick={() => setStep((s) => s + 1)}
              >
                {step === 0 ? "C'est parti" : "Continuer"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="min-w-32 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                onClick={() => finish(false)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Terminer
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** Lightweight CSS confetti burst — purely decorative. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        delay: `${Math.random() * 0.6}s`,
        duration: `${1.8 + Math.random() * 1.4}s`,
        color: ["#34d399", "#f5c542", "#2dd4bf", "#fbbf24", "#a7f3d0"][i % 5],
        size: 6 + Math.random() * 6,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
