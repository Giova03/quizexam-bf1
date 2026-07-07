"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuizStore } from "@/lib/quiz-store";
import {
  BookOpen,
  Printer,
  Download,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface Chapter {
  title: string;
  keyPoints: string[];
  commonMistakes: string[];
}

interface StudySheet {
  bankId: string;
  bankTitle: string;
  chapters: Chapter[];
  source: "ai" | "fallback";
  generatedAt: string;
  message?: string;
}

interface BankLite {
  id: string;
  title: string;
  _count?: { questions: number };
}

/**
 * StudySheetView — "Fiches de révision auto-générées" (Feature E6.2).
 *
 * Lets the user pick a bank, then fetches a structured study sheet from
 * /api/study-sheet?bankId=… built from their wrong answers in that bank.
 *
 * - Print button (window.print())
 * - Download as PDF (window.print() with browser's "Save as PDF")
 * - Refresh button to regenerate the sheet after new quizzes
 */
export function StudySheetView() {
  const goHome = useQuizStore((s) => s.goHome);
  const [banks, setBanks] = useState<BankLite[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [sheet, setSheet] = useState<StudySheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);

  // Load all banks on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/banks");
        if (res.ok) {
          const data = await res.json();
          if (alive && Array.isArray(data)) {
            setBanks(data);
            if (data.length > 0) setSelectedBankId(data[0].id);
          }
        }
      } catch {
        // ignore
      } finally {
        if (alive) setLoadingBanks(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const generateSheet = useCallback(async (bankId: string) => {
    if (!bankId) return;
    setLoading(true);
    setSheet(null);
    try {
      const res = await fetch(`/api/study-sheet?bankId=${encodeURIComponent(bankId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? "Échec de la génération.",
        );
      }
      const data: StudySheet = await res.json();
      setSheet(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-generate the first sheet when a bank is selected.
  useEffect(() => {
    if (selectedBankId && !sheet) {
      generateSheet(selectedBankId);
    }
  }, [selectedBankId, sheet, generateSheet]);

  const handlePrint = () => {
    // Both "Print" and "Download as PDF" rely on the browser's print dialog
    // (the user can pick "Save as PDF" as the destination).
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Button>
        {sheet && sheet.chapters.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => generateSheet(selectedBankId)}
            >
              <RefreshCw className="h-4 w-4" />
              Régénérer
            </Button>
            <Button size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimer / PDF
            </Button>
          </div>
        )}
      </div>

      <Card className="no-print p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Fiches de révision auto-générées</h1>
            <p className="text-sm text-muted-foreground">
              Récapitulez vos erreurs et révisez efficacement avant l&apos;examen.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">
              Banque à réviser
            </label>
            {loadingBanks ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedBankId}
                onValueChange={(v) => {
                  setSelectedBankId(v);
                  setSheet(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une banque…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title} ({b._count?.questions ?? 0} Q)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => generateSheet(selectedBankId)}
            disabled={!selectedBankId || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Générer la fiche
          </Button>
        </div>
      </Card>

      {loading && (
        <Card className="p-6">
          <Skeleton className="mb-3 h-6 w-1/3" />
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
      )}

      {!loading && sheet && sheet.message && (
        <Card className="border-amber-300 bg-amber-50 p-6 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">{sheet.message}</p>
              <p className="mt-1 text-sm opacity-80">
                Faites un quiz dans cette banque, puis régénérez la fiche.
              </p>
            </div>
          </div>
        </Card>
      )}

      {!loading && sheet && sheet.chapters.length > 0 && (
        <div className="space-y-6">
          {/* Sheet header — visible in print */}
          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Fiche de révision — {sheet.bankTitle}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Générée le{" "}
                  {new Date(sheet.generatedAt).toLocaleString("fr-FR")} ·{" "}
                  {sheet.chapters.length} chapitre(s)
                </p>
              </div>
              <Badge
                className={
                  sheet.source === "ai"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                    : "bg-muted text-muted-foreground"
                }
              >
                {sheet.source === "ai" ? (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    IA
                  </>
                ) : (
                  "Résumé auto"
                )}
              </Badge>
            </div>
          </Card>

          {sheet.chapters.map((chapter, i) => (
            <Card key={`${chapter.title}-${i}`} className="p-5">
              <h3 className="mb-3 text-lg font-bold">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {i + 1}
                </span>
                {chapter.title}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Points clés à retenir
                  </p>
                  <ul className="space-y-1.5">
                    {chapter.keyPoints.length === 0 ? (
                      <li className="text-xs text-muted-foreground">
                        Aucun point clé identifié.
                      </li>
                    ) : (
                      chapter.keyPoints.map((p, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{p}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    Pièges à éviter
                  </p>
                  <ul className="space-y-1.5">
                    {chapter.commonMistakes.length === 0 ? (
                      <li className="text-xs text-muted-foreground">
                        Aucun piège identifié.
                      </li>
                    ) : (
                      chapter.commonMistakes.map((p, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                          <span>{p}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          ))}

          <Card className="no-print p-4 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Imprimez cette fiche ou enregistrez-la en PDF pour réviser hors-ligne.
            </p>
            <Button onClick={handlePrint} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger en PDF
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
