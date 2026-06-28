"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Wand2,
  Plus,
  CheckCircle2,
  Loader2,
  BookOpen,
  FileQuestion,
  AlertCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

interface Bank {
  id: string;
  title: string;
  _count?: { questions: number };
}

export function AiQuestionGenerator() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [subject, setSubject] = useState("");
  const [count, setCount] = useState(10);
  const [bankMode, setBankMode] = useState<"existing" | "new">("existing");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [newBankTitle, setNewBankTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuestion[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Load banks for the existing-bank selector.
  useEffect(() => {
    setLoadingBanks(true);
    fetch("/api/banks")
      .then((r) => (r.ok ? r.json() : []))
      .then((b: Bank[]) => {
        setBanks(b);
        if (b.length > 0 && !selectedBankId) {
          // Pick a sensible default (most questions).
          const sorted = [...b].sort(
            (a, b2) => (b2._count?.questions ?? 0) - (a._count?.questions ?? 0)
          );
          setSelectedBankId(sorted[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBanks(false));
  }, []);

  const handleGenerate = async () => {
    if (subject.trim().length < 3) {
      toast.error("Entrez un sujet d'au moins 3 caractères");
      return;
    }
    if (bankMode === "existing" && !selectedBankId) {
      toast.error("Sélectionnez une banque");
      return;
    }
    if (bankMode === "new" && newBankTitle.trim().length < 3) {
      toast.error("Entrez un titre pour la nouvelle banque");
      return;
    }

    setGenerating(true);
    setGenerated(null);
    setSelectedIdx(new Set());
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          count,
          // Don't auto-add to bank; we let the user preview & select first.
          bankId: bankMode === "existing" ? selectedBankId : undefined,
          addToBank: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la génération");
        return;
      }
      setGenerated(data.questions as GeneratedQuestion[]);
      // Select all by default.
      setSelectedIdx(new Set(data.questions.map((_: unknown, i: number) => i)));
      toast.success(`${data.count} questions générées par l'IA`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (!generated) return;
    if (selectedIdx.size === generated.length) {
      setSelectedIdx(new Set());
    } else {
      setSelectedIdx(new Set(generated.map((_, i) => i)));
    }
  };

  const handleAddToBank = async () => {
    if (!generated || selectedIdx.size === 0) {
      toast.error("Sélectionnez au moins une question");
      return;
    }
    let bankId = selectedBankId;
    let bankTitle = banks.find((b) => b.id === bankId)?.title ?? "";

    // If creating a new bank, do that first.
    if (bankMode === "new") {
      setSaving(true);
      try {
        const createRes = await fetch("/api/admin/banks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newBankTitle.trim(),
            description: `Banque générée par IA sur : ${subject.trim()}`,
            category: "IA Généré",
            subcategory: "",
            icon: "Sparkles",
            color: "violet",
            level: "TOUS",
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          toast.error(createData.error || "Erreur création banque");
          setSaving(false);
          return;
        }
        bankId = createData.id;
        bankTitle = createData.title;
      } catch {
        toast.error("Erreur réseau");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (!bankId) {
      toast.error("Aucune banque sélectionnée");
      return;
    }

    // Add each selected question to the bank via the admin questions API.
    setSaving(true);
    let added = 0;
    let failed = 0;
    const questionsToAdd = Array.from(selectedIdx)
      .sort((a, b) => a - b)
      .map((i) => generated[i]);

    for (const q of questionsToAdd) {
      try {
        const res = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankId,
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            level: "TOUS",
            difficulty: "medium",
          }),
        });
        if (res.ok) added++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setSaving(false);
    if (added > 0) {
      toast.success(`${added} question(s) ajoutée(s) à « ${bankTitle} »`);
    }
    if (failed > 0) {
      toast.error(`${failed} question(s) ont échoué`);
    }
    if (added > 0 && failed === 0) {
      // Reset on success.
      setGenerated(null);
      setSelectedIdx(new Set());
      setSubject("");
      setNewBankTitle("");
      // Refresh bank list so the new bank shows up.
      setLoadingBanks(true);
      fetch("/api/banks")
        .then((r) => (r.ok ? r.json() : []))
        .then((b: Bank[]) => setBanks(b))
        .finally(() => setLoadingBanks(false));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Générateur de QCM par IA</h2>
          </div>
          <p className="mt-1 text-sm text-white/80">
            Décrivez un sujet et l&apos;IA génère des questions QCM prêtes à
            ajouter à vos banques.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {/* Subject input */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-subject">Sujet / Thématique</Label>
            <Input
              id="ai-subject"
              placeholder="Ex : Histoire du Burkina Faso, Géométrie, Droit du travail..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">
              Plus le sujet est précis, meilleures sont les questions.
            </p>
          </div>

          {/* Count + bank mode */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-count">Nombre de questions (5-20)</Label>
              <Input
                id="ai-count"
                type="number"
                min={5}
                max={20}
                value={count}
                onChange={(e) =>
                  setCount(Math.min(20, Math.max(5, Number(e.target.value) || 5)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={bankMode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBankMode("existing")}
                  className="flex-1"
                >
                  Banque existante
                </Button>
                <Button
                  type="button"
                  variant={bankMode === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBankMode("new")}
                  className="flex-1 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle banque
                </Button>
              </div>
            </div>
          </div>

          {/* Bank selector / new bank title */}
          {bankMode === "existing" ? (
            <div className="space-y-1.5">
              <Label htmlFor="bank-dest">Banque de destination</Label>
              {loadingBanks ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger id="bank-dest" className="w-full">
                    <SelectValue placeholder="Choisir une banque..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title} ({b._count?.questions ?? 0} Q)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="new-bank-title">Titre de la nouvelle banque</Label>
              <Input
                id="new-bank-title"
                placeholder={`Ex : QCM IA - ${subject.slice(0, 30) || "Sujet"}`}
                value={newBankTitle}
                onChange={(e) => setNewBankTitle(e.target.value)}
                maxLength={100}
              />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || subject.trim().length < 3}
            className="w-full gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer {count} questions
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Preview generated questions */}
      {generated && (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-violet-600" />
              <h3 className="font-semibold">
                Aperçu — {generated.length} questions
              </h3>
              <Badge variant="secondary">
                {selectedIdx.size} sélectionnée(s)
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="text-xs"
            >
              {selectedIdx.size === generated.length
                ? "Tout désélectionner"
                : "Tout sélectionner"}
            </Button>
          </div>
          <Separator />
          <div className="max-h-[480px] space-y-3 overflow-y-auto scrollbar-thin pr-1">
            {generated.map((q, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3.5 transition-all ${
                  selectedIdx.has(i)
                    ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30"
                    : "border-border opacity-70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIdx.has(i)}
                    onCheckedChange={() => toggleSelect(i)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">Q{i + 1}.</span>{" "}
                      {q.question}
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {[
                        { letter: "A", text: q.optionA },
                        { letter: "B", text: q.optionB },
                        { letter: "C", text: q.optionC },
                        { letter: "D", text: q.optionD },
                      ].map((opt) => (
                        <div
                          key={opt.letter}
                          className={`flex items-start gap-2 rounded-md px-2 py-1 text-xs ${
                            opt.letter === q.correctAnswer
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                              : "bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <span className="font-bold">{opt.letter}.</span>
                          <span className="flex-1">{opt.text}</span>
                          {opt.letter === q.correctAnswer && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          )}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        <span className="font-semibold">Explication :</span>{" "}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              Vérifiez chaque question avant de l&apos;ajouter.
            </p>
            <Button
              onClick={handleAddToBank}
              disabled={saving || selectedIdx.size === 0}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Ajouter {selectedIdx.size} question(s) à la banque
            </Button>
          </div>
        </Card>
      )}

      {!generated && !generating && (
        <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Les questions générées par l&apos;IA apparaîtront ici pour
            vérification avant ajout.
          </p>
        </Card>
      )}
    </div>
  );
}
