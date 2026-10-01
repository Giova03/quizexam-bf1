"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuizStore } from "@/shared/stores/quiz-store";
import { usePrefs } from "@/shared/stores/prefs-store";
import { useQuests } from "@/shared/stores/quests-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { QuizSession, SessionAnswer } from "@/lib/types";
import { Confetti, ProgressRing } from "./animated-components";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Flag,
  Zap,
  Trophy,
  AlertCircle,
  Timer,
  Sparkles,
  Keyboard,
} from "lucide-react";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Module-level set of session IDs already recorded by prefs/quests stores.
 * Prevents double-counting XP/coins/streak when the user re-opens the
 * results view (which can happen via navigation, page reload, etc.). The set
 * is backed by localStorage so it survives reloads.
 */
const RECORDED_KEY = "quizexam:recorded-sessions";
function readRecordedSet(): Set<string> {
  try {
    const raw = window.localStorage.getItem(RECORDED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}
function markSessionRecorded(id: string) {
  try {
    const set = readRecordedSet();
    set.add(id);
    // Keep the last 200 entries to avoid unbounded growth.
    const arr = Array.from(set).slice(-200);
    window.localStorage.setItem(RECORDED_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}
function isSessionRecorded(id: string): boolean {
  return readRecordedSet().has(id);
}

type FeedbackAnim = "correct" | "wrong" | null;

/* ------------------------------------------------------------------ */
/* V15 — helpers d'animation de l'expérience quiz                       */
/* ------------------------------------------------------------------ */

/** mm:ss — chrono discret affiché dans la barre HUD. */
function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Variante d'entrée des options : cascade intelligente (60 ms / option). */
const optionVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.34, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/**
 * SessionView (V15 « Quiz immersif »).
 *
 * Modernisation complète du déroulé d'un quiz — tout ce qui vient APRÈS
 * avoir commencé une session :
 *   - transitions de questions SENSIBLES À LA DIRECTION (Suivant → glisse
 *     vers la gauche, Précédent → vers la droite, ressort physique) ;
 *   - options révélées en cascade, pression tactile (whileTap), icônes
 *     correct/faux qui apparaissent en pop ressorti ;
 *   - navigator de questions avec pilule partagée (layoutId) qui GLISSE
 *     d'une question à l'autre au lieu de sauter ;
 *   - barre de progression en dégradé animé avec reflet balayant ;
 *   - HUD enrichi : chrono temps réel (depuis startedAt), anneau de
 *     progression, badges de mode ;
 *   - RACCOURCIS CLAVIER : ← / → pour naviguer, A–D ou 1–4 pour répondre ;
 *   - invite pulsante « Suivant » après une réponse corrigée immédiatement,
 *     bouton « Terminer » qui pulse quand tout est répondu ;
 *   - panneau d'explication qui se déplie en douceur (AnimatePresence) ;
 *   - focus clavier déplacé sur la carte de question (accessibilité) ;
 *   - respect de prefers-reduced-motion partout.
 */
export function SessionView() {
  const { currentSessionId, viewResults, goHome } = useQuizStore();
  const recordSessionPref = usePrefs((s) => s.recordSession);
  const recordSessionQuest = useQuests((s) => s.recordSession);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // E3: feedback animations + confetti
  const [feedbackAnim, setFeedbackAnim] = useState<FeedbackAnim>(null);
  const [confettiFire, setConfettiFire] = useState(0);
  const reduceMotion = useReducedMotion();
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // V15 — direction de navigation (+1 = Suivant, -1 = Précédent) et chrono.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const questionCardRef = useRef<HTMLDivElement | null>(null);

  const loadSession = useCallback(async () => {
    if (!currentSessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        const firstUnanswered = data.answers.findIndex(
          (a: SessionAnswer) => a.userAnswer === null
        );
        setCurrentIdx(firstUnanswered >= 0 ? firstUnanswered : 0);
      } else {
        setError("Impossible de charger la session.");
      }
    } catch (e) {
      console.error("Failed to load session", e);
      setError("Erreur de chargement de la session.");
    } finally {
      setLoading(false);
    }
  }, [currentSessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Clean up the shake timer on unmount.
  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // Reset the feedback animation whenever the current question changes so
  // the shake / pop-in only plays once per answer.
  useEffect(() => {
    setFeedbackAnim(null);
  }, [currentIdx]);

  // V15 — chrono : temps écoulé depuis le début réel de la session
  // (startedAt), rafraîchi chaque seconde. Silencieux et léger.
  useEffect(() => {
    if (!session?.startedAt) return;
    const started = new Date(session.startedAt).getTime();
    if (Number.isNaN(started)) return;
    const tick = () =>
      setElapsedSec(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session?.startedAt]);

  // V15 — focus clavier sur la carte de question à chaque changement
  // (navigation accessible, sans scroll forcé).
  useEffect(() => {
    if (loading || !session) return;
    questionCardRef.current?.focus({ preventScroll: true });
  }, [currentIdx, loading, session]);

  async function submitAnswer(answerId: string, choice: "A" | "B" | "C" | "D") {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sessions/${session.id}/answers/${answerId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAnswer: choice }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setSession(updated);

        // E3: trigger confetti on correct, shake on wrong — only in
        // immediate mode (final mode gives no feedback until the end).
        if (session.mode === "immediate") {
          const justAnswered = updated.answers?.find(
            (a: SessionAnswer) => a.id === answerId,
          );
          if (justAnswered?.isCorrect === true) {
            setFeedbackAnim("correct");
            setConfettiFire((n) => n + 1);
          } else if (justAnswered?.isCorrect === false) {
            setFeedbackAnim("wrong");
            if (!reduceMotion) {
              if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
              shakeTimerRef.current = setTimeout(
                () => setFeedbackAnim(null),
                600,
              );
            }
          }
        }
      } else {
        setError("Erreur lors de l'enregistrement.");
      }
    } catch (e) {
      console.error("Failed to submit answer", e);
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function completeSession() {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const completed = (await res.json()) as QuizSession;
        setSession(completed);

        // --- Record the session into the local gamification stores (E4) ---
        // Guarded by a localStorage-backed set so the same session is only
        // ever recorded once across reloads.
        if (!isSessionRecorded(completed.id)) {
          markSessionRecorded(completed.id);
          const correct = (completed.answers ?? []).filter(
            (a) => a.isCorrect === true,
          ).length;
          const total = completed.totalQuestions;
          const isDailyChallenge =
            completed.sourceType === "bank" &&
            completed.sourceId === "daily-challenge";
          const isExam = completed.sourceType === "exam";
          const ctx = {
            bankId: isDailyChallenge
              ? undefined
              : completed.sourceType === "bank"
                ? completed.sourceId
                : undefined,
            isExam,
            isDailyChallenge,
            completedAt: completed.completedAt ?? new Date().toISOString(),
            startedAt: completed.startedAt,
          };
          recordSessionPref(correct, total, ctx);
          recordSessionQuest({
            correct,
            total,
            bankId: ctx.bankId,
            isDailyChallenge,
          });
        }

        setConfirmOpen(false);
        viewResults(completed.id);
      } else {
        setError("Échec de la finalisation.");
      }
    } catch (e) {
      console.error("Failed to complete session", e);
      setError("Erreur lors de la finalisation.");
    } finally {
      setSubmitting(false);
    }
  }

  // V15 — navigation centralisée avec direction (pour les transitions).
  const goTo = useCallback(
    (idx: number) => {
      setCurrentIdx((cur) => {
        const next = Math.max(0, Math.min(idx, (session?.answers?.length ?? 1) - 1));
        if (next !== cur) setDirection(next > cur ? 1 : -1);
        return next;
      });
    },
    [session?.answers?.length],
  );

  const answers = session?.answers ?? [];

  // V15 — RACCOURCIS CLAVIER : ←/→ naviguent, A–D / 1–4 répondent.
  // Ignorés pendant la soumission, le dialogue de fin ou le chargement.
  useEffect(() => {
    if (!session || loading) return;
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || submitting) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(currentIdx + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(currentIdx - 1);
      } else if (!submitting && answers[currentIdx]?.userAnswer === null) {
        const key = e.key.toUpperCase();
        const letterIdx = ["A", "B", "C", "D"].indexOf(key);
        const digitIdx = ["1", "2", "3", "4"].indexOf(e.key);
        const idx = letterIdx >= 0 ? letterIdx : digitIdx;
        if (idx >= 0 && answers[currentIdx]) {
          e.preventDefault();
          submitAnswer(answers[currentIdx].id, OPTION_LETTERS[idx]);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, loading, confirmOpen, submitting, currentIdx, goTo, answers]);

  if (loading) {
    // V15 — squelette en forme de quiz (progression + question + options).
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Chargement du quiz">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-7 rounded-md" />
          ))}
        </div>
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => loadSession()} className="mt-4 gap-2">
          Réessayer
        </Button>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Session introuvable.</p>
        <Button onClick={goHome} className="mt-4">Retour à l&apos;accueil</Button>
      </Card>
    );
  }

  if (answers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <p className="mt-3 text-sm text-muted-foreground">
          Cette session ne contient aucune question.
        </p>
        <Button onClick={goHome} className="mt-4">Retour à l&apos;accueil</Button>
      </Card>
    );
  }
  const current = answers[currentIdx] ?? answers[0];
  const isImmediate = session.mode === "immediate";
  const showFeedback = isImmediate && current?.userAnswer !== null;
  const answeredCount = answers.filter((a) => a.userAnswer !== null).length;
  const progress = Math.round((answeredCount / answers.length) * 100);
  const allAnswered = answeredCount === answers.length;
  // V15 — invite « Suivant » : en mode immédiat, dès que la question
  // courante vient d'être corrigée, on guide vers la suite.
  const hintNext = isImmediate && !!current?.userAnswer && currentIdx < answers.length - 1;

  return (
    <div className="space-y-6">
      {/* Confetti burst on correct answer */}
      <Confetti fire={confettiFire} count={70} duration={2600} />
      {/* V15 — annonces lecteur d'écran pour chaque réponse */}
      <span aria-live="polite" className="sr-only">
        {showFeedback
          ? current.isCorrect
            ? "Bonne réponse."
            : "Mauvaise réponse."
          : ""}
      </span>

      {/* Top bar HUD — V15 : chrono temps réel + anneau de progression */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" className="h-11 shrink-0 gap-2 sm:h-8" onClick={goHome}>
            <ArrowLeft className="h-4 w-4" />
            Quitter
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-sm font-bold leading-tight sm:text-lg">{session.title}</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIdx + 1} sur {answers.length}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* V15 — chrono live */}
          <Badge
            variant="outline"
            className="gap-1.5 border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Timer className="h-3 w-3" />
            {formatElapsed(elapsedSec)}
          </Badge>
          <Badge
            variant="outline"
            className={
              isImmediate
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-violet-200 bg-violet-50 text-violet-700"
            }
          >
            {isImmediate ? (
              <>
                <Zap className="mr-1 h-3 w-3" />
                Correction immédiate
              </>
            ) : (
              <>
                <Flag className="mr-1 h-3 w-3" />
                Correction finale
              </>
            )}
          </Badge>
          <Badge variant="secondary">
            {answeredCount}/{answers.length} répondues
          </Badge>
          <ProgressRing
            value={progress / 100}
            size={48}
            strokeWidth={5}
            progressColor={isImmediate ? "#10b981" : "#8b5cf6"}
            className="shrink-0 text-muted-foreground"
          >
            <span className="text-[10px] font-bold text-foreground">
              {progress}%
            </span>
          </ProgressRing>
        </div>
      </div>

      {/* Question grid — V15 : pilule « courante » en layoutId qui GLISSE
          d'une case à l'autre (ressort), + focus ring clavier. */}
      <div
        className="flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded-lg bg-muted/30 p-2 sm:max-h-none sm:bg-transparent sm:p-0"
        role="tablist"
        aria-label="Navigation entre les questions"
      >
        {answers.map((a, idx) => {
          const isAnswered = a.userAnswer !== null;
          const isCurrent = idx === currentIdx;
          const isCorrect = isImmediate && a.isCorrect === true;
          const isWrong = isImmediate && a.isCorrect === false;
          return (
            <motion.button
              key={a.id}
              onClick={() => goTo(idx)}
              whileTap={reduceMotion ? undefined : { scale: 0.88 }}
              className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                isCurrent
                  ? "text-white"
                  : isCorrect
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : isWrong
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      : isAnswered
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
              aria-label={`Question ${idx + 1}${isCurrent ? " (courante)" : ""}`}
              aria-selected={isCurrent}
              role="tab"
            >
              {isCurrent && (
                <motion.span
                  layoutId="quizNavPill"
                  className="absolute inset-0 rounded-md bg-emerald-500 shadow-md ring-2 ring-emerald-300"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{idx + 1}</span>
            </motion.button>
          );
        })}
        {/* Rappel raccourcis — visible desktop uniquement */}
        <span className="ml-auto hidden items-center gap-1 self-center pl-2 text-[10px] font-medium text-muted-foreground/70 sm:flex">
          <Keyboard className="h-3 w-3" />
          ← → · A–D
        </span>
      </div>

      {/* V15 — barre de progression en dégradé + reflet balayant */}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${
            isImmediate
              ? "from-emerald-500 via-teal-400 to-emerald-500"
              : "from-violet-500 via-fuchsia-400 to-violet-500"
          }`}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 26 }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 w-1/4 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={reduceMotion ? undefined : { x: ["-120%", "480%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Question card — V15 : transition SENSIBLE À LA DIRECTION (glisse
          gauche/droite selon Suivant/Précédent) + focus clavier. */}
      {current && (
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={reduceMotion ? false : { opacity: 0, x: 32 * direction, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 * direction, scale: 0.985 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card
              ref={questionCardRef}
              tabIndex={-1}
              className={`glass overflow-hidden p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:p-6 ${
                feedbackAnim === "wrong" ? "animate-shake" : ""
              } ${feedbackAnim === "correct" ? "animate-pop-in" : ""}`}
            >
              <div className="mb-4 flex items-start gap-3">
                <motion.span
                  key={`qnum-${currentIdx}`}
                  initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  {currentIdx + 1}
                </motion.span>
                <h2 className="min-w-0 flex-1 pt-1 text-base font-semibold leading-snug sm:text-lg">
                  {current.questionText}
                </h2>
              </div>

              <motion.div
                className="space-y-3"
                initial={reduceMotion ? false : "hidden"}
                animate="show"
              >
                {OPTION_LETTERS.map((letter, i) => {
                  const text =
                    letter === "A"
                      ? current.optionA
                      : letter === "B"
                        ? current.optionB
                        : letter === "C"
                          ? current.optionC
                          : current.optionD;
                  const isSelected = current.userAnswer === letter;
                  const isCorrectAnswer = current.correctAnswer === letter;

                  let stateClass =
                    "border-border hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm";
                  if (showFeedback) {
                    if (isCorrectAnswer) {
                      stateClass = "border-emerald-500 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,0.12)] dark:bg-emerald-950/30";
                    } else if (isSelected && !isCorrectAnswer) {
                      stateClass = "border-rose-500 bg-rose-50 shadow-[0_0_0_3px_rgba(244,63,94,0.12)] dark:bg-rose-950/30";
                    } else {
                      stateClass = "border-border opacity-60";
                    }
                  } else if (isSelected) {
                    stateClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                  }

                  return (
                    <motion.button
                      key={letter}
                      custom={i}
                      variants={reduceMotion ? undefined : optionVariants}
                      onClick={() => !current.userAnswer && submitAnswer(current.id, letter)}
                      disabled={!!current.userAnswer || submitting}
                      whileTap={!current.userAnswer && !reduceMotion ? { scale: 0.985 } : undefined}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 sm:min-h-0 sm:p-4 ${stateClass} ${
                        !current.userAnswer ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors duration-300 ${
                          showFeedback && isCorrectAnswer
                            ? "bg-emerald-500 text-white"
                            : showFeedback && isSelected && !isCorrectAnswer
                              ? "bg-rose-500 text-white"
                              : isSelected
                                ? "bg-emerald-500 text-white"
                                : "bg-muted"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="flex-1 break-words text-left text-sm sm:text-base">{text}</span>
                      {showFeedback && isCorrectAnswer && (
                        <motion.span
                          initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 460, damping: 20 }}
                        >
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        </motion.span>
                      )}
                      {showFeedback && isSelected && !isCorrectAnswer && (
                        <motion.span
                          initial={reduceMotion ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 460, damping: 20 }}
                        >
                          <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Feedback — V15 : panneau qui se déplie en douceur */}
              <AnimatePresence initial={false}>
                {showFeedback && (
                  <motion.div
                    key="feedback"
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className={`mt-4 rounded-lg p-4 text-sm ${
                      current.isCorrect
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                        : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                    }`}>
                      <p className="flex items-center gap-1.5 font-semibold">
                        {current.isCorrect ? (
                          <>
                            <Sparkles className="h-4 w-4" /> Correct !
                          </>
                        ) : (
                          "✗ Incorrect"
                        )}
                      </p>
                      <p className="mt-1">{current.explanation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Navigation — V15 : « Suivant » pulse après correction immédiate,
          « Terminer » pulse quand tout est répondu. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-full gap-2 sm:h-8 sm:w-auto"
          disabled={currentIdx === 0}
          onClick={() => goTo(currentIdx - 1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>

        {currentIdx < answers.length - 1 ? (
          <Button
            size="sm"
            className={`h-11 w-full gap-2 sm:h-8 sm:w-auto ${hintNext ? "animate-pulse" : ""}`}
            onClick={() => goTo(currentIdx + 1)}
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            className={`h-11 w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 sm:h-8 sm:w-auto ${
              allAnswered ? "animate-pulse" : ""
            }`}
            onClick={() => setConfirmOpen(true)}
          >
            <Trophy className="h-4 w-4" />
            Terminer
          </Button>
        )}
      </div>

      {/* Confirm dialog — FIX3: max-w-[95vw] on mobile + scrollable. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Terminer la session ?</DialogTitle>
            <DialogDescription>
              Vous avez répondu à {answeredCount} sur {answers.length} questions.
              {answeredCount < answers.length && " Les questions sans réponse seront comptées comme fausses."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Continuer
            </Button>
            <Button
              onClick={completeSession}
              disabled={submitting}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {submitting ? "Finalisation..." : "Terminer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
