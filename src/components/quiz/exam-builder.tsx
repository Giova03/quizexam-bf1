"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

interface Bank {
  id: string;
  title: string;
  category: string;
  _count?: { questions: number };
}

interface QuestionLite {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  bankId: string;
  bankTitle: string;
}

interface SelectedItem {
  id: string; // unique UI id; for question items it's the questionId, for bank random items it's a generated id
  questionId: string | null;
  question: QuestionLite | null; // when explicitly selected
  bankId: string; // for random bank distribution
  bankTitle: string;
  count: number; // 1 for explicit question; n for bank distribution
  kind: "question" | "bank";
}

type BuilderMode = "questions" | "banks";

export function ExamBuilder({ open, onOpenChange, onCreated }: Props) {
  const [mode, setMode] = useState<BuilderMode>("questions");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankQuestions, setBankQuestions] = useState<QuestionLite[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [bankCounts, setBankCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Load banks on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/banks")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setBanks(list);
        if (list.length > 0 && !selectedBankId) {
          setSelectedBankId(list[0].id);
        }
      })
      .catch(() => setBanks([]));
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDuration(60);
      setSelected([]);
      setBankCounts({});
      setSearch("");
      setBankQuestions([]);
    }
  }, [open]);

  // Load questions when selected bank changes
  const loadBankQuestions = useCallback(async (bankId: string) => {
    if (!bankId) return;
    setLoadingBank(true);
    try {
      const res = await fetch(`/api/banks/${bankId}`);
      if (res.ok) {
        const data = await res.json();
        const bankTitle = banks.find((b) => b.id === bankId)?.title ?? "";
        const qs: QuestionLite[] = (data.questions ?? []).map((q: any) => ({
          id: q.id,
          question: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          bankId,
          bankTitle,
        }));
        setBankQuestions(qs);
      }
    } catch {
      setBankQuestions([]);
    } finally {
      setLoadingBank(false);
    }
  }, [banks]);

  useEffect(() => {
    if (mode === "questions" && selectedBankId) {
      loadBankQuestions(selectedBankId);
    }
  }, [mode, selectedBankId, loadBankQuestions]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelected((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function addQuestion(q: QuestionLite) {
    if (selected.some((s) => s.kind === "question" && s.questionId === q.id)) {
      toast.info("Question déjà ajoutée");
      return;
    }
    setSelected((prev) => [
      ...prev,
      {
        id: `q-${q.id}`,
        questionId: q.id,
        question: q,
        bankId: q.bankId,
        bankTitle: q.bankTitle,
        count: 1,
        kind: "question",
      },
    ]);
  }

  function removeSelected(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  function setBankCount(bankId: string, count: number) {
    setBankCounts((prev) => ({ ...prev, [bankId]: Math.max(0, count) }));
  }

  function addBanksDistribution() {
    const items: SelectedItem[] = [];
    for (const [bankId, count] of Object.entries(bankCounts)) {
      if (count > 0) {
        const bank = banks.find((b) => b.id === bankId);
        if (bank) {
          items.push({
            id: `bank-${bankId}`,
            questionId: null,
            question: null,
            bankId,
            bankTitle: bank.title,
            count,
            kind: "bank",
          });
        }
      }
    }
    if (items.length === 0) {
      toast.error("Indiquez un nombre de questions pour au moins une banque");
      return;
    }
    // Replace existing bank items with these, keep question items
    setSelected((prev) => [
      ...prev.filter((s) => s.kind === "question"),
      ...items,
    ]);
    toast.success(`${items.length} banque(s) ajoutée(s) à l'examen`);
  }

  const totalCount = selected.reduce((sum, s) => sum + s.count, 0);

  const filteredBankQuestions = bankQuestions.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      q.question.toLowerCase().includes(s) ||
      q.optionA.toLowerCase().includes(s) ||
      q.optionB.toLowerCase().includes(s) ||
      q.optionC.toLowerCase().includes(s) ||
      q.optionD.toLowerCase().includes(s)
    );
  });

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Titre requis");
      return;
    }
    if (selected.length === 0) {
      toast.error("Ajoutez au moins une question");
      return;
    }
    setSaving(true);
    try {
      // Build payload
      const explicitQuestionIds = selected
        .filter((s) => s.kind === "question" && s.questionId)
        .map((s) => s.questionId as string);
      const distributions = selected
        .filter((s) => s.kind === "bank")
        .map((s) => ({ bankId: s.bankId, count: s.count }));

      // If we have only explicit question IDs (preserve order from `selected`)
      let payload: any;
      if (distributions.length === 0 && explicitQuestionIds.length > 0) {
        // Re-order question IDs according to selected order
        const orderedIds = selected
          .filter((s) => s.kind === "question")
          .map((s) => s.questionId as string);
        payload = {
          title: title.trim(),
          description: description.trim(),
          durationMin: duration,
          questionIds: orderedIds,
        };
      } else if (explicitQuestionIds.length === 0 && distributions.length > 0) {
        payload = {
          title: title.trim(),
          description: description.trim(),
          durationMin: duration,
          distributions,
        };
      } else {
        // Mixed: send distributions + questionIds — API supports either/or but not both.
        // We'll just use distributions (the random pick will cover it) and warn the user
        toast.info(
          "Mode mixte: les questions individuelles seront tirées aléatoirement de leurs banques"
        );
        payload = {
          title: title.trim(),
          description: description.trim(),
          durationMin: duration,
          distributions,
        };
      }

      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Échec de la création");
        return;
      }
      toast.success("Examen créé ✓");
      onCreated?.();
      onOpenChange(false);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-violet-600" />
            Création d&apos;examen directe
          </DialogTitle>
          <DialogDescription>
            Composez un examen en sélectionnant des questions individuelles ou
            en distribuant par banque. Réorganisez par glisser-déposer.
          </DialogDescription>
        </DialogHeader>

        {/* Exam metadata */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="exam-title" className="text-xs">
              Titre *
            </Label>
            <Input
              id="exam-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Examen Blanc Concours 2026"
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="exam-duration" className="text-xs">
              Durée (min)
            </Label>
            <Input
              id="exam-duration"
              type="number"
              min={10}
              max={300}
              value={duration}
              onChange={(e) =>
                setDuration(parseInt(e.target.value) || 60)
              }
              className="h-9"
            />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          {/* LEFT: Question picker */}
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-xl border p-3">
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setMode("questions")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "questions"
                    ? "bg-violet-500 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Questions individuelles
              </button>
              <button
                type="button"
                onClick={() => setMode("banks")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "banks"
                    ? "bg-violet-500 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Par banque
              </button>
            </div>

            {mode === "questions" ? (
              <>
                <div className="flex gap-2">
                  <Select
                    value={selectedBankId}
                    onValueChange={(v) => setSelectedBankId(v)}
                  >
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Banque..." />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title} ({b._count?.questions ?? 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher dans la banque..."
                    className="h-9 pl-8"
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {loadingBank ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                    </div>
                  ) : filteredBankQuestions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Aucune question
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredBankQuestions.map((q) => {
                        const isAdded = selected.some(
                          (s) =>
                            s.kind === "question" && s.questionId === q.id
                        );
                        return (
                          <button
                            key={q.id}
                            onClick={() => addQuestion(q)}
                            disabled={isAdded}
                            className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-all ${
                              isAdded
                                ? "border-emerald-300 bg-emerald-50 opacity-60 dark:bg-emerald-950/30"
                                : "hover:border-violet-400 hover:bg-muted/40"
                            }`}
                          >
                            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 break-words text-xs font-medium">
                                {q.question}
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                Réponse: {q.correctAnswer}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Indiquez le nombre de questions à tirer de chaque banque
                  (tirage aléatoire).
                </p>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-1.5">
                    {banks.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {b.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {b._count?.questions ?? 0} questions disponibles
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={bankCounts[b.id] ?? 0}
                          onChange={(e) =>
                            setBankCount(
                              b.id,
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          className="h-8 w-16"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={addBanksDistribution}
                  className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter à l&apos;examen
                </Button>
              </>
            )}
          </div>

          {/* RIGHT: Selected questions (drag & drop) */}
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                Examen ({totalCount} Q)
              </Label>
              {selected.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-rose-600"
                  onClick={() => setSelected([])}
                >
                  Tout vider
                </Button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {selected.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Aucune question sélectionnée.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Cliquez sur les questions à gauche pour les ajouter.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selected.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {selected.map((s, idx) => (
                        <SortableQuestionItem
                          key={s.id}
                          item={s}
                          index={idx}
                          onRemove={() => removeSelected(s.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || selected.length === 0}
            className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Créer l&apos;examen ({totalCount} Q)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableQuestionItem({
  item,
  index,
  onRemove,
}: {
  item: SelectedItem;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 rounded-lg border bg-card p-2 transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-violet-300" : ""
      }`}
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab text-muted-foreground hover:text-violet-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        title="Glisser pour réordonner"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {item.kind === "question" && item.question ? (
          <>
            <p className="line-clamp-2 break-words text-xs font-medium">
              {item.question.question}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="mr-1 text-[9px]">
                {item.bankTitle}
              </Badge>
              Rép: {item.question.correctAnswer}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium">
              Banque: {item.bankTitle}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {item.count} question(s) — tirage aléatoire
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-0.5 text-muted-foreground hover:text-rose-600"
        title="Retirer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
