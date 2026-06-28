"use client";

<<<<<<< Updated upstream
import { useState } from "react";
=======
import { useCallback, useEffect, useState } from "react";
>>>>>>> Stashed changes
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
<<<<<<< Updated upstream
=======
import { Skeleton } from "@/components/ui/skeleton";
>>>>>>> Stashed changes
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
<<<<<<< Updated upstream
  DialogFooter,
} from "@/components/ui/dialog";
import { Database, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import type { AdminStats, BankWithCount } from "./types";

/**
 * BanksTab — Banks & QCM tab content.
 *
 * Renders the PDF upload callout + the full bank list. Clicking a bank calls
 * `onSelectBank(bank)` so the parent can open BankQuestionsDialog.
 */
export function BanksTab({
  stats,
  onSelectBank,
  onUploadPdf,
}: {
  stats: AdminStats | null;
  onSelectBank: (bank: BankWithCount) => void;
  onUploadPdf: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                Générer des QCM depuis un PDF
              </p>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80">
                Importez un document, l&apos;IA génère des questions que vous
                pouvez vérifier et ajouter à une banque.
              </p>
            </div>
          </div>
          <Button
            onClick={onUploadPdf}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            <FileText className="h-4 w-4" />
            Upload PDF
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Database className="h-4 w-4 text-emerald-600" />
            Banques de questions ({stats?.bankStats.length ?? 0})
          </h2>
          <p className="text-sm text-muted-foreground">
            Cliquez sur une banque pour gérer et corriger ses questions
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {stats?.bankStats.map((bank) => (
            <button
              key={bank.id}
              onClick={() => onSelectBank(bank)}
              className="flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-emerald-400 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{bank.title}</p>
                <p className="text-xs text-muted-foreground">
                  {bank.category}
                  {bank.subcategory ? ` · ${bank.subcategory}` : ""}
                </p>
              </div>
              <Badge variant="secondary">
                {bank._count.questions} Q
              </Badge>
            </button>
          ))}
        </div>
      </Card>
    </div>
=======
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { BankWithCount, Question } from "./types";

/**
 * AdminBanks — onglet "Banques & QCM".
 * Affiche la liste des banques + ouvre BankQuestionsDialog au clic.
 */
export function AdminBanks({
  stats,
  onSelectBank,
}: {
  stats: { bankStats: Array<{ id: string; title: string; category: string; subcategory: string; _count: { questions: number } }> } | null;
  onSelectBank: (bank: BankWithCount) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Database className="h-4 w-4 text-emerald-600" />
          Banques de questions ({stats?.bankStats.length ?? 0})
        </h2>
        <p className="text-sm text-muted-foreground">
          Cliquez sur une banque pour gérer et corriger ses questions
        </p>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {stats?.bankStats.map((bank) => (
          <button
            key={bank.id}
            onClick={() => onSelectBank(bank as BankWithCount)}
            className="flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-emerald-400 hover:shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{bank.title}</p>
              <p className="text-xs text-muted-foreground">
                {bank.category}
                {bank.subcategory ? ` · ${bank.subcategory}` : ""}
              </p>
            </div>
            <Badge variant="secondary">
              {bank._count.questions} Q
            </Badge>
          </button>
        ))}
      </div>
    </Card>
>>>>>>> Stashed changes
  );
}

/**
<<<<<<< Updated upstream
 * NewBankDialog — modal form for creating a new question bank.
=======
 * BankQuestionsDialog — dialogue de gestion des questions d'une banque.
 * Liste + recherche + édition/création/suppression.
 */
export function BankQuestionsDialog({
  bank,
  onClose,
  onChanged,
}: {
  bank: BankWithCount;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/banks/${bank.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [bank.id]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function deleteQuestion(id: string) {
    if (!confirm("Supprimer définitivement cette question ?")) return;
    const res = await fetch(`/api/admin/questions?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Question supprimée ✓");
      loadQuestions();
      onChanged();
    } else {
      toast.error("Échec de la suppression");
    }
  }

  const filteredQuestions = questions.filter((q) => {
    if (!searchQ.trim()) return true;
    const s = searchQ.toLowerCase();
    return (
      q.question.toLowerCase().includes(s) ||
      q.optionA.toLowerCase().includes(s) ||
      q.optionB.toLowerCase().includes(s) ||
      q.optionC.toLowerCase().includes(s) ||
      q.optionD.toLowerCase().includes(s)
    );
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            {bank.title}
          </DialogTitle>
          <DialogDescription>
            {questions.length} question(s) — catégorie : {bank.category}
            {bank.subcategory ? ` · ${bank.subcategory}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Rechercher dans cette banque..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="h-9 sm:max-w-xs"
          />
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => setCreatingQuestion(true)}
          >
            <Plus className="h-4 w-4" />
            Ajouter un QCM
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {searchQ ? "Aucune question ne correspond à votre recherche." : "Aucune question dans cette banque."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="group rounded-lg border p-3 transition-colors hover:border-emerald-300 hover:bg-muted/40"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{q.question}</p>
                      <div className="mt-1 flex flex-col gap-1 text-xs">
                        {["A", "B", "C", "D"].map((L) => {
                          const text =
                            L === "A"
                              ? q.optionA
                              : L === "B"
                                ? q.optionB
                                : L === "C"
                                  ? q.optionC
                                  : q.optionD;
                          const isCorrect = q.correctAnswer === L;
                          const isCorrect2 = q.correctAnswer2 === L;
                          return (
                            <div
                              key={L}
                              className={`flex items-start gap-1.5 rounded px-1.5 py-0.5 ${
                                isCorrect || isCorrect2
                                  ? "bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              <span className="shrink-0 font-bold">{L})</span>
                              <span className="break-words">{text}</span>
                              {(isCorrect || isCorrect2) && (
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="mt-1 break-words rounded bg-amber-50 p-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                          <span className="font-semibold">Explication: </span>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-emerald-100 hover:text-emerald-700"
                        onClick={() => setEditingQuestion(q)}
                        title="Modifier cette question"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-rose-100 hover:text-rose-700"
                        onClick={() => deleteQuestion(q.id)}
                        title="Supprimer cette question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {searchQ ? `${filteredQuestions.length} sur ${questions.length} question(s)` : `${questions.length} question(s) au total`}
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
            Fermer
          </Button>
        </div>
      </DialogContent>

      {(editingQuestion || creatingQuestion) && (
        <QuestionEditor
          bankId={bank.id}
          question={editingQuestion}
          onClose={() => {
            setEditingQuestion(null);
            setCreatingQuestion(false);
          }}
          onSaved={() => {
            setEditingQuestion(null);
            setCreatingQuestion(false);
            loadQuestions();
            onChanged();
          }}
        />
      )}
    </Dialog>
  );
}

/**
 * QuestionEditor — dialogue de création/édition d'une question QCM.
 */
export function QuestionEditor({
  bankId,
  question,
  onClose,
  onSaved,
}: {
  bankId: string;
  question: Question | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [q, setQ] = useState(question?.question ?? "");
  const [a, setA] = useState(question?.optionA ?? "");
  const [b, setB] = useState(question?.optionB ?? "");
  const [c, setC] = useState(question?.optionC ?? "");
  const [d, setD] = useState(question?.optionD ?? "");
  const [correct, setCorrect] = useState(question?.correctAnswer ?? "A");
  const [expl, setExpl] = useState(question?.explanation ?? "");
  const [difficulty, setDifficulty] = useState<string>(
    (question as (Question & { difficulty?: string }) | null)?.difficulty ?? "medium"
  );
  const [saving, setSaving] = useState(false);

  const isValid = q.trim() && a.trim() && b.trim() && c.trim() && d.trim() && expl.trim();
  const hasDuplicateOptions = new Set([a.trim().toLowerCase(), b.trim().toLowerCase(), c.trim().toLowerCase(), d.trim().toLowerCase()]).size < 4;

  async function save() {
    if (!isValid) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }
    if (hasDuplicateOptions) {
      toast.error("Les 4 options doivent être différentes");
      return;
    }
    setSaving(true);
    try {
      const body = {
        bankId,
        question: q.trim(),
        optionA: a.trim(),
        optionB: b.trim(),
        optionC: c.trim(),
        optionD: d.trim(),
        correctAnswer: correct,
        explanation: expl.trim(),
        difficulty,
      };
      const res = await fetch("/api/admin/questions", {
        method: question ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(question ? { id: question.id, ...body } : body),
      });
      if (res.ok) {
        toast.success(
          question ? "Question modifiée ✓" : "Question ajoutée ✓"
        );
        onSaved();
      } else {
        const data = await res.json();
        toast.error(data.error || "Échec de l'enregistrement");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {question ? (
              <>
                <Pencil className="h-5 w-5 text-emerald-600" />
                Modifier la question
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-emerald-600" />
                Nouveau QCM
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {question
              ? "Corrigez la question, les options ou l'explication. Cliquez sur la lettre pour définir la réponse correcte."
              : "Ajoutez une nouvelle question à cette banque."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Question *</Label>
            <Textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              rows={2}
              placeholder="Libellé de la question..."
              className="mt-1 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Options de réponse *</Label>
            <p className="text-xs text-muted-foreground">
              Cliquez sur la lettre pour définir la bonne réponse
            </p>
            {[
              { L: "A", v: a, set: setA },
              { L: "B", v: b, set: setB },
              { L: "C", v: c, set: setC },
              { L: "D", v: d, set: setD },
            ].map(({ L, v, set }) => (
              <div key={L} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(L)}
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    correct === L
                      ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title="Définir comme réponse correcte"
                >
                  {correct === L ? <CheckCircle2 className="h-4 w-4" /> : L}
                </button>
                <Input
                  value={v}
                  onChange={(e) => set(e.target.value)}
                  placeholder={`Option ${L}`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          {hasDuplicateOptions && (a || b || c || d) && (
            <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              ⚠️ Les 4 options doivent être différentes les unes des autres
            </div>
          )}

          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            ✓ Réponse correcte : <strong>{correct}</strong>
          </div>

          <div>
            <Label className="text-sm font-semibold">Explication *</Label>
            <Textarea
              value={expl}
              onChange={(e) => setExpl(e.target.value)}
              rows={2}
              placeholder="Explication de la réponse correcte..."
              className="mt-1 resize-none"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold">Niveau de difficulté</Label>
            <div className="mt-1 flex gap-2">
            {[
              { value: "easy", label: "Facile", color: "emerald" },
              { value: "medium", label: "Moyen", color: "amber" },
              { value: "hard", label: "Difficile", color: "rose" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  difficulty === opt.value
                    ? opt.color === "emerald"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : opt.color === "amber"
                        ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                        : "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
            </div>
          </div>

          {isValid && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Aperçu :</p>
              <p className="text-sm font-medium">{q}</p>
              <div className="mt-2 space-y-1">
                {[
                  { L: "A", v: a },
                  { L: "B", v: b },
                  { L: "C", v: c },
                  { L: "D", v: d },
                ].map(({ L, v }) => (
                  <div
                    key={L}
                    className={`flex items-center gap-2 rounded border px-2 py-1 text-xs ${
                      correct === L
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <span className="font-bold">{L}.</span>
                    <span>{v}</span>
                    {correct === L && <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
            Annuler
          </Button>
          <Button
            onClick={save}
            disabled={saving || !isValid}
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {question ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * NewBankDialog — dialogue de création d'une nouvelle banque de questions.
>>>>>>> Stashed changes
 */
export function NewBankDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Culture Générale");
  const [subcategory, setSubcategory] = useState("");
  const [color, setColor] = useState("emerald");
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          subcategory,
          color,
          icon: "BookOpen",
          level: "TOUS",
        }),
      });
      if (res.ok) {
        toast.success("Banque créée");
        setTitle("");
        setDescription("");
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle banque de questions</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Culture Générale - Concours 2026"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
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
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Couleur</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "emerald",
                    "violet",
                    "amber",
                    "sky",
                    "rose",
                    "cyan",
                    "teal",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Sous-catégorie</Label>
            <Input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Ex: Histoire"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={create} disabled={saving || !title}>
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
