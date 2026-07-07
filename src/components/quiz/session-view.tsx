"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { usePrefs } from "@/lib/prefs-store";
import { useQuests } from "@/lib/quests-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 rounded-xl" />
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

  const answers = session.answers ?? [];
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

  return (
    <div className="space-y-6">
      {/* Confetti burst on correct answer */}
      <Confetti fire={confettiFire} count={70} duration={2600} />

      {/* Top bar — FIX2: stacks vertically on mobile, row on sm+. */}
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
          {/* E3: progress ring (replaces the linear bar visual) */}
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

      {/* Question grid (compact navigation) — FIX2: wraps on mobile so we
          don't show 50 numbers in a single row. FIX3: max-h-24 on mobile to
          prevent horizontal overflow of long question counts. Each button is
          min 28x28 (32x32 on sm+) for comfortable tapping. */}
      <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded-lg bg-muted/30 p-2 sm:max-h-none sm:bg-transparent sm:p-0">
        {answers.map((a, idx) => {
          const isAnswered = a.userAnswer !== null;
          const isCurrent = idx === currentIdx;
          // In immediate mode we can also colour-code correctness.
          const isCorrect = isImmediate && a.isCorrect === true;
          const isWrong = isImmediate && a.isCorrect === false;
          return (
            <button
              key={a.id}
              onClick={() => setCurrentIdx(idx)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-all sm:h-7 sm:w-7 ${
                isCurrent
                  ? "bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300"
                  : isCorrect
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : isWrong
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      : isAnswered
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                        : "bg-muted text-muted-foreground"
              }`}
              aria-label={`Question ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Slim linear progress bar (kept for at-a-glance scan) */}
      <Progress value={progress} className="h-1.5" />

      {/* Question card — glass + smooth transitions */}
      {current && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card
              className={`glass overflow-hidden p-4 shadow-sm sm:p-6 ${
                feedbackAnim === "wrong" ? "animate-shake" : ""
              } ${feedbackAnim === "correct" ? "animate-pop-in" : ""}`}
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {currentIdx + 1}
                </span>
                <h2 className="min-w-0 flex-1 pt-1 text-base font-semibold leading-snug sm:text-lg">
                  {current.questionText}
                </h2>
              </div>

              <div className="space-y-3">
                {OPTION_LETTERS.map((letter) => {
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
                    "border-border hover:border-emerald-400 hover:bg-emerald-50/50";
                  if (showFeedback) {
                    if (isCorrectAnswer) {
                      stateClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                    } else if (isSelected && !isCorrectAnswer) {
                      stateClass = "border-rose-500 bg-rose-50 dark:bg-rose-950/30";
                    } else {
                      stateClass = "border-border opacity-60";
                    }
                  } else if (isSelected) {
                    stateClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                  }

                  return (
                    <button
                      key={letter}
                      onClick={() => !current.userAnswer && submitAnswer(current.id, letter)}
                      disabled={!!current.userAnswer || submitting}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all sm:min-h-0 sm:p-4 ${stateClass} ${
                        !current.userAnswer ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                        {letter}
                      </span>
                      <span className="flex-1 break-words text-left text-sm sm:text-base">{text}</span>
                      {showFeedback && isCorrectAnswer && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      )}
                      {showFeedback && isSelected && !isCorrectAnswer && (
                        <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {showFeedback && (
                <div className={`mt-4 rounded-lg p-4 text-sm ${
                  current.isCorrect
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                }`}>
                  <p className="font-semibold">
                    {current.isCorrect ? "✓ Correct !" : "✗ Incorrect"}
                  </p>
                  <p className="mt-1">{current.explanation}</p>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Navigation — FIX2: full-width buttons on mobile with 44px min
          touch target, auto-sized on sm+. FIX3: explicit w-full on mobile. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-full gap-2 sm:h-8 sm:w-auto"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((c) => Math.max(0, c - 1))}
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>

        {currentIdx < answers.length - 1 ? (
          <Button
            size="sm"
            className="h-11 w-full gap-2 sm:h-8 sm:w-auto"
            onClick={() => setCurrentIdx((c) => c + 1)}
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-11 w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white sm:h-8 sm:w-auto"
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
