"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  ImageIcon,
  Music,
  Upload,
  Loader2,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import type { BankWithCount, Question } from "./types";
import { TranslationHelper } from "@/components/quiz/translation-helper";

/**
 * BankQuestionsDialog — modal listing all questions in a bank, with search,
 * edit, delete, and "add QCM" actions. Opens QuestionEditor for create/edit.
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

  // Filter questions by search
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

        {/* Search + Add button */}
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
                      <div className="flex items-start justify-between gap-2">
                        <p className="break-words text-sm font-medium">{q.question}</p>
                        <div className="flex shrink-0 items-center gap-1">
                          {q.imageUrl && (
                            <span
                              title="Image attachée"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
                            >
                              <ImageIcon className="h-3 w-3" />
                            </span>
                          )}
                          {q.audioUrl && (
                            <span
                              title="Audio attaché"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"
                            >
                              <Music className="h-3 w-3" />
                            </span>
                          )}
                          {q.difficulty && (
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                q.difficulty === "easy"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                  : q.difficulty === "hard"
                                    ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                              }`}
                            >
                              {q.difficulty === "easy" ? "Facile" : q.difficulty === "hard" ? "Difficile" : "Moyen"}
                            </span>
                          )}
                        </div>
                      </div>
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
                    {/* Always visible action buttons */}
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

        {/* Footer with count and close */}
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
 * QuestionEditor — modal form for creating or editing a single QCM.
 * Click a letter button to set the correct answer; difficulty selector;
 * live preview; client-side validation (4 distinct options + non-empty fields).
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
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    (question?.difficulty as "easy" | "medium" | "hard") ?? "medium"
  );
  // Optional media URLs (added in F4). null = no media attached.
  const [imageUrl, setImageUrl] = useState<string | null>(question?.imageUrl ?? null);
  const [audioUrl, setAudioUrl] = useState<string | null>(question?.audioUrl ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  // Validation
  const isValid = q.trim() && a.trim() && b.trim() && c.trim() && d.trim() && expl.trim();
  const hasDuplicateOptions = new Set([a.trim().toLowerCase(), b.trim().toLowerCase(), c.trim().toLowerCase(), d.trim().toLowerCase()]).size < 4;

  /**
   * Upload an image or audio file to /api/upload-media and return the
   * resulting URL. Sets the appropriate uploading flag during the request.
   * Rejects files larger than 5MB client-side as a fast-fail (the server
   * re-validates).
   */
  const uploadMedia = useCallback(
    async (file: File, kind: "image" | "audio"): Promise<string | null> => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Le fichier dépasse 5 Mo.");
        return null;
      }
      const setter = kind === "image" ? setUploadingImage : setUploadingAudio;
      setter(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload-media", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data.url === "string") {
          toast.success(
            kind === "image" ? "Image téléchargée ✓" : "Audio téléchargé ✓"
          );
          return data.url as string;
        }
        toast.error(data.error ?? "Échec du téléversement");
        return null;
      } catch (e) {
        console.error("uploadMedia error", e);
        toast.error("Erreur réseau pendant le téléversement");
        return null;
      } finally {
        setter(false);
      }
    },
    []
  );

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void uploadMedia(f, "image").then((url) => url && setImageUrl(url));
    // Reset the input value so picking the same file twice fires onChange.
    e.target.value = "";
  }
  function handleAudioPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void uploadMedia(f, "audio").then((url) => url && setAudioUrl(url));
    e.target.value = "";
  }

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
        imageUrl: imageUrl ?? "",
        audioUrl: audioUrl ?? "",
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
          {/* Question */}
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

          {/* Options */}
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

          {/* Validation warnings */}
          {hasDuplicateOptions && (a || b || c || d) && (
            <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              ⚠️ Les 4 options doivent être différentes les unes des autres
            </div>
          )}

          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            ✓ Réponse correcte : <strong>{correct}</strong>
          </div>

          {/* Difficulty selector */}
          <div>
            <Label className="text-sm font-semibold">Niveau de difficulté</Label>
            <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
              Utilisé par le filtre de difficulté dans la vue banque et le
              démarrage de quiz.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "easy", label: "Facile", cls: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
                { value: "medium", label: "Moyen", cls: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
                { value: "hard", label: "Difficile", cls: "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all hover:scale-[1.02] ${
                    difficulty === opt.value
                      ? `${opt.cls} ring-2 ring-offset-1`
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                  aria-pressed={difficulty === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation */}
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

          {/* Media (image + audio) — added in F4 */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-violet-600" />
              Média (optionnel)
            </div>
            <p className="text-xs text-muted-foreground">
              Ajoutez une image ou un audio à la question. L&apos;image s&apos;affichera
              au-dessus de la question, l&apos;audio en dessous. Taille max : 5 Mo.
            </p>

            {/* Image field */}
            <div className="space-y-1.5">
              <Label htmlFor="q-image-url" className="text-xs">URL de l&apos;image</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="q-image-url"
                  value={imageUrl ?? ""}
                  onChange={(e) => setImageUrl(e.target.value.trim() || null)}
                  placeholder="/uploads/image-...png (ou URL externe)"
                  className="flex-1"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleImagePick}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="gap-1.5"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Téléverser
                </Button>
                {imageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setImageUrl(null)}
                    className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                  >
                    <X className="h-3.5 w-3.5" />
                    Retirer
                  </Button>
                )}
              </div>
              {imageUrl && (
                <div className="overflow-hidden rounded-lg border bg-background">
                  { }
                  <img
                    src={imageUrl}
                    alt="Aperçu de l'image attachée"
                    className="max-h-48 w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Audio field */}
            <div className="space-y-1.5">
              <Label htmlFor="q-audio-url" className="text-xs">URL de l&apos;audio</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="q-audio-url"
                  value={audioUrl ?? ""}
                  onChange={(e) => setAudioUrl(e.target.value.trim() || null)}
                  placeholder="/uploads/audio-...mp3 (ou URL externe)"
                  className="flex-1"
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/aac,audio/mp4"
                  onChange={handleAudioPick}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={uploadingAudio}
                  className="gap-1.5"
                >
                  {uploadingAudio ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Téléverser
                </Button>
                {audioUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setAudioUrl(null)}
                    className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                  >
                    <X className="h-3.5 w-3.5" />
                    Retirer
                  </Button>
                )}
              </div>
              {audioUrl && (
                <audio controls src={audioUrl} className="w-full">
                  Votre navigateur ne prend pas en charge l&apos;élément audio.
                </audio>
              )}
            </div>
          </div>

          {/* Translation helper (optional) — added in F4 */}
          <div className="rounded-lg border border-dashed p-3">
            <button
              type="button"
              onClick={() => setShowTranslation((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-sky-600" />
                Aide à la traduction (optionnel)
              </span>
              <span className="text-xs text-muted-foreground">
                {showTranslation ? "Masquer ▲" : "Afficher ▼"}
              </span>
            </button>
            {showTranslation && (
              <div className="mt-3">
                <TranslationHelper
                  originalText={q}
                  explanation={expl}
                  onApplyTranslation={(translated) => {
                    // Append the translation to the explanation so the
                    // admin can review & save it as part of the question.
                    setExpl((prev) =>
                      prev.trim().endsWith(translated.trim())
                        ? prev
                        : `${prev.trim()}\n\n— Traduction —\n${translated}`.trim()
                    );
                    toast.success("Traduction ajoutée à l'explication ✓");
                  }}
                />
              </div>
            )}
          </div>

          {/* Preview */}
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
