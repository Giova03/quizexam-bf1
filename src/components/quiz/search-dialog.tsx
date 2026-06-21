"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, BookOpen, CheckCircle2 } from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";

interface SearchResult {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  bank: {
    id: string;
    title: string;
    color: string;
    icon: string;
    category: string;
  };
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const openBank = useQuizStore((s) => s.openBank);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-4 py-3 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-emerald-600" />
            Recherche de questions
          </DialogTitle>
        </DialogHeader>

        <div className="border-b px-4 py-3 sm:px-6">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par mot-clé (ex: Burkina, droit, SVT...)"
            className="h-10"
          />
          {query && (
            <p className="mt-2 text-xs text-muted-foreground">
              {loading ? "Recherche..." : `${results.length} résultat(s)`}
            </p>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-4">
          {!query && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Search className="h-8 w-8 opacity-50" />
              <p className="text-sm">Tapez au moins 2 caractères pour rechercher</p>
            </div>
          )}

          {query && loading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          )}

          {query && !loading && results.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aucune question trouvée pour &quot;{query}&quot;
            </div>
          )}

          {query && !loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <Card
                  key={r.id}
                  className="cursor-pointer p-3 transition-all hover:border-emerald-400 hover:shadow-sm sm:p-4"
                  onClick={() => setSelected(r)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 flex-1 text-sm font-medium">
                      {r.question}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {r.bank.category}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span className="truncate">{r.bank.title}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Question detail dialog */}
        {selected && (
          <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="pr-8 text-base leading-snug">
                  {selected.question}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                {OPTION_LETTERS.map((letter) => {
                  const text =
                    letter === "A"
                      ? selected.optionA
                      : letter === "B"
                        ? selected.optionB
                        : letter === "C"
                          ? selected.optionC
                          : selected.optionD;
                  const isRight = selected.correctAnswer === letter;
                  return (
                    <div
                      key={letter}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                        isRight
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <span className="font-bold">{letter}.</span>
                      <span className="flex-1 break-words">{text}</span>
                      {isRight && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="font-semibold">Explication: </span>
                <span className="break-words">{selected.explanation}</span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <Badge variant="outline">
                  {selected.bank.title}
                </Badge>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    openBank(selected.bank.id);
                    onOpenChange(false);
                    setSelected(null);
                  }}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Ouvrir la banque
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
