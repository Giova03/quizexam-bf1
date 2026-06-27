"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Upload,
  Wand2,
  CheckCircle2,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  AlertTriangle,
  Sparkles,
  FolderPlus,
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

interface PdfUploadResponse {
  fileName: string;
  fileSize: number;
  totalChars: number;
  truncated: boolean;
  text: string;
}

interface Bank {
  id: string;
  title: string;
  category?: string;
  _count?: { questions: number };
}

type Step = "upload" | "configure" | "generated";

interface PdfUploadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

const MIN_Q = 5;
const MAX_Q = 20;
const DEFAULT_Q = 10;

export function PdfUploadDialog({
  open,
  onOpenChange,
  onSaved,
}: PdfUploadDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [pdfText, setPdfText] = useState("");
  const [pdfInfo, setPdfInfo] = useState<PdfUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);

  // Generation config
  const [count, setCount] = useState(DEFAULT_Q);
  const [subject, setSubject] = useState("");

  // Generation result
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Save-to-bank
  const [banks, setBanks] = useState<Bank[]>([]);
  const [targetMode, setTargetMode] = useState<"existing" | "new">("existing");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [newBankTitle, setNewBankTitle] = useState("");
  const [newBankCategory, setNewBankCategory] = useState("Culture Générale");
  const [saving, setSaving] = useState(false);

  // Drag & drop state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset everything when the dialog is closed.
  const resetAll = useCallback(() => {
    setStep("upload");
    setPdfText("");
    setPdfInfo(null);
    setUploading(false);
    setCount(DEFAULT_Q);
    setSubject("");
    setQuestions([]);
    setSelected(new Set());
    setGenerating(false);
    setEditingIndex(null);
    setBanks([]);
    setTargetMode("existing");
    setSelectedBankId("");
    setNewBankTitle("");
    setNewBankCategory("Culture Générale");
    setSaving(false);
    setDragOver(false);
  }, []);

  useEffect(() => {
    if (!open) resetAll();
  }, [open, resetAll]);

  // Load banks when entering the "generated" step.
  useEffect(() => {
    if (step === "generated") {
      fetch("/api/banks")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setBanks(Array.isArray(d) ? d : []))
        .catch(() => setBanks([]));
    }
  }, [step]);

  /** Handle a selected File (from input or drag&drop) — upload to API. */
  const handleFile = useCallback(
    async (file: File) => {
      // Basic client-side guards (the server re-checks too).
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error("Le fichier doit être au format PDF.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Le fichier dépasse 10 Mo.");
        return;
      }
      if (file.size === 0) {
        toast.error("Le fichier est vide.");
        return;
      }

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload-pdf", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error || "Échec de l'extraction du PDF.");
          return;
        }
        setPdfInfo(data as PdfUploadResponse);
        setPdfText((data as PdfUploadResponse).text);
        setStep("configure");
        toast.success(
          `Texte extrait : ${data.totalChars.toLocaleString("fr-FR")} caractères`
        );
      } catch (err) {
        console.error(err);
        toast.error("Erreur réseau lors de l'envoi du PDF.");
      } finally {
        setUploading(false);
      }
    },
    []
  );

  /** Drag & drop handlers */
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    },
    []
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
    },
    []
  );

  /** Generate QCM via /api/generate-qcm. */
  const generate = useCallback(async () => {
    // Defensive null/empty check — the upload API guarantees a non-empty
    // string, but we double-guard so the generate-qcm API always receives a
    // valid string (never null/undefined).
    if (!pdfText || typeof pdfText !== "string" || pdfText.trim().length === 0) {
      toast.error("Impossible d'extraire le texte du PDF");
      return;
    }
    if (pdfText.length < 30) {
      toast.error("Impossible d'extraire le texte du PDF");
      return;
    }
    setGenerating(true);
    try {
      // pdfText is guaranteed to be a non-empty string here.
      const safeText: string = pdfText;
      const res = await fetch("/api/generate-qcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: safeText, count, subject }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Échec de la génération.");
        return;
      }
      const qs: GeneratedQuestion[] = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length === 0) {
        toast.error("Aucune question valide n'a pu être générée.");
        return;
      }
      setQuestions(qs);
      // Select all by default so a single click on "Ajouter" saves everything.
      setSelected(new Set(qs.map((_, i) => i)));
      setStep("generated");
      toast.success(`${qs.length} question(s) générée(s) ✓`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau lors de la génération.");
    } finally {
      setGenerating(false);
    }
  }, [pdfText, count, subject]);

  /** Toggle a single question's selection. */
  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  /** Select / deselect all generated questions. */
  const selectAll = () => setSelected(new Set(questions.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  /** Remove a generated question (and reindex selection). */
  const removeQuestion = (i: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
    setSelected((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  };

  /** Patch a question after inline editing. */
  const saveEditedQuestion = (i: number, updated: GeneratedQuestion) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? updated : q)));
    setEditingIndex(null);
  };

  /** Validate that the questions the admin wants to save are still valid. */
  const isValidQuestion = (q: GeneratedQuestion): boolean => {
    for (const f of ["question", "optionA", "optionB", "optionC", "optionD", "explanation"] as const) {
      if (!q[f] || q[f].trim().length === 0) return false;
    }
    if (!["A", "B", "C", "D"].includes(q.correctAnswer)) return false;
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map((s) => s.trim().toLowerCase());
    return new Set(opts).size === 4;
  };

  /** Create a new bank then return its id (used by the save flow). */
  const createNewBank = async (): Promise<string | null> => {
    const title = newBankTitle.trim();
    if (!title) {
      toast.error("Veuillez saisir un titre pour la nouvelle banque.");
      return null;
    }
    const res = await fetch("/api/admin/banks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: `Banque créée depuis PDF — ${pdfInfo?.fileName ?? "document.pdf"}`,
        category: newBankCategory,
        color: "emerald",
        icon: "BookOpen",
        level: "TOUS",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Échec de la création de la banque.");
      return null;
    }
    return data.id as string;
  };

  /** Save each selected question to the chosen bank via POST /api/admin/questions. */
  const saveSelectedToBank = async () => {
    const targets = Array.from(selected)
      .map((i) => questions[i])
      .filter(Boolean) as GeneratedQuestion[];

    if (targets.length === 0) {
      toast.error("Sélectionnez au moins une question à ajouter.");
      return;
    }

    // Reject invalid ones up-front so we don't half-save a batch.
    const invalidCount = targets.filter((q) => !isValidQuestion(q)).length;
    if (invalidCount > 0) {
      toast.error(
        `${invalidCount} question(s) invalide(s) : vérifiez les options et la réponse correcte.`
      );
      return;
    }

    let bankId: string | null = null;
    if (targetMode === "existing") {
      bankId = selectedBankId || null;
      if (!bankId) {
        toast.error("Veuillez sélectionner une banque existante.");
        return;
      }
    } else {
      // createNewBank returns Promise<string | null> — handle null defensively.
      bankId = await createNewBank();
      if (!bankId) return; // createNewBank already toasted
    }

    setSaving(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const q of targets) {
        try {
          const res = await fetch("/api/admin/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bankId,
              question: q.question.trim(),
              optionA: q.optionA.trim(),
              optionB: q.optionB.trim(),
              optionC: q.optionC.trim(),
              optionD: q.optionD.trim(),
              correctAnswer: q.correctAnswer.trim().toUpperCase(),
              explanation: q.explanation.trim(),
              difficulty: "medium",
            }),
          });
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      if (ok > 0) {
        toast.success(`${ok} question(s) ajoutée(s) à la banque ✓`);
        onSaved?.();
        onOpenChange(false);
      } else {
        toast.error("Échec de l'enregistrement des questions.");
      }
      if (fail > 0 && ok > 0) {
        toast.warning(`${fail} question(s) n'ont pas pu être enregistrées.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Générer des QCM depuis un PDF
          </DialogTitle>
          <DialogDescription>
            Importez un document PDF, l&apos;IA génère automatiquement des
            questions à choix multiples que vous pouvez vérifier et ajouter à
            une banque.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {[
            { id: "upload", label: "1. PDF", n: 1 },
            { id: "configure", label: "2. Options", n: 2 },
            { id: "generated", label: "3. Questions", n: 3 },
          ].map((s, i) => {
            const active = step === s.id;
            const done =
              (step === "configure" && s.id === "upload") ||
              (step === "generated" && (s.id === "upload" || s.id === "configure"));
            return (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                    active
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : done
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {s.n}
                </span>
                <span
                  className={
                    active
                      ? "text-foreground"
                      : done
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-muted-foreground"
                  }
                >
                  {s.label}
                </span>
                {i < 2 && <span className="text-muted-foreground/40">→</span>}
              </div>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {/* === Step 1: Upload === */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-border bg-muted/30 hover:border-emerald-400 hover:bg-muted/50"
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                    <p className="text-sm font-medium">Extraction du texte en cours…</p>
                    <p className="text-xs text-muted-foreground">
                      Cela peut prendre quelques secondes selon la taille du PDF.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        Glissez-déposez un PDF ici
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ou cliquez pour parcourir · taille max 10 Mo
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="h-4 w-4" />
                      Choisir un fichier
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                        // Reset so selecting the same file again re-fires onChange.
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Le PDF doit contenir du texte sélectionnable. Les PDF
                    scannés (images sans OCR) ne peuvent pas être traités.
                    L&apos;extraction est limitée aux ~5000 premiers caractères
                    pour l&apos;IA.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* === Step 2: Configure === */}
          {step === "configure" && (
            <div className="space-y-4">
              {/* Text preview */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="text-sm font-semibold">Texte extrait</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {pdfInfo?.fileName && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <FileText className="h-3 w-3" />
                        {pdfInfo.fileName}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {pdfInfo?.totalChars.toLocaleString("fr-FR")} car.
                    </Badge>
                    {pdfInfo?.truncated && (
                      <Badge
                        variant="outline"
                        className="border-amber-400 text-[10px] text-amber-700"
                      >
                        tronqué
                      </Badge>
                    )}
                  </div>
                </div>
                <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                    {pdfText}
                  </p>
                </ScrollArea>
              </div>

              {/* Subject / title */}
              <div>
                <Label className="text-sm font-semibold">
                  Sujet / titre (optionnel)
                </Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Droit constitutionnel — Constitutions du Burkina Faso"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Aide l&apos;IA à contextualiser les questions générées.
                </p>
              </div>

              {/* Question count slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Nombre de questions
                  </Label>
                  <Badge className="bg-emerald-600 text-white">{count}</Badge>
                </div>
                <Slider
                  value={[count]}
                  min={MIN_Q}
                  max={MAX_Q}
                  step={1}
                  onValueChange={(v) => setCount(v[0] ?? DEFAULT_Q)}
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{MIN_Q}</span>
                  <span>{MAX_Q}</span>
                </div>
              </div>
            </div>
          )}

          {/* === Step 3: Generated questions === */}
          {step === "generated" && (
            <div className="flex min-h-0 flex-col gap-3">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">{questions.length} générées</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-emerald-600">
                    {selectedCount} sélectionnée(s)
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={selectAll}>
                    Tout sélectionner
                  </Button>
                  <Button size="sm" variant="ghost" onClick={deselectAll}>
                    Tout désélectionner
                  </Button>
                </div>
              </div>

              {/* Questions list */}
              <ScrollArea className="max-h-[40vh] rounded-lg border">
                <div className="space-y-2 p-2">
                  {questions.map((q, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 transition-colors ${
                        selected.has(i)
                          ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selected.has(i)}
                          onCheckedChange={() => toggleSelect(i)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          {editingIndex === i ? (
                            <QuestionInlineEditor
                              initial={q}
                              onCancel={() => setEditingIndex(null)}
                              onSave={(updated) => saveEditedQuestion(i, updated)}
                            />
                          ) : (
                            <>
                              <p className="break-words text-sm font-medium">
                                {q.question}
                              </p>
                              <div className="mt-1 flex flex-col gap-1 text-xs">
                                {[
                                  { L: "A", t: q.optionA },
                                  { L: "B", t: q.optionB },
                                  { L: "C", t: q.optionC },
                                  { L: "D", t: q.optionD },
                                ].map(({ L, t }) => {
                                  const isCorrect = q.correctAnswer === L;
                                  return (
                                    <div
                                      key={L}
                                      className={`flex items-start gap-1.5 rounded px-1.5 py-0.5 ${
                                        isCorrect
                                          ? "bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                          : "bg-muted/50 text-muted-foreground"
                                      }`}
                                    >
                                      <span className="shrink-0 font-bold">{L})</span>
                                      <span className="break-words">{t}</span>
                                      {isCorrect && (
                                        <CheckCircle2 className="ml-auto h-3 w-3 shrink-0 text-emerald-600" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="mt-1 break-words rounded bg-amber-50 p-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                <span className="font-semibold">Explication: </span>
                                {q.explanation}
                              </p>
                            </>
                          )}
                        </div>
                        {editingIndex !== i && (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:bg-emerald-100 hover:text-emerald-700"
                              onClick={() => setEditingIndex(i)}
                              title="Modifier"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:bg-rose-100 hover:text-rose-700"
                              onClick={() => removeQuestion(i)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {questions.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Aucune question générée.
                    </p>
                  )}
                </div>
              </ScrollArea>

              {/* Bank selector */}
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <Label className="text-sm font-semibold">
                  Ajouter à une banque
                </Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode("existing")}
                    className={`rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                      targetMode === "existing"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    Banque existante
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode("new")}
                    className={`flex items-center gap-1 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                      targetMode === "new"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <FolderPlus className="h-3 w-3" />
                    Nouvelle banque
                  </button>
                </div>

                {targetMode === "existing" ? (
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une banque…" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title} ({b._count?.questions ?? 0} Q)
                        </SelectItem>
                      ))}
                      {banks.length === 0 && (
                        <SelectItem value="_none" disabled>
                          Aucune banque — créez-en une nouvelle
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={newBankTitle}
                      onChange={(e) => setNewBankTitle(e.target.value)}
                      placeholder="Titre de la nouvelle banque"
                    />
                    <Select
                      value={newBankCategory}
                      onValueChange={setNewBankCategory}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Culture Générale",
                          "Psychotechnique",
                          "Secondaire",
                          "Universitaire",
                          "Concours",
                          "Divers",
                        ].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t pt-3">
          {step === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
              <X className="h-4 w-4" />
              Annuler
            </Button>
          )}

          {step === "configure" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="gap-1.5"
              >
                Retour
              </Button>
              <Button
                onClick={generate}
                disabled={generating || !pdfText}
                className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {generating ? "Génération…" : "Générer"}
              </Button>
            </>
          )}

          {step === "generated" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("configure")}
                className="gap-1.5"
                disabled={saving}
              >
                Retour
              </Button>
              <Button
                onClick={saveSelectedToBank}
                disabled={saving || selectedCount === 0}
                className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving
                  ? "Enregistrement…"
                  : `Ajouter ${selectedCount} à la banque`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline editor for a single generated question — used when the admin wants to
 * tweak wording, an option, the correct answer or the explanation before
 * saving to a bank.
 */
function QuestionInlineEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: GeneratedQuestion;
  onCancel: () => void;
  onSave: (q: GeneratedQuestion) => void;
}) {
  const [q, setQ] = useState(initial.question);
  const [a, setA] = useState(initial.optionA);
  const [b, setB] = useState(initial.optionB);
  const [c, setC] = useState(initial.optionC);
  const [d, setD] = useState(initial.optionD);
  const [correct, setCorrect] = useState(initial.correctAnswer);
  const [expl, setExpl] = useState(initial.explanation);

  const hasDupes =
    new Set([a, b, c, d].map((s) => s.trim().toLowerCase())).size < 4;

  const allFilled =
    q.trim() && a.trim() && b.trim() && c.trim() && d.trim() && expl.trim();

  return (
    <div className="space-y-2">
      <Textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={2}
        className="resize-none text-sm"
        placeholder="Question"
      />
      <div className="space-y-1.5">
        {[
          { L: "A", v: a, set: setA },
          { L: "B", v: b, set: setB },
          { L: "C", v: c, set: setC },
          { L: "D", v: d, set: setD },
        ].map(({ L, v, set }) => (
          <div key={L} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCorrect(L)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold transition-colors ${
                correct === L
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {correct === L ? <CheckCircle2 className="h-3.5 w-3.5" /> : L}
            </button>
            <Input
              value={v}
              onChange={(e) => set(e.target.value)}
              className="h-8 flex-1 text-xs"
            />
          </div>
        ))}
      </div>
      {hasDupes && (
        <p className="text-[11px] text-rose-600">
          Les 4 options doivent être différentes.
        </p>
      )}
      <Textarea
        value={expl}
        onChange={(e) => setExpl(e.target.value)}
        rows={2}
        className="resize-none text-xs"
        placeholder="Explication"
      />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              question: q.trim(),
              optionA: a.trim(),
              optionB: b.trim(),
              optionC: c.trim(),
              optionD: d.trim(),
              correctAnswer: correct.trim().toUpperCase(),
              explanation: expl.trim(),
            })
          }
          disabled={!allFilled || hasDupes}
          className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Save className="h-3 w-3" />
          OK
        </Button>
      </div>
    </div>
  );
}

export default PdfUploadDialog;
