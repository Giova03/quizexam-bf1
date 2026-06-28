"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Languages,
  Loader2,
  Save,
  Sparkles,
  Copy,
  Check,
  Trash2,
  History,
} from "lucide-react";
import { toast } from "sonner";

/**
 * TranslationHelper — admin tool that translates the question text from
 * French into Moore, Dioula, or English using the /api/translate route
 * (powered by z-ai-web-dev-sdk on the server).
 *
 * Features:
 *   - Dropdown for target language (Moore, Dioula, English)
 *   - "Traduire" button calls the API
 *   - Editable result field (admin can refine the AI translation)
 *   - "Enregistrer" button stores the translation in localStorage under
 *     the key `question-translations` as a map of { [originalText]: { lang, translated } }
 *   - "Historique" panel showing previously saved translations
 *
 * The component is designed to be embedded inside the admin QuestionEditor
 * (it has no Dialog wrapper of its own — the parent already provides one).
 */

type TargetLang = "moore" | "dioula" | "en";

interface LangOption {
  value: TargetLang;
  label: string;
  flag: string;
}

const LANG_OPTIONS: LangOption[] = [
  { value: "moore", label: "Mooré", flag: "🇧🇫" },
  { value: "dioula", label: "Dioula", flag: "🇧🇫" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

const STORAGE_KEY = "question-translations";

interface SavedTranslation {
  original: string;
  targetLang: TargetLang;
  translated: string;
  savedAt: string;
}

function loadHistory(): SavedTranslation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedTranslation[];
  } catch {
    return [];
  }
}

function saveHistory(items: SavedTranslation[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep the most recent 50 entries to avoid bloating localStorage.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, 50))
    );
  } catch {
    // ignore (privacy mode / quota)
  }
}

export function TranslationHelper({
  originalText,
  explanation,
  onApplyTranslation,
}: {
  originalText: string;
  explanation?: string;
  onApplyTranslation?: (translated: string) => void;
}) {
  const [targetLang, setTargetLang] = useState<TargetLang>("moore");
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SavedTranslation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Reset the translated field whenever the source text or target language
  // changes — the admin should re-run "Traduire" to get a fresh result.
  useEffect(() => {
    setTranslated("");
    setSaved(false);
  }, [originalText, targetLang]);

  async function handleTranslate() {
    const source = originalText.trim();
    if (!source) {
      toast.error("Aucun texte à traduire — remplissez d'abord la question.");
      return;
    }
    setLoading(true);
    setTranslated("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source, targetLang }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.translated === "string") {
        setTranslated(data.translated);
        toast.success("Traduction générée ✓");
      } else {
        toast.error(data.error ?? "Échec de la traduction");
      }
    } catch (e) {
      console.error("translate error", e);
      toast.error("Erreur réseau pendant la traduction");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!translated.trim()) {
      toast.error("Aucune traduction à enregistrer");
      return;
    }
    const entry: SavedTranslation = {
      original: originalText.trim(),
      targetLang,
      translated: translated.trim(),
      savedAt: new Date().toISOString(),
    };
    const next = [entry, ...history.filter((h) => !(h.original === entry.original && h.targetLang === entry.targetLang))];
    setHistory(next);
    saveHistory(next);
    setSaved(true);
    toast.success("Traduction enregistrée (localStorage) ✓");
  }

  function handleCopy() {
    if (!translated.trim()) return;
    try {
      void navigator.clipboard.writeText(translated.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Traduction copiée dans le presse-papier");
    } catch {
      toast.error("Impossible de copier");
    }
  }

  function handleApply() {
    if (!translated.trim()) {
      toast.error("Aucune traduction à appliquer");
      return;
    }
    onApplyTranslation?.(translated.trim());
  }

  function handleClearHistory() {
    if (!confirm("Effacer toutes les traductions sauvegardées localement ?")) return;
    setHistory([]);
    saveHistory([]);
    toast.success("Historique effacé");
  }

  const sourceText = originalText.trim() || "(aucun texte source)";

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-xs font-semibold">
          <Languages className="h-3.5 w-3.5 text-sky-600" />
          Langue cible
        </Label>
        <Select value={targetLang} onValueChange={(v) => setTargetLang(v as TargetLang)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANG_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                <span className="mr-1.5">{opt.flag}</span>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Source preview (read-only) */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Texte source (Français)
        </p>
        <div className="rounded-md border bg-background p-2 text-xs leading-relaxed">
          {sourceText}
        </div>
        {explanation && explanation.trim() && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Astuce : pour traduire aussi l&apos;explication, copiez-la dans le champ
            source de la question puis relancez la traduction.
          </p>
        )}
      </div>

      {/* Action row */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleTranslate}
          disabled={loading || !originalText.trim()}
          className="gap-1.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white hover:opacity-90"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Traduire
        </Button>
        {translated && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copier
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={saved}
              className="gap-1.5"
            >
              {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Enregistré" : "Enregistrer"}
            </Button>
            {onApplyTranslation && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleApply}
                className="gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/30"
              >
                Appliquer à la question
              </Button>
            )}
          </>
        )}
      </div>

      {/* Editable result */}
      {translated && (
        <div>
          <Label htmlFor="translation-result" className="text-xs font-semibold">
            Traduction (éditable)
          </Label>
          <Textarea
            id="translation-result"
            value={translated}
            onChange={(e) => {
              setTranslated(e.target.value);
              setSaved(false);
            }}
            rows={4}
            className="mt-1 resize-none text-sm"
            placeholder="Modifiez la traduction si nécessaire…"
          />
        </div>
      )}

      {/* History toggle */}
      <div className="border-t pt-2">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Historique local ({history.length})
          </span>
          <span>{showHistory ? "Masquer ▲" : "Afficher ▼"}</span>
        </button>
        {showHistory && (
          <div className="mt-2 space-y-2">
            {history.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Aucune traduction enregistrée localement pour le moment.
              </p>
            ) : (
              <>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {history.map((h, i) => {
                    const langLabel =
                      LANG_OPTIONS.find((l) => l.value === h.targetLang)?.label ??
                      h.targetLang;
                    return (
                      <div
                        key={`${i}-${h.savedAt}`}
                        className="rounded-md border bg-background p-2 text-[11px]"
                      >
                        <div className="mb-0.5 flex items-center justify-between">
                          <span className="font-semibold text-sky-700 dark:text-sky-300">
                            → {langLabel}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(h.savedAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-muted-foreground">
                          <span className="font-medium">Source :</span> {h.original}
                        </p>
                        <p className="mt-0.5 line-clamp-3">
                          <span className="font-medium">Traduction :</span> {h.translated}
                        </p>
                        <div className="mt-1 flex gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              setTargetLang(h.targetLang);
                              setTranslated(h.translated);
                              setSaved(false);
                            }}
                          >
                            Recharger
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleClearHistory}
                  className="gap-1.5 text-[10px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3 w-3" />
                  Tout effacer
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
