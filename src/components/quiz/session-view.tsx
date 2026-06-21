"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { useFavorites } from "@/lib/favorites-store";
import { toast } from "sonner";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function SessionView() {
  const { currentSessionId, viewResults, goHome } = useQuizStore();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favorites = useFavorites((s) => s.favorites);
  const toggleFavorite = useFavorites((s) => s.toggleFavorite);

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
              onClick={completeSession}
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
