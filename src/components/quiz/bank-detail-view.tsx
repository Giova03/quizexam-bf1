"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { BankIcon } from "./bank-icon";
import { StartDialog, type DifficultyFilter } from "./start-dialog";
import { AnkiExportButton } from "./anki-export-button";
import { getColor, type QuestionBank, type CorrectionMode } from "@/lib/types";
import {
  ArrowLeft,
  FileQuestion,
  Play,
  ChevronRight,
  BarChart3,
} from "lucide-react";

const DIFFICULTY_OPTIONS: Array<{
  value: DifficultyFilter;
  label: string;
  cls: string;
}> = [
  {
    value: "all",
    label: "Toutes",
    cls:
      "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  {
    value: "easy",
    label: "Facile",
    cls:
      "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  },
  {
    value: "medium",
    label: "Moyen",
    cls:
      "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  },
  {
    value: "hard",
    label: "Difficile",
    cls:
      "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
  },
];

export function BankDetailView() {
  const { selectedBankId, startSession, banks } = useQuizStore();
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");

  const loadBank = useCallback(async () => {
    if (!selectedBankId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/banks/${selectedBankId}`);
      if (res.ok) {
        const data = await res.json();
        setBank(data);
      }
    } catch (e) {
      console.error("Failed to load bank", e);
    } finally {
      setLoading(false);
    }
  }, [selectedBankId]);

  useEffect(() => {
    loadBank();
  }, [loadBank]);

  // Counts per difficulty — for both the preview filter and the StartDialog.
  const difficultyCounts = useMemo(() => {
    const all = bank?.questions ?? [];
    return {
      all: all.length,
      easy: all.filter((q) => q.difficulty === "easy").length,
      medium: all.filter((q) => q.difficulty === "medium").length,
      hard: all.filter((q) => q.difficulty === "hard").length,
    };
  }, [bank]);

  // Questions currently visible in the preview (filtered by selected difficulty).
  const visibleQuestions = useMemo(() => {
    const all = bank?.questions ?? [];
    if (difficulty === "all") return all;
    return all.filter((q) => q.difficulty === difficulty);
  }, [bank, difficulty]);

  async function handleStart(mode: CorrectionMode, diff: DifficultyFilter) {
    if (!bank) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bank.title,
          mode,
          sourceType: "bank",
          sourceId: bank.id,
          difficulty: diff,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        setDialogOpen(false);
        startSession(session.id, diff);
      } else if (res.status === 402) {
        // Freemium daily limit reached — surface a toast prompting upgrade.
        const data = await res.json().catch(() => ({}));
        toast.error(
          data?.error ??
            "Limite quotidienne atteinte. Passez à Premium pour continuer."
        );
      }
    } catch (e) {
      console.error("Failed to create session", e);
    }
  }

  // fallback to cached bank for header
  const headerBank = bank ?? banks.find((b) => b.id === selectedBankId);
  const color = getColor(headerBank?.color ?? "emerald");

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => useQuizStore.getState().goHome()}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Button>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : !bank ? (
        <Card className="p-8 text-center text-muted-foreground">
          Banque introuvable.
        </Card>
      ) : (
        <>
          {/* Header */}
          <Card className="overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${color.gradient}`} />
            <div className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color.bgSoft} ${color.text}`}
                  >
                    <BankIcon name={bank.icon} className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {bank.title}
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                      {bank.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={color.border}>
                        {bank.category}
                      </Badge>
                      <Badge variant="secondary">
                        <FileQuestion className="mr-1 h-3 w-3" />
                        {bank.questions?.length ?? 0} questions
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                  <Button
                    size="lg"
                    className={`gap-2 bg-gradient-to-r ${color.gradient} text-white hover:opacity-90`}
                    onClick={() => setDialogOpen(true)}
                  >
                    <Play className="h-4 w-4" />
                    Démarrer le quiz
                  </Button>
                  <AnkiExportButton
                    bankId={bank.id}
                    variant="outline"
                    size="lg"
                    label="Exporter vers Anki"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Difficulty filter bar */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">
                  Filtrer par difficulté
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_OPTIONS.map((opt) => {
                  const count =
                    opt.value === "all"
                      ? difficultyCounts.all
                      : difficultyCounts[opt.value];
                  const isSelected = difficulty === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDifficulty(opt.value)}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-xs font-medium transition-all hover:scale-[1.02] ${
                        isSelected
                          ? `${opt.cls} ring-2 ring-offset-1`
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <span>{opt.label}</span>
                      <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-normal">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Quick actions: Anki export */}
              <div className="flex flex-wrap gap-2">
                <AnkiExportButton
                  bankId={bank.id}
                  bankTitle={bank.title}
                  variant="outline"
                  size="sm"
                />
              </div>
            </div>
          </Card>

          {/* Questions preview */}
          <Card className="overflow-hidden">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Aperçu des questions</h2>
              <p className="text-sm text-muted-foreground">
                {visibleQuestions.length} question
                {visibleQuestions.length > 1 ? "s" : ""} affichée
                {visibleQuestions.length > 1 ? "s" : ""}
                {difficulty !== "all" && ` · filtre : ${difficulty}`}
                {" · "}
                {bank.questions?.length ?? 0} au total
              </p>
            </div>
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y">
                {visibleQuestions.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Aucune question pour ce niveau de difficulté.
                  </div>
                ) : (
                  visibleQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/40"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="break-words font-medium leading-snug">
                            {q.question}
                          </p>
                          {q.difficulty && q.difficulty !== "medium" && (
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                q.difficulty === "easy"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                  : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                              }`}
                            >
                              {q.difficulty === "easy" ? "Facile" : "Difficile"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">
                            Réponse : {q.correctAnswer}
                          </span>
                          <ChevronRight className="h-3 w-3" />
                          <span className="line-clamp-1">{q.explanation}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </>
      )}

      <StartDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={bank?.title ?? ""}
        subtitle="Choisissez votre mode de correction pour cette session de quiz."
        questionCount={bank?.questions?.length ?? 0}
        difficultyCounts={difficultyCounts}
        initialDifficulty={difficulty}
        onStart={handleStart}
      />
    </div>
  );
}
