"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuizStore } from "@/lib/quiz-store";
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
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Flag,
  Zap,
  Trophy,
  Info,
  AlertCircle,
  Bookmark,
<<<<<<< Updated upstream
  Clock,
=======
>>>>>>> Stashed changes
  Timer,
} from "lucide-react";
import { useFavorites } from "@/lib/favorites-store";
import { usePrefs, type SessionContext } from "@/lib/prefs-store";
import { toast } from "sonner";
import { ExamTimer } from "./exam-timer";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Daily-challenge sessions are created via /api/sessions with a stable
 * sentinel sourceId ("daily-challenge") and a title that starts with
 * "Défi du jour". Both signals are checked here so the 2× XP bonus and
 * localStorage flag are only applied to genuine daily challenges.
 */
const DAILY_CHALLENGE_SOURCE_ID = "daily-challenge";
const DAILY_CHALLENGE_TITLE_PREFIX = "Défi du jour";
const DAILY_CHALLENGE_STORAGE_PREFIX = "daily-challenge-completed-";

function isDailyChallengeSession(s: QuizSession | null): boolean {
  if (!s) return false;
  return (
    s.sourceId === DAILY_CHALLENGE_SOURCE_ID ||
    s.title.startsWith(DAILY_CHALLENGE_TITLE_PREFIX)
  );
}

function localTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format a number of seconds as MM:SS (or HH:MM:SS if ≥ 1h). */
function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function SessionView() {
  const { currentSessionId, currentSessionDifficulty, viewResults, goHome } = useQuizStore();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Exam timer state (only used when sourceType === "exam")
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const favorites = useFavorites((s) => s.favorites);
  const toggleFavorite = useFavorites((s) => s.toggleFavorite);
  const recordSession = usePrefs((s) => s.recordSession);
  const addXp = usePrefs((s) => s.addXp);

  // --- Mode Examen Chronométré Strict ---
  // `timeRemaining` is null when no timer is active (bank sessions, daily
  // challenges). For exam sessions with a `durationMin`, it counts down
  // every second and triggers an auto-submit at 0.
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  // Guard against double-submit (timer expiry + manual click racing).
  const autoSubmitRef = useRef(false);
  // Track which warnings have been shown so we don't repeat them.
  const warnedRef = useRef<Set<number>>(new Set());

  const loadSession = useCallback(async () => {
    if (!currentSessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        // Jump to first unanswered question
        const firstUnanswered = data.answers.findIndex(
          (a: SessionAnswer) => a.userAnswer === null
        );
        setCurrentIdx(firstUnanswered >= 0 ? firstUnanswered : 0);
        // If exam session, fetch exam details to get durationMin
        if (data.sourceType === "exam" && data.sourceId) {
          try {
            const examRes = await fetch(`/api/exams/${data.sourceId}`);
            if (examRes.ok) {
              const exam = await examRes.json();
              setDurationMin(exam.durationMin ?? null);
            }
          } catch (e) {
            console.warn("Failed to load exam duration", e);
          }
        }
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

  // Auto-submit when exam timer expires.
  // We store the latest session in a ref so the ExamTimer effect can stay stable
  // (its onExpire prop has a stable identity) while still acting on up-to-date data.
  const autoSubmitRef = useRef<() => void>(() => {});
  autoSubmitRef.current = () => {
    if (!session) return;
    toast.error("Temps écoulé ! Soumission automatique de l'examen.");
    setConfirmOpen(false);
    completeSession();
  };
  const handleTimeExpired = useCallback(() => {
    autoSubmitRef.current();
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // --- Mode Examen Chronométré Strict — timer initialization ---
  // Only exam sessions have a `durationMin` (returned by GET /api/sessions/[id]
  // for sourceType === "exam"). Bank sessions and daily challenges skip the
  // timer entirely.
  useEffect(() => {
    if (!session) {
      setTimeRemaining(null);
      return;
    }
    if (session.sourceType !== "exam" || !session.durationMin) {
      setTimeRemaining(null);
      return;
    }
    const totalSeconds = Math.max(1, Math.floor(session.durationMin * 60));
    setTimeRemaining(totalSeconds);
    autoSubmitRef.current = false;
    warnedRef.current = new Set();

    const intervalId = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) return 0;
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session?.id, session?.sourceType, session?.durationMin]);

  // --- Toast warnings at 10 min, 5 min, 1 min remaining ---
  useEffect(() => {
    if (timeRemaining === null) return;
    const thresholds: Array<{ s: number; msg: string }> = [
      { s: 600, msg: "⏰ Plus que 10 minutes !" },
      { s: 300, msg: "⏰ Plus que 5 minutes — finalisez vos réponses !" },
      { s: 60, msg: "⏰ Plus que 1 minute !" },
    ];
    for (const t of thresholds) {
      if (timeRemaining === t.s && !warnedRef.current.has(t.s)) {
        warnedRef.current.add(t.s);
        if (t.s <= 60) {
          toast.error(t.msg);
        } else {
          toast.warning(t.msg);
        }
      }
    }
  }, [timeRemaining]);

  async function completeSession(isAutoSubmit = false) {
    if (!session) return;
    if (submitting) return; // guard against double-submit (timer + click)
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = (await res.json()) as QuizSession;

        // --- Award XP + update badges (all sessions) ---
        // recordSession() is called for every completed session. It updates
        // XP, streak, sessionsCompleted, totalCorrect, totalAnswered and
        // checks all badges (streak, perfect, polyvalent, night-owl, etc.).
        // For daily challenges, an extra matching bonus is added on top to
        // reach the 2× multiplier.
        const correct = updated.answers.filter(
          (a: SessionAnswer) => a.isCorrect === true
        ).length;
        const total = updated.totalQuestions;
        const isDaily =
          isDailyChallengeSession(session) || isDailyChallengeSession(updated);
        const ctx: SessionContext = {
          bankId:
            session.sourceType === "bank" ? session.sourceId : undefined,
          difficulty: currentSessionDifficulty ?? undefined,
          isExam: session.sourceType === "exam",
          isDailyChallenge: isDaily,
          startedAt: session.startedAt,
          completedAt: new Date().toISOString(),
        };
        recordSession(correct, total, ctx);

        if (isDaily) {
          // --- Daily Challenge: 2× XP + localStorage flag ---
          // The bonus equals the XP already granted by recordSession so the
          // player ends up with 2× the normal reward.
          const bonus = correct * 10 + (correct === total && total > 0 ? 50 : 0);
          if (bonus > 0) {
            addXp(bonus);
          }
          // Mark today as completed in localStorage so the home card can
          // display the "Terminé aujourd'hui" badge.
          try {
            window.localStorage.setItem(
              DAILY_CHALLENGE_STORAGE_PREFIX + localTodayStr(),
              "1"
            );
          } catch {
            // ignore (privacy mode / SSR)
          }
          toast.success(
            `🎯 Défi du jour terminé ! +${bonus * 2} XP (bonus 2× appliqué)`
          );
        } else if (isAutoSubmit) {
          toast.info("Examen soumis automatiquement (temps écoulé).");
        } else if (correct === total && total > 0) {
          toast.success(`🎉 Sans faute ! +${correct * 10 + 50} XP`);
        } else {
          toast.success(
            `Quiz terminé ! +${correct * 10} XP (${correct}/${total})`
          );
        }

        setSession(updated);
        setConfirmOpen(false);
        viewResults(session.id);
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

  // Keep a ref to the latest completeSession so the timer's auto-submit
  // effect can call it without going stale (and without re-running on
  // every render).
  const completeSessionRef = useRef(completeSession);
  completeSessionRef.current = completeSession;

  // --- Auto-submit when the timer hits 0 ---
  useEffect(() => {
    if (timeRemaining !== 0) return;
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    toast.error("⏰ Temps écoulé ! Soumission automatique de l'examen…");
    void completeSessionRef.current(true);
  }, [timeRemaining]);

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
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            answers: prev.answers.map((a) =>
              a.id === answerId ? updated : a
            ),
          };
        });
      } else {
        setError("Échec de l'enregistrement de la réponse.");
      }
    } catch (e) {
      console.error("Failed to submit answer", e);
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

<<<<<<< Updated upstream
=======
  async function completeSession() {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setSession(updated);
        setConfirmOpen(false);
        viewResults(session.id);
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

  // Show exam timer only for exam sessions with known duration
  const isExam = session?.sourceType === "exam";
  const showTimer = isExam && durationMin !== null && !session?.completedAt;

>>>>>>> Stashed changes
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{error ?? "Session introuvable."}</p>
        <Button onClick={goHome} className="mt-4">
          Retour à l&apos;accueil
        </Button>
      </Card>
    );
  }

  const answers = session.answers;
  const current = answers[currentIdx];
  const answeredCount = answers.filter((a) => a.userAnswer !== null).length;
  const progress = (answeredCount / answers.length) * 100;
  const isImmediate = session.mode === "immediate";
  const hasAnswered = current?.userAnswer !== null;
  const showFeedback = isImmediate && hasAnswered;

  function goNext() {
    if (currentIdx < answers.length - 1) setCurrentIdx(currentIdx + 1);
  }
  function goPrev() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={goHome}
          >
            <ArrowLeft className="h-4 w-4" />
            Quitter
          </Button>
          <div>
            <h1 className="text-lg font-bold leading-tight">{session.title}</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIdx + 1} sur {answers.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
<<<<<<< Updated upstream
          {/* Countdown timer — Mode Examen Chronométré Strict */}
          {timeRemaining !== null && (
            <Badge
              variant="outline"
              className={`gap-1.5 px-2.5 py-1 text-sm font-bold tabular-nums ${
                timeRemaining < 60
                  ? "animate-pulse border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : timeRemaining < 300
                    ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
              title="Temps restant"
              aria-label={`Temps restant : ${formatTime(timeRemaining)}`}
            >
              {timeRemaining < 300 ? (
                <Timer className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {formatTime(timeRemaining)}
            </Badge>
=======
          {showTimer && (
            <ExamTimer
              startedAt={session.startedAt}
              durationMin={durationMin as number}
              onExpire={handleTimeExpired}
            />
>>>>>>> Stashed changes
          )}
          <Badge
            variant="outline"
            className={
              isImmediate
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
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
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Exam time warning banner (mobile-friendly) */}
      {showTimer && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 p-2 text-xs text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
          <Timer className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">Mode examen chronométré</span>
          <span className="text-muted-foreground">
            — soumission automatique à la fin du temps.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Question navigator */}
      <div className="flex flex-wrap gap-1.5">
        {answers.map((a, idx) => {
          const isCurrent = idx === currentIdx;
          const isAnswered = a.userAnswer !== null;
          const isCorrect = isImmediate && a.isCorrect === true;
          const isWrong = isImmediate && a.isCorrect === false;
          return (
            <button
              key={a.id}
              onClick={() => setCurrentIdx(idx)}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-all ${
                isCurrent
                  ? "ring-2 ring-emerald-500 ring-offset-1"
                  : ""
              } ${
                isCorrect
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : isWrong
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    : isAnswered
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
              aria-label={`Question ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question card */}
      {current && (
        <Card className="overflow-hidden p-4 sm:p-6">
          {/* Image (above the question) — added in F4 */}
          {current.imageUrl && (
            <div className="mb-4 overflow-hidden rounded-xl border bg-muted/30">
              { }
              <img
                src={current.imageUrl}
                alt={`Illustration de la question ${currentIdx + 1}`}
                className="max-h-72 w-full object-contain sm:max-h-96"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {currentIdx + 1}
            </span>
            <h2 className="flex-1 pt-1 text-base font-semibold leading-snug sm:text-lg">
              {current.questionText}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                toggleFavorite({
                  id: current.id,
                  question: current.questionText,
                  correctAnswer: current.correctAnswer,
                  explanation: current.explanation,
                  bankId: session?.sourceId ?? "",
                  bankTitle: session?.title ?? "",
                  bankColor: "emerald",
                  savedAt: new Date().toISOString(),
                });
                toast.success(
                  favorites.some((f) => f.id === current.id)
                    ? "Retiré des favoris"
                    : "Ajouté aux favoris"
                );
              }}
              aria-label="Marquer comme favori"
            >
              <Bookmark
                className={`h-4 w-4 ${
                  favorites.some((f) => f.id === current.id)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
          </div>

          {/* Audio (below the question) — added in F4 */}
          {current.audioUrl && (
            <div className="mb-4 rounded-xl border bg-muted/20 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                Écouter l&apos;audio
              </p>
              <audio controls src={current.audioUrl} className="w-full">
                Votre navigateur ne prend pas en charge l&apos;élément audio.
              </audio>
            </div>
          )}

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
                "border-border hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20";
              if (showFeedback) {
                if (isCorrectAnswer) {
                  stateClass =
                    "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                } else if (isSelected && !isCorrectAnswer) {
                  stateClass =
                    "border-rose-500 bg-rose-50 dark:bg-rose-950/30";
                } else {
                  stateClass = "border-border opacity-60";
                }
              } else if (isSelected) {
                stateClass =
                  "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
              }

              return (
                <button
                  key={letter}
                  disabled={hasAnswered || submitting}
                  onClick={() => submitAnswer(current.id, letter)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed ${stateClass}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      showFeedback && isCorrectAnswer
                        ? "bg-emerald-500 text-white"
                        : showFeedback && isSelected && !isCorrectAnswer
                          ? "bg-rose-500 text-white"
                          : isSelected
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1 font-medium">{text}</span>
                  {showFeedback && isCorrectAnswer && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  {showFeedback && isSelected && !isCorrectAnswer && (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate feedback */}
          {showFeedback && (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                current.isCorrect
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {current.isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-300">
                      Bonne réponse !
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <span className="text-rose-700 dark:text-rose-300">
                      Mauvaise réponse
                    </span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-start gap-2 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Bonne réponse : {current.correctAnswer}.
                    </span>{" "}
                    {current.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Final mode: waiting hint */}
          {!isImmediate && hasAnswered && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
              <Flag className="h-4 w-4 shrink-0" />
              Réponse enregistrée. La correction sera affichée à la fin du quiz.
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>

        {currentIdx < answers.length - 1 ? (
          <Button onClick={goNext} className="gap-2">
            Suivant
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setConfirmOpen(true)}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
          >
            <Trophy className="h-4 w-4" />
            Terminer le quiz
          </Button>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terminer le quiz ?</DialogTitle>
            <DialogDescription>
              {answeredCount < answers.length
                ? `Il reste ${answers.length - answeredCount} question(s) sans réponse. `
                : "Vous avez répondu à toutes les questions. "}
              {isImmediate
                ? "Votre score final sera calculé."
                : "Les corrections et explications de toutes les questions seront affichées."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Continuer le quiz
            </Button>
            <Button
              onClick={() => completeSession()}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Trophy className="h-4 w-4" />
              )}
              Voir mes résultats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
