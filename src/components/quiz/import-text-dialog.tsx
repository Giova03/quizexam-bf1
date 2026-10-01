"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardPaste,
  Sparkles,
  Loader2,
  Upload,
  X,
  AlertTriangle,
  Bot,
  ScanText,
} from "lucide-react";
import { toast } from "sonner";
import { BankSelector, BankOption } from "./bank-selector";
import { QuestionCardEditor, EditableQuestion } from "./question-card-editor";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

const SAMPLE_TEXT = `1. Quelle est la capitale du Burkina Faso ?
a) Ouagadougou
b) Bobo-Dioulasso
c) Koudougou
d) Banfora
Réponse: a
Explication: Ouagadougou est la capitale politique et administrative du Burkina Faso.

2. Qui est le président du Faso depuis 2022 ?
a) Roch Marc Christian Kaboré
b) Capitaine Ibrahim Traoré ✅
c) Paul-Henri Sandaogo Damiba
d) Blaise Compaoré
Explication: Le Capitaine Ibrahim Traoré a pris le pouvoir le 30 septembre 2022.

3. Le FESPACO se tient dans quelle ville ?
A) Bobo-Dioulasso  B) Ouagadougou  C) Kaya  D) Banfora
Réponse: B
Justification: Le FESPACO, plus grand festival de cinéma d'Afrique, a lieu à Ouagadougou.

RÉPONSES
1. A  2. B  3. B`;

