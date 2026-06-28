"use client";

<<<<<<< Updated upstream
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
=======
import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
>>>>>>> Stashed changes
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
<<<<<<< Updated upstream
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
=======
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FileType2,
  Upload,
  Loader2,
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { BankSelector, BankOption } from "./bank-selector";
import { QuestionCardEditor, EditableQuestion } from "./question-card-editor";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

type Stage = "upload" | "preview-text" | "generating" | "preview-questions";

export function PdfUploadDialog({ open, onOpenChange, onImported }: Props) {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [sourceKind, setSourceKind] = useState<"pdf" | "docx">("pdf");
  const [uploading, setUploading] = useState(false);
  const [count, setCount] = useState(10);
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [targetBank, setTargetBank] = useState<string>("");
  const [newBankTitle, setNewBankTitle] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!open) {
      setStage("upload");
      setFile(null);
      setExtractedText("");
      setFileName("");
      setQuestions([]);
      setSubject("");
      setCount(10);
      setTargetBank("");
      setNewBankTitle("");
    }
  }, [open]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".pdf")) {
      setSourceKind("pdf");
    } else if (lower.endsWith(".docx")) {
      setSourceKind("docx");
    } else {
      toast.error("Format non supporté. Utilisez .pdf ou .docx");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
      return;
    }
    setFile(f);
    setFileName(f.name);
    // Auto-fill subject from filename
    if (!subject) {
      const base = f.name.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ");
      setSubject(base.slice(0, 60));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleUploadAndExtract() {
    if (!file) {
      toast.error("Choisissez un fichier");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint =
        sourceKind === "pdf" ? "/api/upload-pdf" : "/api/upload-word";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Échec de l'extraction");
        return;
      }
      setExtractedText(data.text ?? "");
      setStage("preview-text");
      if (data.truncated) {
        toast.info(
          `Texte tronqué à 5000 caractères (${data.totalLength} au total)`
        );
      } else {
        toast.success("Texte extrait ✓");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!extractedText || extractedText.trim().length < 50) {
      toast.error("Texte source trop court");
      return;
    }
    if (!subject.trim()) {
      toast.error("Indiquez le sujet");
      return;
    }
    setStage("generating");
    try {
      const res = await fetch("/api/generate-qcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extractedText,
          count,
          subject: subject.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Échec de la génération");
        setStage("preview-text");
        return;
      }
      const qs: EditableQuestion[] = (data.questions ?? []).map((q: any) => ({
        question: q.question ?? "",
        optionA: q.optionA ?? "",
        optionB: q.optionB ?? "",
        optionC: q.optionC ?? "",
        optionD: q.optionD ?? "",
        correctAnswer: q.correctAnswer ?? "A",
        explanation: q.explanation ?? "",
        warnings: [],
      }));
      if (qs.length === 0) {
        toast.error("Aucune question générée. Réessayez.");
        setStage("preview-text");
        return;
      }
      setQuestions(qs);
      setStage("preview-questions");
      toast.success(`${qs.length} question(s) générée(s) ✓`);
    } catch {
      toast.error("Erreur réseau");
      setStage("preview-text");
    }
  }

  function updateQuestion(idx: number, q: EditableQuestion) {
    setQuestions((prev) => prev.map((p, i) => (i === idx ? q : p)));
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function validCount() {
    return questions.filter((q) => {
      const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map((s) =>
        s.trim().toLowerCase()
      );
      return (
        q.question.trim() &&
        q.optionA.trim() &&
        q.optionB.trim() &&
        q.optionC.trim() &&
        q.optionD.trim() &&
        q.explanation.trim() &&
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
      let bankId = targetBank;
      if (targetBank === "new") {
        const createRes = await fetch("/api/admin/banks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newBankTitle.trim(),
            description: `Banque générée depuis ${fileName}`,
            category: "Divers",
            subcategory: "",
            icon: sourceKind === "pdf" ? "FileText" : "FileType2",
            color: "violet",
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
          q.explanation.trim() &&
          new Set(opts).size === 4
        );
      });

      if (validQs.length === 0) {
        toast.error("Aucune question valide");
        return;
      }

      const res = await fetch("/api/import-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: validQs, bankId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Échec import");
        return;
      }
      toast.success(
        `${data.success} question(s) importée(s) ✓`
      );
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
      <DialogContent className="flex max-h-[95vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sourceKind === "pdf" ? (
              <FileText className="h-5 w-5 text-rose-600" />
            ) : (
              <FileType2 className="h-5 w-5 text-sky-600" />
            )}
            Importer un document (PDF ou Word)
          </DialogTitle>
          <DialogDescription>
            Téléversez un fichier PDF ou .docx, extrayez le texte, puis
            générez des QCM automatiquement par IA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {/* Stage 1: Upload */}
          {stage === "upload" && (
            <div className="space-y-3">
>>>>>>> Stashed changes
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
<<<<<<< Updated upstream
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
=======
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-border hover:border-emerald-400 hover:bg-muted/30"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold">
                    Glissez un fichier ici ou cliquez pour parcourir
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formats: PDF (.pdf) ou Word (.docx) — Max 10 Mo
                  </p>
                </div>
                {file && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                    {sourceKind === "pdf" ? (
                      <FileText className="h-4 w-4 text-rose-600" />
                    ) : (
                      <FileType2 className="h-4 w-4 text-sky-600" />
                    )}
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} Mo)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFileName("");
                      }}
                      className="ml-2 text-muted-foreground hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          )}

          {/* Stage 2: Preview extracted text + config */}
          {stage === "preview-text" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  <strong>{fileName}</strong> — texte extrait ({
                    extractedText.length
                  }{" "}
                  caractères)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 gap-1 text-xs"
                  onClick={() => setStage("upload")}
                >
                  Changer de fichier
                </Button>
              </div>

              <div>
                <Label>Aperçu du texte extrait</Label>
                <div className="mt-1 max-h-[200px] overflow-y-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
                  {extractedText || "(texte vide)"}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="subject">Sujet / Thématique *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Histoire du Burkina Faso"
                  />
                </div>
                <div>
                  <Label htmlFor="count">Nombre de questions: {count}</Label>
                  <input
                    id="count"
                    type="range"
                    min={5}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="mt-3 w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5</span>
                    <span>20</span>
                  </div>
>>>>>>> Stashed changes
                </div>
              </div>
            </div>
          )}

