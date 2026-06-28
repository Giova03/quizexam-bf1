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
  Clock,
} from "lucide-react";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function SessionView() {
  const { currentSessionId, viewResults, goHome } = useQuizStore();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
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
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Progress value={progress} className="h-2" />
        <div className="flex flex-wrap gap-1">
          {answers.map((a, idx) => {
            const isAnswered = a.userAnswer !== null;
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={a.id}
                onClick={() => setCurrentIdx(idx)}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-emerald-500 text-white"
                    : isAnswered
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-label={`Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question card */}
      {current && (
        <Card className="overflow-hidden p-4 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700">
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
                  stateClass = "border-emerald-500 bg-emerald-50";
                } else if (isSelected && !isCorrectAnswer) {
                  stateClass = "border-rose-500 bg-rose-50";
                } else {
                  stateClass = "border-border opacity-60";
                }
              } else if (isSelected) {
                stateClass = "border-emerald-500 bg-emerald-50";
              }

              return (
                <button
                  key={letter}
                  onClick={() => !current.userAnswer && submitAnswer(current.id, letter)}
                  disabled={!!current.userAnswer || submitting}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${stateClass} ${
                    !current.userAnswer ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                    {letter}
                  </span>
                  <span className="flex-1 text-sm sm:text-base">{text}</span>
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
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-800"
            }`}>
              <p className="font-semibold">
                {current.isCorrect ? "✓ Correct !" : "✗ Incorrect"}
              </p>
              <p className="mt-1">{current.explanation}</p>
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((c) => Math.max(0, c - 1))}
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>

        {currentIdx < answers.length - 1 ? (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setCurrentIdx((c) => c + 1)}
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => setConfirmOpen(true)}
          >
            <Trophy className="h-4 w-4" />
            Terminer
          </Button>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
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
