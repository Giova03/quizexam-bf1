"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { QuizSession } from "@/lib/types";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Home,
  RefreshCw,
  Zap,
  Flag,
} from "lucide-react";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function ResultsView() {
  const { currentSessionId, goHome, openBank, openExam, session: storeSession } =
    useQuizStore();
  const [session, setSession] = useState<QuizSession | null>(storeSession);
  const [loading, setLoading] = useState(!storeSession);

  const loadSession = useCallback(async () => {
    if (!currentSessionId) return;
    if (storeSession) {
      setSession(storeSession);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}`);
      if (res.ok) {
        setSession(await res.json());
      }
    } catch (e) {
      console.error("Failed to load session", e);
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, storeSession]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Session introuvable.</p>
        <Button onClick={goHome} className="mt-4">
          Retour à l&apos;accueil
        </Button>
      </Card>
    );
  }

  const answers = session.answers;
  const correct = answers.filter((a) => a.isCorrect === true).length;
  const wrong = answers.filter((a) => a.isCorrect === false).length;
  const skipped = answers.filter((a) => a.userAnswer === null).length;
  const score = session.score;
  const total = session.totalQuestions;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const isImmediate = session.mode === "immediate";

  const passed = percentage >= 50;
  const gradeColor = passed
    ? "from-emerald-500 to-teal-600"
    : "from-rose-500 to-orange-600";

  return (
    <div className="space-y-6">
      {/* Score hero */}
      <Card className={`overflow-hidden bg-gradient-to-br ${gradeColor} text-white`}>
        <div className="p-8 text-center">
          <Trophy className="mx-auto h-12 w-12" />
          <h1 className="mt-3 text-3xl font-bold">
            {percentage}% — {score}/{total}
          </h1>
          <p className="mt-1 text-lg text-white/90">
            {passed
              ? "Félicitations, vous avez réussi !"
              : "Continuez à vous entraîner !"}
          </p>
          <div className="mx-auto mt-4 flex max-w-md justify-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">{correct} correctes</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{wrong} fausses</span>
            </div>
            {skipped > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur">
                <CircleDashed className="h-4 w-4" />
                <span className="text-sm font-medium">{skipped} omises</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Mode badge + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Badge
          variant="outline"
          className={`w-fit ${
            isImmediate
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
          }`}
        >
          {isImmediate ? (
            <>
              <Zap className="mr-1 h-3 w-3" />
              Mode correction immédiate
            </>
          ) : (
            <>
              <Flag className="mr-1 h-3 w-3" />
              Mode correction finale
            </>
          )}
        </Badge>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (session.sourceType === "bank") {
                openBank(session.sourceId);
              } else {
                openExam(session.sourceId);
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refaire
          </Button>
          <Button onClick={goHome} className="gap-2">
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </div>
      </div>

      {/* Progress summary */}
      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Répartition des réponses</span>
          <span className="text-muted-foreground">
            {total} questions au total
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div
            className="bg-emerald-500"
            style={{ width: `${(correct / total) * 100}%` }}
          />
          <div
            className="bg-rose-500"
            style={{ width: `${(wrong / total) * 100}%` }}
          />
          <div
            className="bg-muted-foreground/40"
            style={{ width: `${(skipped / total) * 100}%` }}
          />
        </div>
      </Card>

      {/* Detailed review */}
      <Card className="overflow-hidden">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Correction détaillée</h2>
          <p className="text-sm text-muted-foreground">
            Révision de toutes les questions avec explications
          </p>
        </div>
        <ScrollArea className="max-h-[700px]">
          <div className="divide-y">
            {answers.map((a, idx) => {
              const isCorrect = a.isCorrect === true;
              const isSkipped = a.userAnswer === null;
              return (
                <div key={a.id} className="px-6 py-5">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : isSkipped
                            ? "bg-muted text-muted-foreground"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">
                        {a.questionText}
                      </p>

                      <div className="mt-3 space-y-1.5">
                        {OPTION_LETTERS.map((letter) => {
                          const text =
                            letter === "A"
                              ? a.optionA
                              : letter === "B"
                                ? a.optionB
                                : letter === "C"
                                  ? a.optionC
                                  : a.optionD;
                          const isRight = a.correctAnswer === letter;
                          const isChosen = a.userAnswer === letter;
                          let cls =
                            "border-border bg-muted/30 text-muted-foreground";
                          if (isRight) {
                            cls =
                              "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                          } else if (isChosen && !isRight) {
                            cls =
                              "border-rose-500 bg-rose-50 dark:bg-rose-950/30";
                          }
                          return (
                            <div
                              key={letter}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${cls}`}
                            >
                              <span className="font-bold">{letter}.</span>
                              <span className="flex-1">{text}</span>
                              {isRight && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              )}
                              {isChosen && !isRight && (
                                <XCircle className="h-4 w-4 text-rose-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div
                        className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
                          isCorrect
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                        }`}
                      >
                        <span className="font-semibold">
                          {isCorrect
                            ? "✓ Correct — "
                            : isSkipped
                              ? "○ Omise — "
                              : "✗ Incorrect — "}
                        </span>
                        <span>
                          {a.explanation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