<<<<<<< Updated upstream
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
=======
          {/* Stage 3: Generating */}
          {stage === "generating" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
              <p className="font-medium">
                Génération de {count} questions en cours...
              </p>
              <p className="text-xs text-muted-foreground">
                L&apos;IA analyse le texte et crée des QCM. Cela peut prendre
                30-60 secondes.
              </p>
            </div>
          )}

          {/* Stage 4: Preview & edit generated questions */}
          {stage === "preview-questions" && (
            <div className="space-y-3">
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto gap-1.5 text-xs"
                  onClick={() => setStage("preview-text")}
                >
                  Retour
                </Button>
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
>>>>>>> Stashed changes
              </div>
            </div>
          )}
        </div>

<<<<<<< Updated upstream
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
=======
        {/* Bank selector — visible in stage 4 */}
        {stage === "preview-questions" && (
          <div className="border-t pt-3">
            <BankSelector
              value={targetBank}
              newBankTitle={newBankTitle}
              banks={banks}
              onValueChange={setTargetBank}
              onNewTitleChange={setNewBankTitle}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {stage === "upload" && (
            <Button
              onClick={handleUploadAndExtract}
              disabled={!file || uploading}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Extraire le texte
            </Button>
          )}
          {stage === "preview-text" && (
            <Button
              onClick={handleGenerate}
              disabled={!subject.trim() || !extractedText}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
            >
              <Sparkles className="h-4 w-4" />
              Générer {count} questions par IA
            </Button>
          )}
          {stage === "preview-questions" && (
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

        {stage === "preview-questions" && valid < questions.length && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              {questions.length - valid} question(s) seront ignorées car
              invalides. Corrigez-les ou supprimez-les.
            </p>
          </div>
        )}
>>>>>>> Stashed changes
      </DialogContent>
    </Dialog>
  );
}
<<<<<<< Updated upstream

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
=======
>>>>>>> Stashed changes
