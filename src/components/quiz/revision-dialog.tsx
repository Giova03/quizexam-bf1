"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function RevisionDialog({
  bankId,
  bankTitle,
  open,
  onOpenChange,
}: {
  bankId: string | null;
  bankTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!bankId) return;
    setLoading(true);
    setRevealed(false);
    setCurrent(0);
    try {
      const res = await fetch(`/api/questions?bankId=${bankId}`);
      if (res.ok) {
        const data = await res.json();
        // Shuffle questions for variety
        const shuffled = [...(data.questions ?? [])].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    if (open && bankId) load();
  }, [open, bankId, load]);

  if (!open) return null;

  const q = questions[current];
  const progress = questions.length > 0 ? Math.round(((current + 1) / questions.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-hidden p-0 sm:max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Layers className="h-4 w-4 shrink-0 text-violet-600" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Mode Révision</p>
              <p className="truncate text-xs text-muted-foreground">{bankTitle}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="border-b px-4 py-2 sm:px-6">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {loading ? "Chargement..." : `Question ${current + 1} / ${questions.length}`}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-6">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!loading && questions.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aucune question disponible.
            </div>
          )}

          {!loading && q && (
            <div className="space-y-4">
              <Card className="p-4 sm:p-5">
                <p className="break-words text-base font-medium leading-snug sm:text-lg">
                  {q.question}
                </p>
              </Card>

              <div className="space-y-2">
                {OPTION_LETTERS.map((letter) => {
                  const text =
                    letter === "A"
                      ? q.optionA
                      : letter === "B"
                        ? q.optionB
                        : letter === "C"
                          ? q.optionC
                          : q.optionD;
                  const isRight = q.correctAnswer === letter;
                  let cls = "border-border bg-muted/30 text-muted-foreground";
                  if (revealed && isRight) {
                    cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                  }
                  return (
                    <div
                      key={letter}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${cls}`}
                    >
                      <span className="font-bold">{letter}.</span>
                      <span className="min-w-0 flex-1 break-words">{text}</span>
                      {revealed && isRight && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                    </div>
                  );
                })}
              </div>

              {revealed && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <span className="font-semibold">Explication: </span>
                  <span className="break-words">{q.explanation}</span>
                </div>
              )}

              {revealed && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setKnownIds(new Set([...knownIds, q.id]));
                      next();
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Je savais
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => next()}
                  >
                    À revoir
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        {!loading && questions.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={current === 0}
              onClick={() => {
                setCurrent((c) => Math.max(0, c - 1));
                setRevealed(false);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Précédent</span>
            </Button>

            <Button
              size="sm"
              className="gap-1.5"
              variant={revealed ? "secondary" : "default"}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Cacher
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Révéler
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={current === questions.length - 1}
              onClick={() => next()}
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* End of revision */}
        {!loading && questions.length > 0 && current === questions.length - 1 && revealed && (
          <div className="border-t bg-muted/30 px-4 py-3 text-center sm:px-6">
            <p className="text-sm text-muted-foreground">
              Vous avez terminé la révision.{" "}
              <Badge variant="secondary">{knownIds.size} sues</Badge>{" "}
              sur <Badge variant="outline">{questions.length}</Badge>
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 gap-1.5"
              onClick={() => {
                setKnownIds(new Set());
                load();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recommencer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function next() {
    setCurrent((c) => Math.min(questions.length - 1, c + 1));
    setRevealed(false);
  }
}
