"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  Loader2,
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

// ===== CSV utilities =====
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur);
  return result;
}

function parseCsv(text: string): Record<string, string>[] {
  // Normalize line endings
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  // Split into rows, handling multi-line quoted fields (basic handling)
  const rows: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
    } else if (ch === "\n" && !inQuotes) {
      rows.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) rows.push(cur);

  if (rows.length === 0) return [];
  const headers = parseCsvLine(rows[0]).map((h) =>
    h.trim().toLowerCase().replace(/^"|"$/g, "")
  );
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.trim()) continue;
    const cells = parseCsvLine(row);
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const v = (cells[j] ?? "").trim().replace(/^"|"$/g, "");
      obj[headers[j]] = v;
    }
    out.push(obj);
  }
  return out;
}

function normalizeQuestion(obj: Record<string, any>): EditableQuestion {
  const get = (keys: string[]) => {
    for (const k of keys) {
      for (const objKey of Object.keys(obj)) {
        if (objKey.toLowerCase().trim() === k.toLowerCase()) {
          return String(obj[objKey] ?? "").trim();
        }
      }
    }
    return "";
  };
  const correctRaw = get(["correctAnswer", "correct", "answer", "reponse", "réponse"]);
  const correctLetter =
    correctRaw && /^[A-Da-d]/.test(correctRaw)
      ? correctRaw[0].toUpperCase()
      : "A";
  return {
    question: get(["question", "q", "enonce", "énoncé", "libelle"]),
    optionA: get(["optionA", "a", "optA", "choiceA"]),
    optionB: get(["optionB", "b", "optB", "choiceB"]),
    optionC: get(["optionC", "c", "optC", "choiceC"]),
    optionD: get(["optionD", "d", "optD", "choiceD"]),
    correctAnswer: correctLetter,
    explanation: get(["explanation", "explication", "justification", "raison"]),
    warnings: [],
  };
}

const TEMPLATE_CSV = `question,optionA,optionB,optionC,optionD,correctAnswer,explanation
"Quelle est la capitale du Burkina Faso?","Ouagadougou","Bobo-Dioulasso","Koudougou","Banfora","A","Ouagadougou est la capitale politique et administrative du Burkina Faso."
"Combien de régions compte le Burkina Faso (2025)?","13","15","17","19","C","Depuis juillet 2025, le Burkina Faso compte 17 régions."`;

const TEMPLATE_JSON = JSON.stringify(
  [
    {
      question: "Quelle est la capitale du Burkina Faso?",
      optionA: "Ouagadougou",
      optionB: "Bobo-Dioulasso",
      optionC: "Koudougou",
      optionD: "Banfora",
      correctAnswer: "A",
      explanation:
        "Ouagadougou est la capitale politique et administrative du Burkina Faso.",
    },
  ],
  null,
  2
);

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImportCsvDialog({ open, onOpenChange, onImported }: Props) {
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState<"csv" | "json">("csv");
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
      setQuestions([]);
      setFileName("");
      setTargetBank("");
      setNewBankTitle("");
    }
  }, [open]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    const lower = f.name.toLowerCase();
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      try {
        if (lower.endsWith(".json")) {
          setFileKind("json");
          const parsed = JSON.parse(content);
          const arr = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.questions)
              ? parsed.questions
              : [];
          const qs = arr.map((o) => normalizeQuestion(o));
          setQuestions(qs);
          setFileName(f.name);
          toast.success(`${qs.length} question(s) chargée(s) depuis JSON ✓`);
        } else if (lower.endsWith(".csv")) {
          setFileKind("csv");
          const rows = parseCsv(content);
          const qs = rows.map((o) => normalizeQuestion(o));
          setQuestions(qs);
          setFileName(f.name);
          toast.success(`${qs.length} question(s) chargée(s) depuis CSV ✓`);
        } else {
          toast.error("Format non supporté. Utilisez .csv ou .json");
        }
      } catch (e) {
        toast.error("Échec du parsing du fichier");
      }
    };
    reader.onerror = () => toast.error("Échec de lecture du fichier");
    reader.readAsText(f);
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
            description: `Banque importée depuis ${fileName}`,
            category: "Divers",
            subcategory: "",
            icon: "FileSpreadsheet",
            color: "amber",
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
      toast.success(`${data.success} question(s) importée(s) ✓`);
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
            <FileSpreadsheet className="h-5 w-5 text-amber-600" />
            Import en masse (CSV ou JSON)
          </DialogTitle>
          <DialogDescription>
            Importez plusieurs questions à la fois depuis un fichier CSV ou
            JSON. Téléchargez un modèle pour voir le format attendu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {/* Download templates */}
          {questions.length === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  downloadFile("modele-qcm.csv", TEMPLATE_CSV, "text/csv")
                }
              >
                <Download className="h-4 w-4" />
                Modèle CSV
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  downloadFile(
                    "modele-qcm.json",
                    TEMPLATE_JSON,
                    "application/json"
                  )
                }
              >
                <Download className="h-4 w-4" />
                Modèle JSON
              </Button>
            </div>
          )}

          {questions.length === 0 ? (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragging
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-border hover:border-amber-400 hover:bg-muted/30"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold">
                  Glissez un fichier CSV ou JSON ici
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Colonnes: question, optionA, optionB, optionC, optionD,
                  correctAnswer, explanation
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-amber-50 p-2 text-xs dark:bg-amber-950/30">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                <span className="font-medium">{fileName}</span>
                <Badge variant="secondary" className="ml-auto">
                  {fileKind.toUpperCase()}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setQuestions([])}
                >
                  <X className="h-3 w-3" />
                  Recommencer
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <Badge variant="secondary">
                  {questions.length} question(s)
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                  {valid} valide(s)
                </Badge>
                {questions.length - valid > 0 && (
                  <Badge variant="outline" className="border-rose-300 text-rose-700">
                    {questions.length - valid} invalide(s)
                  </Badge>
                )}
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
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {questions.length > 0 && (
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
          {questions.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing || valid === 0 || !targetBank}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
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
              {questions.length - valid} question(s) seront ignorées (invalides
              ou incomplètes).
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
