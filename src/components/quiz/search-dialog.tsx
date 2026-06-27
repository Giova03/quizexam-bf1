"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  X,
  BookOpen,
  CheckCircle2,
  MessageSquare,
  User as UserIcon,
  ChevronRight,
} from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";
import { getColor } from "@/lib/types";

// ---------- Question result type (existing) ----------
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

// ---------- Bank result type ----------
interface BankResult {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  _count?: { questions: number };
}

// ---------- Forum result type ----------
interface ForumResult {
  id: string;
  title: string;
  content: string;
  category: string;
  repliesCount: number;
  author?: { id: string; name: string; role?: string };
}

// ---------- User result type ----------
interface UserResult {
  id: string;
  name: string;
  role: string;
}

type TabKey = "questions" | "banks" | "forum" | "users";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("questions");

  // Per-tab state
  const [questions, setQuestions] = useState<SearchResult[]>([]);
  const [banks, setBanks] = useState<BankResult[]>([]);
  const [forum, setForum] = useState<ForumResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);

  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  // Cached bank list — fetched once when the Banks tab is opened for the first
  // time, then filtered client-side. With ~7 banks, fetching all is cheaper
  // than hitting the DB on every keystroke.
  const [allBanks, setAllBanks] = useState<BankResult[] | null>(null);

  const openBank = useQuizStore((s) => s.openBank);
  const openForum = useQuizStore((s) => s.openForum);
  const openProfile = useQuizStore((s) => s.openProfile);

  // ---------- Search functions ----------
  const searchQuestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setQuestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.results ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAllBanks = useCallback(async () => {
    if (allBanks) return;
    try {
      const res = await fetch("/api/banks");
      if (res.ok) {
        const data = (await res.json()) as BankResult[];
        setAllBanks(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [allBanks]);

  const filterBanks = useCallback(
    (q: string) => {
      if (!allBanks) {
        setBanks([]);
        return;
      }
      if (q.trim().length < 2) {
        setBanks([]);
        return;
      }
      const needle = q.toLowerCase();
      setBanks(
        allBanks.filter(
          (b) =>
            b.title.toLowerCase().includes(needle) ||
            b.category.toLowerCase().includes(needle) ||
            b.description.toLowerCase().includes(needle)
        )
      );
    },
    [allBanks]
  );

  const searchForum = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setForum([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/forum/topics?q=${encodeURIComponent(q)}&pageSize=20`
      );
      if (res.ok) {
        const data = await res.json();
        setForum(data.items ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const searchUsers = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setUsers([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/users?search=${encodeURIComponent(q)}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ---------- Debounced dispatch ----------
  // All searches run inside a setTimeout (async) so we never call setState
  // synchronously in the effect body. The loading flag is toggled inside the
  // timer callback — the user sees the previous results briefly during the
  // 300ms debounce, then a spinner appears while the fetch is in flight.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Always run the active tab's search; lazily load banks if needed.
        if (tab === "banks" && !allBanks) {
          await loadAllBanks();
        }
        if (tab === "questions") await searchQuestions(query);
        else if (tab === "banks") filterBanks(query);
        else if (tab === "forum") await searchForum(query);
        else if (tab === "users") await searchUsers(query);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [
    query,
    tab,
    open,
    searchQuestions,
    filterBanks,
    searchForum,
    searchUsers,
    loadAllBanks,
    allBanks,
  ]);

  // ---------- Render helpers ----------
  const showEmptyState =
    query.trim().length < 2 ? (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <Search className="h-8 w-8 opacity-50" />
        <p className="text-sm">
          Tapez au moins 2 caractères pour rechercher
        </p>
      </div>
    ) : null;

  const showLoading = loading ? (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-4 py-3 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-emerald-600" />
            Recherche globale
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="border-b px-4 py-3 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher questions, banques, sujets, utilisateurs…"
              className="h-10 pl-9 pr-9"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Effacer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs + results */}
        <div className="flex min-h-0 flex-1 flex-col">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabKey)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="border-b px-4 sm:px-6">
              <TabsList className="h-auto bg-transparent p-0">
                <TabsTrigger
                  value="questions"
                  className="gap-1.5 data-[state=active]:bg-muted"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Questions
                </TabsTrigger>
                <TabsTrigger
                  value="banks"
                  className="gap-1.5 data-[state=active]:bg-muted"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Banques
                </TabsTrigger>
                <TabsTrigger
                  value="forum"
                  className="gap-1.5 data-[state=active]:bg-muted"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Forum
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="gap-1.5 data-[state=active]:bg-muted"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  Utilisateurs
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2 sm:p-4">
              {/* QUESTIONS TAB */}
              <TabsContent value="questions" className="mt-0">
                {showEmptyState}
                {showLoading}
                {!loading && query.trim().length >= 2 && questions.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Aucune question trouvée pour &quot;{query}&quot;
                  </div>
                )}
                {!loading && questions.length > 0 && (
                  <div className="space-y-2">
                    {questions.map((r) => (
                      <Card
                        key={r.id}
                        className="cursor-pointer p-3 transition-all hover:border-emerald-400 hover:shadow-sm sm:p-4"
                        onClick={() => setSelected(r)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 flex-1 text-sm font-medium">
                            {r.question}
                          </p>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                          >
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
              </TabsContent>

              {/* BANKS TAB */}
              <TabsContent value="banks" className="mt-0">
                {showEmptyState}
                {showLoading}
                {!loading &&
                  query.trim().length >= 2 &&
                  banks.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Aucune banque trouvée pour &quot;{query}&quot;
                    </div>
                  )}
                {!loading && banks.length > 0 && (
                  <div className="space-y-2">
                    {banks.map((b) => {
                      const color = getColor(b.color);
                      return (
                        <Card
                          key={b.id}
                          className="cursor-pointer p-3 transition-all hover:border-emerald-400 hover:shadow-sm sm:p-4"
                          onClick={() => {
                            openBank(b.id);
                            onOpenChange(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color.bgSoft} ${color.text}`}
                            >
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-1 text-sm font-semibold">
                                  {b.title}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px]"
                                >
                                  {b._count?.questions ?? 0} Q
                                </Badge>
                              </div>
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {b.description || b.category}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
                                Ouvrir la banque
                                <ChevronRight className="h-3 w-3" />
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* FORUM TAB */}
              <TabsContent value="forum" className="mt-0">
                {showEmptyState}
                {showLoading}
                {!loading &&
                  query.trim().length >= 2 &&
                  forum.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Aucun sujet trouvé pour &quot;{query}&quot;
                    </div>
                  )}
                {!loading && forum.length > 0 && (
                  <div className="space-y-2">
                    {forum.map((t) => (
                      <Card
                        key={t.id}
                        className="cursor-pointer p-3 transition-all hover:border-emerald-400 hover:shadow-sm sm:p-4"
                        onClick={() => {
                          openForum();
                          onOpenChange(false);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 flex-1 text-sm font-medium">
                            {t.title}
                          </p>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                          >
                            {t.category}
                          </Badge>
                        </div>
                        {t.content && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {t.content}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {t.repliesCount} réponse
                            {t.repliesCount > 1 ? "s" : ""}
                          </span>
                          {t.author && <span>· {t.author.name}</span>}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* USERS TAB */}
              <TabsContent value="users" className="mt-0">
                {showEmptyState}
                {showLoading}
                {!loading &&
                  query.trim().length >= 2 &&
                  users.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Aucun utilisateur trouvé pour &quot;{query}&quot;
                    </div>
                  )}
                {!loading && users.length > 0 && (
                  <div className="space-y-2">
                    {users.map((u) => {
                      const initials = u.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      const isAdmin = u.role === "ADMIN";
                      return (
                        <Card
                          key={u.id}
                          className="cursor-pointer p-3 transition-all hover:border-emerald-400 hover:shadow-sm sm:p-4"
                          onClick={() => {
                            openProfile(u.id);
                            onOpenChange(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback
                                className={
                                  isAdmin
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                }
                              >
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-medium">
                                {u.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isAdmin ? "Administrateur" : "Membre"}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Question detail dialog */}
        {selected && (
          <Dialog
            open={!!selected}
            onOpenChange={(o) => !o && setSelected(null)}
          >
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
                <Badge variant="outline">{selected.bank.title}</Badge>
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
