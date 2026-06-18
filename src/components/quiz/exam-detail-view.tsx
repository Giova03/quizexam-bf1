"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StartDialog } from "./start-dialog";
import type { Exam, CorrectionMode } from "@/lib/types";
import {
  ArrowLeft,
  Clock,
  FileQuestion,
  Play,
  GraduationCap,
  ListChecks,
} from "lucide-react";

export function ExamDetailView() {
  const { selectedExamId, startSession } = useQuizStore();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadExam = useCallback(async () => {
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${selectedExamId}`);
      if (res.ok) {
        const data = await res.json();
        setExam(data);
      }
    } catch (e) {
      console.error("Failed to load exam", e);
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  async function handleStart(mode: CorrectionMode) {
    if (!exam) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exam.title,
          mode,
          sourceType: "exam",
          sourceId: exam.id,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        setDialogOpen(false);
        startSession(session.id);
      }
    } catch (e) {
      console.error("Failed to create session", e);
    }
  }

  const questions = exam?.examQuestions
    ?.slice()
    .sort((a, b) => a.order - b.order)
    .map((eq) => eq.question) ?? [];

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
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : !exam ? (
        <Card className="p-8 text-center text-muted-foreground">
          Examen introuvable.
        </Card>
      ) : (
        <>
          {/* Header */}
          <Card className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-600" />
            <div className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {exam.title}
                    </h1>
                    <p className="mt-1 max-w-2xl text-muted-foreground">
                      {exam.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">
                        <Clock className="mr-1 h-3 w-3" />
                        {exam.durationMin} minutes
                      </Badge>
                      <Badge variant="outline" className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">
                        <FileQuestion className="mr-1 h-3 w-3" />
                        {questions.length} questions
                      </Badge>
                      <Badge variant="secondary">
                        <ListChecks className="mr-1 h-3 w-3" />
                        Examen blanc
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                  onClick={() => setDialogOpen(true)}
                >
                  <Play className="h-4 w-4" />
                  Démarrer l&apos;examen
                </Button>
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6">
            <h2 className="mb-3 font-semibold">Consignes</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                L&apos;examen comporte {questions.length} questions à choix
                multiples (QCM).
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                Chaque question a une seule réponse correcte parmi 4 options
                (A, B, C, D).
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                Durée recommandée : {exam.durationMin} minutes.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                Vous pouvez naviguer librement entre les questions avant de
                terminer.
              </li>
            </ul>
          </Card>

          {/* Questions list */}
          <Card className="overflow-hidden">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Liste des questions</h2>
              <p className="text-sm text-muted-foreground">
                Aperçu des {questions.length} questions de l&apos;examen
              </p>
            </div>
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                      {idx + 1}
                    </span>
                    <p className="font-medium leading-snug text-sm">
                      {q.question}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </>
      )}

      <StartDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={exam?.title ?? ""}
        subtitle="Choisissez votre mode de correction pour cet examen blanc."
        questionCount={questions.length}
        onStart={handleStart}
      />
    </div>
  );
}
