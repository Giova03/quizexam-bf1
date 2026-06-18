"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BankIcon } from "./bank-icon";
import { StartDialog } from "./start-dialog";
import { getColor, type QuestionBank, type CorrectionMode } from "@/lib/types";
import {
  ArrowLeft,
  FileQuestion,
  Play,
  ChevronRight,
} from "lucide-react";

export function BankDetailView() {
  const { selectedBankId, openBank, startSession, banks } = useQuizStore();
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  async function handleStart(mode: CorrectionMode) {
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
                <Button
                  size="lg"
                  className={`gap-2 bg-gradient-to-r ${color.gradient} text-white hover:opacity-90`}
                  onClick={() => setDialogOpen(true)}
                >
                  <Play className="h-4 w-4" />
                  Démarrer le quiz
                </Button>
              </div>
            </div>
          </Card>

          {/* Questions preview */}
          <Card className="overflow-hidden">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Aperçu des questions</h2>
              <p className="text-sm text-muted-foreground">
                {bank.questions?.length ?? 0} questions à choix multiples
              </p>
            </div>
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y">
                {bank.questions?.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{q.question}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                          Réponse : {q.correctAnswer}
                        </span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="line-clamp-1">{q.explanation}</span>
                      </div>
                    </div>
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
        title={bank?.title ?? ""}
        subtitle="Choisissez votre mode de correction pour cette session de quiz."
        questionCount={bank?.questions?.length ?? 0}
        onStart={handleStart}
      />
    </div>
  );
}
