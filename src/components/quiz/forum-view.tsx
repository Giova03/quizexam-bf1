"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuizStore } from "@/lib/quiz-store";
import {
  MessageSquare,
  MessagesSquare,
  Plus,
  ArrowLeft,
  Send,
  Trash2,
  Award,
  Pin,
  Clock,
  Reply as ReplyIcon,
  Search,
  LogIn,
  BookOpen,
} from "lucide-react";

// ---------- Types ----------

interface ForumAuthor {
  id: string;
  name: string;
  role?: string;
}

interface ForumBank {
  id: string;
  title: string;
  color: string;
  icon: string;
}

interface ForumTopicListItem {
  id: string;
  title: string;
  content: string;
  category: string;
  bankId: string | null;
  bank: ForumBank | null;
  author: ForumAuthor;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
  lastActivity: { at: string; author: ForumAuthor };
  id: string;
  title: string;
  content: string;
  category: string;
  bankId: string | null;
  bank: ForumBank | null;
  authorId: string;
  author: ForumAuthor;
  createdAt: string;
  updatedAt: string;
  replies: ForumReply[];
}

interface ForumListResponse {
  items: ForumTopicListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BankOption {
  id: string;
  title: string;
  category: string;
}

// ---------- Constants ----------

const FORUM_CATEGORIES = [
  { value: "all", label: "Toutes les catégories" },
  { value: "general", label: "Général" },
  { value: "question", label: "Questions / Aide" },
  { value: "methode", label: "Méthodologie" },
  { value: "ressource", label: "Ressources" },
  { value: "experience", label: "Expérience concours" },
];

const CATEGORY_LABELS: Record<string, string> = {
  general: "Général",
  question: "Question",
  methode: "Méthodologie",
  ressource: "Ressource",
  experience: "Expérience",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  question: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  methode: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  ressource: "border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  experience: "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

// ---------- Component ----------

export function ForumView() {
  const { data: session } = useSession();
  const goHome = useQuizStore((s) => s.goHome);
  const openProfile = useQuizStore((s) => s.openProfile);

  const [topics, setTopics] = useState<ForumTopicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("all");
  const [bankId, setBankId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [banks, setBanks] = useState<BankOption[]>([]);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createCategory, setCreateCategory] = useState("general");
  const [createBankId, setCreateBankId] = useState<string>("none");
  const [creating, setCreating] = useState(false);

  // Debounce search input (300ms) so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load bank options for the filter dropdown + the create dialog.
  useEffect(() => {
    fetch("/api/banks")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setBanks(Array.isArray(d) ? d : []))
      .catch(() => setBanks([]));
  }, []);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        category,
        bankId: bankId === "all" ? "" : bankId,
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/forum/topics?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data: ForumListResponse = await res.json();
        setTopics(data.items);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } else {
        setTopics([]);
      }
    } catch (e) {
      console.error("Failed to load forum topics", e);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, bankId, debouncedSearch]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [category, bankId, debouncedSearch]);

  async function createTopic() {
    if (!createTitle.trim() || !createContent.trim()) {
      toast.error("Le titre et le contenu sont requis");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/forum/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          content: createContent.trim(),
          category: createCategory,
          bankId: createBankId === "none" ? null : createBankId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Sujet créé !");
        setCreateOpen(false);
        setCreateTitle("");
        setCreateContent("");
        setCreateCategory("general");
        setCreateBankId("none");
        // Open the new topic directly so the author sees it.
        setSelectedTopicId(data.id);
        loadTopics();
      } else {
        toast.error(data.error || "Échec de la création");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setCreating(false);
    }
  }

  function openTopic(id: string) {
    setSelectedTopicId(id);
  }

  function backToList() {
    setSelectedTopicId(null);
    loadTopics();
  }

  // ---------- Topic detail view ----------
  if (selectedTopicId) {
    return (
      <ForumTopicDetail
        topicId={selectedTopicId}
        onBack={backToList}
        onProfile={openProfile}
        currentUserId={
          (session?.user as { id?: string } | undefined)?.id ?? null
        }
        isAdmin={
          (session?.user as { role?: string } | undefined)?.role === "ADMIN"
        }
        isAuthenticated={!!session?.user}
      />
    );
  }

  // ---------- Topic list view ----------
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Button>

      {/* Header banner */}
      <Card className="overflow-hidden border-emerald-200 dark:border-emerald-800">
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <MessagesSquare className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">Forum par matière</h1>
              <p className="mt-1 text-sm text-white/90">
                Échangez sur les sujets, posez vos questions et partagez vos
                astuces de révision.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="border-white/30 bg-white/20 text-white">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  {total} sujet{total !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters + create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un sujet..."
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORUM_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {banks.length > 0 && (
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les matières</SelectItem>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          onClick={() => {
            if (!session?.user) {
              toast.error("Connectez-vous pour créer un sujet");
              return;
            }
            setCreateOpen(true);
          }}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nouveau sujet
        </Button>
      </div>

      {/* Topic list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucun sujet. Soyez le premier à lancer la discussion !
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {topics.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer p-4 transition-all hover:border-emerald-300 hover:shadow-md"
              onClick={() => openTopic(t.id)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-sm text-white">
                    {t.author.name?.charAt(0).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold leading-tight text-foreground hover:text-emerald-700">
                      {t.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.general
                      }
                    >
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </Badge>
                    {t.bank && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
                      >
                        <BookOpen className="h-3 w-3" />
                        {t.bank.title}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {t.content}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {t.author.name}
                      {t.author.role === "ADMIN" && (
                        <span className="ml-1 text-amber-600">· ADMIN</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelative(t.lastActivity.at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ReplyIcon className="h-3 w-3" />
                      {t.repliesCount} réponse{t.repliesCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Nouveau sujet de discussion
            </DialogTitle>
            <DialogDescription>
              Posez votre question ou démarrez une discussion. Les autres
              utilisateurs pourront répondre et vous marquerez la meilleure
              réponse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="topic-title">Titre</Label>
              <Input
                id="topic-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Ex: Comment réviser l'histoire du Burkina Faso ?"
                maxLength={200}
              />
              <p className="text-[11px] text-muted-foreground">
                {createTitle.length}/200
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="topic-category">Catégorie</Label>
                <Select
                  value={createCategory}
                  onValueChange={setCreateCategory}
                >
                  <SelectTrigger id="topic-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORUM_CATEGORIES.filter((c) => c.value !== "all").map(
                      (c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic-bank">Matière (optionnel)</Label>
                <Select value={createBankId} onValueChange={setCreateBankId}>
                  <SelectTrigger id="topic-bank">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune matière</SelectItem>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic-content">Contenu</Label>
              <Textarea
                id="topic-content"
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                placeholder="Décrivez votre question ou votre sujet en détail..."
                rows={6}
                maxLength={10000}
                className="resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                {createContent.length}/10000 · vous pouvez utiliser des
                sauts de ligne et des listes.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={createTopic}
              disabled={
                creating || !createTitle.trim() || !createContent.trim()
              }
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <Send className="h-4 w-4" />
              {creating ? "Création..." : "Publier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Topic detail sub-component ----------

function ForumTopicDetail({
  topicId,
  onBack,
  onProfile,
  currentUserId,
  isAdmin,
  isAuthenticated,
}: {
  topicId: string;
  onBack: () => void;
  onProfile: (userId: string) => void;
  currentUserId: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
}) {
  const [topic, setTopic] = useState<ForumTopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [deleteTopicOpen, setDeleteTopicOpen] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState(false);

  const loadTopic = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/topics/${topicId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setTopic(await res.json());
      } else if (res.status === 404) {
        toast.error("Sujet introuvable");
        onBack();
      } else {
        toast.error("Échec du chargement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [topicId, onBack]);

  useEffect(() => {
    loadTopic();
  }, [loadTopic]);

  async function submitReply() {
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour répondre");
      return;
    }
    if (!replyContent.trim()) {
      toast.error("Le contenu est requis");
      return;
    }
    setReplying(true);
    try {
      const res = await fetch(`/api/forum/topics/${topicId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplyContent("");
        toast.success("Réponse publiée");
        loadTopic();
      } else {
        toast.error(data.error || "Échec de la publication");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setReplying(false);
    }
  }

  async function markBestAnswer(replyId: string) {
    try {
      const res = await fetch(
        `/api/forum/topics/${topicId}/best-answer`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replyId }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("Meilleure réponse marquée");
        loadTopic();
      } else {
        toast.error(data.error || "Échec");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  }

  async function deleteTopic() {
    setDeletingTopic(true);
    try {
      const res = await fetch(`/api/forum/topics/${topicId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Sujet supprimé");
        onBack();
      } else {
        const data = await res.json();
        toast.error(data.error || "Échec de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setDeletingTopic(false);
      setDeleteTopicOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!topic) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Sujet introuvable.</p>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      </Card>
    );
  }

  const isAuthor = currentUserId === topic.authorId;
  const canDeleteTopic = isAuthor || isAdmin;
  const bestAnswer = topic.replies.find((r) => r.isBestAnswer);
  const otherReplies = topic.replies.filter((r) => !r.isBestAnswer);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Retour au forum
      </Button>

      {/* Topic header card */}
      <Card className="overflow-hidden border-emerald-200 dark:border-emerald-800">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 dark:from-emerald-950/40 dark:to-teal-950/40">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                CATEGORY_COLORS[topic.category] ?? CATEGORY_COLORS.general
              }
            >
              {CATEGORY_LABELS[topic.category] ?? topic.category}
            </Badge>
            {topic.bank && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
              >
                <BookOpen className="h-3 w-3" />
                {topic.bank.title}
              </Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight">
            {topic.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => onProfile(topic.author.id)}
              className="flex items-center gap-2 hover:underline"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs text-white">
                  {topic.author.name?.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{topic.author.name}</span>
              {topic.author.role === "ADMIN" && (
                <Badge
                  variant="outline"
                  className="border-amber-300 text-[9px] text-amber-700"
                >
                  ADMIN
                </Badge>
              )}
            </button>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(topic.createdAt)}
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {topic.content}
          </p>
          {canDeleteTopic && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                onClick={() => setDeleteTopicOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer le sujet
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Replies header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ReplyIcon className="h-5 w-5 text-emerald-600" />
          {topic.replies.length} réponse{topic.replies.length !== 1 ? "s" : ""}
        </h2>
        {bestAnswer && (
          <Badge className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Award className="h-3 w-3" />
            Meilleure réponse sélectionnée
          </Badge>
        )}
      </div>

      {/* Best answer (pinned) */}
      {bestAnswer && (
        <ReplyCard
          reply={bestAnswer}
          topic={topic}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onMarkBest={markBestAnswer}
          onProfile={onProfile}
          isBest
        />
      )}

      {/* Other replies */}
      {otherReplies.length > 0 ? (
        <div className="space-y-3">
          {otherReplies.map((r) => (
            <ReplyCard
              key={r.id}
              reply={r}
              topic={topic}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onMarkBest={markBestAnswer}
              onProfile={onProfile}
            />
          ))}
        </div>
      ) : (
        !bestAnswer && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm">
              Aucune réponse pour le moment. Soyez le premier à répondre !
            </p>
          </Card>
        )
      )}

      {/* Reply form */}
      {isAuthenticated ? (
        <Card className="p-4">
          <Label htmlFor="reply-content" className="mb-2 block">
            Votre réponse
          </Label>
          <Textarea
            id="reply-content"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Écrivez votre réponse..."
            rows={4}
            maxLength={5000}
            className="resize-y"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {replyContent.length}/5000
            </span>
            <Button
              onClick={submitReply}
              disabled={replying || !replyContent.trim()}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <Send className="h-4 w-4" />
              {replying ? "Envoi..." : "Répondre"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <LogIn className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour participer à la discussion.
          </p>
        </Card>
      )}

      {/* Delete topic confirmation */}
      <AlertDialog open={deleteTopicOpen} onOpenChange={setDeleteTopicOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce sujet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les réponses associées
              seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTopic}
              disabled={deletingTopic}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deletingTopic ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// ---------- Reply card ----------

function ReplyCard({
  reply,
  topic,
  currentUserId,
  isAdmin,
  onMarkBest,
  onProfile,
  isBest = false,
}: {
  reply: ForumReply;
  topic: ForumTopicDetail;
  currentUserId: string | null;
  isAdmin: boolean;
  onMarkBest: (replyId: string) => void;
  onProfile: (userId: string) => void;
  isBest?: boolean;
}) {
  // The topic author (or admin) can mark a reply as best answer — but only
  // if it's not their own reply (you can't mark your own answer as best).
  const isTopicAuthor = currentUserId === topic.authorId;
  const canMarkBest = (isTopicAuthor || isAdmin) && !reply.isBestAnswer;
  const isReplyAuthor = currentUserId === reply.authorId;

  return (
    <Card
      className={`p-4 ${
        isBest
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
          : ""
      }`}
    >
      {isBest && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Pin className="h-3.5 w-3.5" />
          Meilleure réponse
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => onProfile(reply.author.id)}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback
              className={`text-xs text-white ${
                reply.author.role === "ADMIN"
                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600"
              }`}
            >
              {reply.author.name?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold">{reply.author.name}</span>
          {reply.author.role === "ADMIN" && (
            <Badge
              variant="outline"
              className="border-amber-300 text-[9px] text-amber-700"
            >
              ADMIN
            </Badge>
          )}
        </button>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(reply.createdAt)}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {reply.content}
      </p>
      <div className="mt-3 flex items-center justify-end gap-2 border-t pt-2">
        {canMarkBest && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/40"
            onClick={() => onMarkBest(reply.id)}
            disabled={isReplyAuthor}
            title={
              isReplyAuthor
                ? "Vous ne pouvez pas marquer votre propre réponse"
                : "Marquer comme meilleure réponse"
            }
          >
            <Award className="h-3.5 w-3.5" />
            Meilleure réponse
          </Button>
        )}
        {isReplyAuthor && !isBest && (
          <span className="text-[11px] italic text-muted-foreground">
            Votre réponse
          </span>
        )}
      </div>
    </Card>
  );
}
