"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StartDialog } from "./start-dialog";
import { ArrowLeft, Clock, FileQuestion, GraduationCap } from "lucide-react";
import type { Exam } from "@/lib/types";

export function ExamDetailView() {
  const { selectedExamId, goHome, startSession } = useQuizStore();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadExam = useCallback(async () => {
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${selectedExamId}`);
      if (res.ok) setExam(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  useEffect(() => { loadExam(); }, [loadExam]);

  if (loading) return <Skeleton className="h-64 rounded-xl" />;
  if (!exam) return <Card className="p-8 text-center">Examen introuvable</Card>;

  const count = exam._count?.examQuestions ?? exam.examQuestions?.length ?? 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>
      <Card className="overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <p className="mt-1 text-muted-foreground">{exam.description}</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{exam.durationMin} min</Badge>
              <Badge variant="outline"><FileQuestion className="mr-1 h-3 w-3" />{count} questions</Badge>
            </div>
          </div>
        </div>
        <Button className="mt-6 gap-2" onClick={() => setDialogOpen(true)}>Démarrer l&apos;examen</Button>
      </Card>
      <StartDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={exam.title}
        subtitle="Examen blanc — sélectionnez le mode de correction."
        questionCount={count}
        onStart={async (mode) => {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: exam.title, mode, sourceType: "exam", sourceId: exam.id }),
          });
          if (res.ok) {
            const session = await res.json();
            setDialogOpen(false);
            startSession(session.id);
          }
        }}
      />
    </div>
  );
}