export function ImportTextDialog({ open, onOpenChange, onImported }: Props) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [engine, setEngine] = useState<"local" | "auto" | "ai">("auto");
  const [engineUsed, setEngineUsed] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [targetBank, setTargetBank] = useState<string>("");
  const [newBankTitle, setNewBankTitle] = useState<string>("");
  const [importing, setImporting] = useState(false);

  // Load banks when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/banks")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setBanks(list);
        if (list.length > 0) {
          setTargetBank((prev) => prev || list[0].id);
        } else {
          setTargetBank("new");
        }
      })
      .catch(() => setBanks([]));
  }, [open]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setText("");
      setQuestions([]);
      setEngineUsed(null);
      setTargetBank("");
      setNewBankTitle("");
    }
  }, [open]);

  async function handleParse(forceEngine?: "local" | "auto" | "ai") {
    if (!text.trim()) {
      toast.error("Collez du texte à analyser");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/parse-qcm-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, engine: forceEngine ?? engine }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Échec de l'analyse");
        return;
      }
      const parsed: EditableQuestion[] = (data.questions ?? []).map(
        (q: any) => ({
          question: q.question ?? "",
          optionA: q.optionA ?? "",
          optionB: q.optionB ?? "",
          optionC: q.optionC ?? "",
          optionD: q.optionD ?? "",
          correctAnswer: q.correctAnswer ?? "A",
          explanation: q.explanation ?? "",
          warnings: q.warnings ?? [],
        })
      );
      if (parsed.length === 0) {
        toast.error(
          "Aucune question détectée. Essayez l'Extraction IA — elle lit les formats libres."
        );
        return;
      }
      setQuestions(parsed);
      setEngineUsed(data.engine ?? null);
      const warnCount = parsed.filter((q) => (q.warnings?.length ?? 0) > 0).length;
      toast.success(
        `${parsed.length} question(s) détectée(s) ✓${
          warnCount > 0 ? ` (${warnCount} à vérifier)` : ""
        }${data.notes ? ` — ${data.notes}` : ""}`
      );
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setParsing(false);
    }
  }

  function updateQuestion(idx: number, q: EditableQuestion) {
    setQuestions((prev) =>
      prev.map((p, i) => (i === idx ? { ...q, warnings: [] } : p))
    );
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function validCount() {
    return questions.filter((q) => {
      const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map((s) =>
        s.trim().toLowerCase()
      );
      // V16 — explication facultative (source n°1 de refus d'import).
      return (
        q.question.trim() &&
        q.optionA.trim() &&
        q.optionB.trim() &&
        q.optionC.trim() &&
        q.optionD.trim() &&
        ["A", "B", "C", "D"].includes(q.correctAnswer) &&
        new Set(opts).size === 4
      );
    }).length;
  }

  async function handleImport() {
    if (questions.length === 0) {
      toast.error("Aucune question à importer");
      return;
    }
    if (!targetBank) {
      toast.error("Sélectionnez ou créez une banque cible");
      return;
    }
    if (targetBank === "new" && !newBankTitle.trim()) {
      toast.error("Donnez un titre à la nouvelle banque");
      return;
    }

    setImporting(true);
    try {
      // If new bank, create it first
      let bankId = targetBank;
      if (targetBank === "new") {
        const createRes = await fetch("/api/admin/banks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newBankTitle.trim(),
            description: `Banque importée depuis texte — ${new Date().toLocaleDateString(
              "fr-FR"
            )}`,
            category: "Divers",
            subcategory: "",
            icon: "ClipboardPaste",
            color: "emerald",
            level: "TOUS",
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          toast.error(err.error ?? "Échec création banque");
          return;
        }
        const bank = await createRes.json();
        bankId = bank.id;
      }

      const validQs = questions.filter((q) => {
        const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map((s) =>
          s.trim().toLowerCase()
        );
        return (
          q.question.trim() &&
          q.optionA.trim() &&
          q.optionB.trim() &&
          q.optionC.trim() &&
          q.optionD.trim() &&
          new Set(opts).size === 4
        );
      });

      if (validQs.length === 0) {
        toast.error("Aucune question valide à importer");
        return;
      }

      const res = await fetch("/api/import-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: validQs, bankId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Échec de l'import");
        return;
      }
      if (data.failure > 0 && Array.isArray(data.results)) {
        // V16 — remonte les raisons exactes du refus côté serveur.
        const reasons = data.results
          .filter((r: { ok: boolean }) => !r.ok)
          .map((r: { error?: string }) => r.error)
          .filter(Boolean);
        const uniq = [...new Set(reasons)].slice(0, 3).join(" · ");
        toast.warning(
          `${data.success} importée(s), ${data.failure} refusée(s)${uniq ? ` — ${uniq}` : ""}`
        );
      } else {
        toast.success(
          `${data.success} question(s) importée(s) dans ${
            targetBank === "new" ? newBankTitle : "la banque"
          } ✓`
        );
      }
      onImported?.();
      onOpenChange(false);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setImporting(false);
    }
  }

  const valid = validCount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] max-w-[95vw] flex-col overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5 text-emerald-600" />
            Importer un QCM par copier-coller
          </DialogTitle>
          <DialogDescription>
            Collez votre texte : le parseur détecte questions, options,
            réponses (✅, « Réponse : », corrigé global) et explications. En
            cas de format libre, l&apos;extraction IA prend le relais.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {questions.length === 0 ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Texte du QCM</label>
                  <button
                    type="button"
                    onClick={() => setText(SAMPLE_TEXT)}
                    className="text-[11px] text-emerald-600 underline hover:text-emerald-700"
                  >
                    Charger un exemple
                  </button>
                </div>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={12}
                  placeholder={`Collez votre texte ici... Ex:\n\n1. Quelle est la capitale du BF ?\na) Ouagadougou\nb) Bobo-Dioulasso\nc) Koudougou\nd) Banfora\nRéponse: a\nExplication: Ouagadougou est la capitale du BF.`}
                  className="resize-y font-mono text-sm"
                />
              </div>

              {/* Sélecteur de moteur d'extraction */}
              <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-2.5 sm:flex-row sm:items-center">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ScanText className="h-3.5 w-3.5" />
                  Moteur d&apos;extraction :
                </span>
                <div className="flex flex-1 items-center gap-1 rounded-lg border bg-background p-1">
                  {(
                    [
                      {
                        v: "auto" as const,
                        label: "Auto (recommandé)",
                        icon: Sparkles,
                      },
                      { v: "local" as const, label: "Parseur rapide", icon: ScanText },
                      { v: "ai" as const, label: "IA sans faille", icon: Bot },
                    ]
                  ).map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEngine(v)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                        engine === v
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="mb-1 font-semibold">Formats reconnus :</p>
                <ul className="list-inside list-disc space-y-0.5">
                  <li>Questions : « 1. », « 1) », « Q1 : », « Question 3 - », ou sans numéro (finit par « ? »)</li>
                  <li>Options : « a) », « A. », « (a) », « 1. »/« I. » + plusieurs options sur une ligne</li>
                  <li>Réponses : « Réponse : b », « La réponse est B », ✅ ✔ * (vrai) en fin d&apos;option, lettre seule</li>
                  <li>Corrigé global en fin de document : « RÉPONSES — 1. A 2. C 3. B »</li>
                  <li>Explications : « Explication : », « Justification : », « Raisonnement : »</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <Badge variant="secondary">
                  {questions.length} question(s)
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                  {valid} valide(s)
                </Badge>
                {questions.length - valid > 0 && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    {questions.length - valid} à corriger
                  </Badge>
                )}
                {engineUsed && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-violet-300 text-violet-700"
                  >
                    <Bot className="h-3 w-3" />
                    {engineUsed.includes("ai") ? "Extraction IA" : "Parseur local"}
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs"
                    onClick={() => handleParse("ai")}
                    disabled={parsing}
                  >
                    {parsing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                    Ré-analyser avec l&apos;IA
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs"
                    onClick={() => setQuestions([])}
                  >
                    <X className="h-3 w-3" />
                    Recommencer
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <QuestionCardEditor
                    key={idx}
                    index={idx}
                    q={q}
                    onChange={(nq) => updateQuestion(idx, nq)}
                    onRemove={() => removeQuestion(idx)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="border-t pt-3">
          <BankSelector
            value={targetBank}
            newBankTitle={newBankTitle}
            banks={banks}
            onValueChange={setTargetBank}
            onNewTitleChange={setNewBankTitle}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {questions.length === 0 ? (
            <Button
              onClick={() => handleParse()}
              disabled={parsing || !text.trim()}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {parsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : engine === "ai" ? (
                <Bot className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {engine === "ai"
                ? "Extraire avec l'IA"
                : engine === "auto"
                  ? "Analyser (auto + IA)"
                  : "Parser le texte"}
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={importing || valid === 0 || !targetBank}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importer {valid} question(s)
            </Button>
          )}
        </DialogFooter>

        {questions.length > 0 && valid < questions.length && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              {questions.length - valid} question(s) seront ignorées car
              incomplètes ou invalides. Corrigez-les ou supprimez-les.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
