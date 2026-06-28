"use client";

import { useEffect, useState, useCallback } from "react";
<<<<<<< Updated upstream
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Newspaper,
  Plus,
  ArrowLeft,
  Trash2,
  Pencil,
  Clock,
  Loader2,
  Tag,
} from "lucide-react";
import { ArticleEditor } from "./article-editor";

// ---------- Types ----------

interface ArticleAuthor {
  id: string;
  name: string;
  role?: string;
}

interface ArticleListItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  published: boolean;
  featuredImage: string | null;
  authorId: string;
  author: ArticleAuthor;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "all", label: "Toutes les catégories" },
  { value: "general", label: "Général" },
  { value: "methodologie", label: "Méthodologie" },
  { value: "concours", label: "Concours" },
  { value: "culture-generale", label: "Culture générale" },
  { value: "psychotechnique", label: "Tests psychotechniques" },
  { value: "temoignage", label: "Témoignage" },
  { value: "actualite", label: "Actualité" },
];

function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.value === slug)?.label ?? slug;
}

// ---------- Component ----------

export function BlogView() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ArticleListItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleListItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
=======
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Newspaper,
  ArrowLeft,
  PenLine,
  Eye,
  CalendarDays,
  Tag,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { ArticleEditor } from "./article-editor";

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string;
  coverUrl: string;
  status: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string } | null;
}

export function BlogView() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ArticleItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
>>>>>>> Stashed changes

  const load = useCallback(async () => {
    setLoading(true);
    try {
<<<<<<< Updated upstream
      const params = new URLSearchParams({ limit: "50" });
      if (category && category !== "all") params.set("category", category);
      // Always include the current user's own drafts so they can edit them.
      if (currentUserId) params.set("mine", "1");
      const res = await fetch(`/api/articles?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data.items) ? data.items : []);
=======
      const res = await fetch("/api/articles");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? (data as ArticleItem[]) : [];
        setArticles(list);
        // Collect tags
        const tags = new Set<string>();
        for (const a of list) {
          for (const t of (a.tags || "").split(",").map((s) => s.trim()).filter(Boolean)) {
            tags.add(t);
          }
        }
        setAvailableTags(Array.from(tags).sort());
>>>>>>> Stashed changes
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
<<<<<<< Updated upstream
  }, [category, currentUserId]);
=======
  }, []);
>>>>>>> Stashed changes

  useEffect(() => {
    load();
  }, [load]);

<<<<<<< Updated upstream
  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/articles/${id}`, { cache: "no-store" });
      if (res.ok) {
        setDetail(await res.json());
      } else {
        toast.error("Article introuvable");
        setSelectedId(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/articles/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Suppression impossible");
        return;
      }
      toast.success("Article supprimé");
      if (selectedId === deleteId) {
        setSelectedId(null);
        setDetail(null);
      }
      setDeleteId(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  // ---------- Detail view ----------
  if (selectedId) {
=======
  const filtered = tagFilter
    ? articles.filter((a) =>
        (a.tags || "")
          .split(",")
          .map((s) => s.trim())
          .includes(tagFilter)
      )
    : articles;

  // === Editor mode ===
  if (editing) {
    return (
      <ArticleEditor
        article={selected}
        onClose={() => {
          setEditing(false);
          setSelected(null);
        }}
        onSaved={async () => {
          setEditing(false);
          setSelected(null);
          await load();
        }}
      />
    );
  }

  // === Detail mode ===
  if (selected) {
>>>>>>> Stashed changes
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
<<<<<<< Updated upstream
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
          }}
=======
          onClick={() => setSelected(null)}
>>>>>>> Stashed changes
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au blog
        </Button>
<<<<<<< Updated upstream

        {loadingDetail || !detail ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <article className="space-y-6">
            {/* Header */}
            <Card className="overflow-hidden p-0">
              {detail.featuredImage && (
                <img
                  src={detail.featuredImage}
                  alt=""
                  className="h-48 w-full object-cover sm:h-64"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="space-y-3 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {categoryLabel(detail.category)}
                  </Badge>
                  {!detail.published && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                    >
                      Brouillon
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  {detail.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-emerald-100 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {detail.author.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    {detail.author.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(detail.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Card>

            {/* Content */}
            <Card className="p-6">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-foreground dark:prose-invert">
                {detail.content}
              </div>
            </Card>

            {/* Owner/admin actions */}
            {(detail.authorId === currentUserId || isAdmin) && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEditingArticle(detail);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDeleteId(detail.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            )}
          </article>
        )}

        {/* Editor (edit mode) */}
        <ArticleEditor
          open={editorOpen}
          onOpenChange={(o) => {
            setEditorOpen(o);
            if (!o) {
              setEditingArticle(null);
              if (selectedId) openDetail(selectedId);
              load();
            }
          }}
          existing={editingArticle}
        />

        <AlertDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
=======
        <article className="space-y-4">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight">{selected.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {selected.author && (
                <span className="font-medium text-foreground">
                  Par {selected.author.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(selected.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {selected.views} vues
              </span>
            </div>
            {selected.tags && (
              <div className="flex flex-wrap gap-1.5">
                {selected.tags
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      <Tag className="mr-0.5 h-2.5 w-2.5" />
                      {t}
                    </Badge>
                  ))}
              </div>
            )}
          </header>
          {selected.coverUrl && (
            <img
              src={selected.coverUrl}
              alt=""
              className="h-64 w-full rounded-xl object-cover"
            />
          )}
          {selected.excerpt && (
            <p className="border-l-4 border-emerald-500 bg-emerald-50 px-4 py-2 text-sm italic text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              {selected.excerpt}
            </p>
          )}
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {selected.content}
          </div>
        </article>
        <Button onClick={() => setEditing(true)} variant="outline" className="gap-1.5">
          <PenLine className="h-4 w-4" />
          Modifier cet article
        </Button>
>>>>>>> Stashed changes
      </div>
    );
  }

<<<<<<< Updated upstream
  // ---------- List view ----------
=======
  // === List mode ===
>>>>>>> Stashed changes
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
<<<<<<< Updated upstream
            <Newspaper className="h-6 w-6 text-emerald-600" />
            Blog
          </h1>
          <p className="text-muted-foreground">
            Conseils, méthodologie et actualités autour des concours
          </p>
        </div>
        {currentUserId && (
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => {
              setEditingArticle(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {isAdmin ? "Nouvel article" : "Proposer un article"}
          </Button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {category !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setCategory("all")}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucun article pour le moment. Soyez le premier à publier !
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {articles.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer overflow-hidden p-0 transition-all hover:border-emerald-300 hover:shadow-md"
              onClick={() => openDetail(a.id)}
            >
              {a.featuredImage && (
                <img
                  src={a.featuredImage}
                  alt=""
                  className="h-32 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {categoryLabel(a.category)}
                  </Badge>
                  {!a.published && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-[10px] text-amber-700 dark:border-amber-700 dark:text-amber-300"
                    >
                      Brouillon
                    </Badge>
                  )}
                </div>
                <h3 className="line-clamp-2 font-semibold leading-tight">
                  {a.title}
                </h3>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {a.excerpt}
                </p>
                <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                  <span className="truncate">par {a.author.name}</span>
                  <span>
                    {new Date(a.createdAt).toLocaleDateString("fr-FR")}
=======
            <Newspaper className="h-6 w-6 text-amber-600" />
            Blog & Articles
          </h1>
          <p className="text-muted-foreground">
            Astuces, méthodes de révision, actualités des concours.
          </p>
        </div>
        <Button
          onClick={() => setEditing(true)}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
        >
          <PenLine className="h-4 w-4" />
          Écrire un article
        </Button>
      </div>

      {availableTags.length > 0 && (
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filtrer par tag:
            </span>
            <button
              onClick={() => setTagFilter("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !tagFilter
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Tous
            </button>
            {availableTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  tagFilter === t
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucun article pour l&apos;instant. Soyez le premier à écrire !
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Card
              key={a.id}
              className="group flex cursor-pointer flex-col overflow-hidden transition-all hover:border-amber-300 hover:shadow-md"
              onClick={() => setSelected(a)}
            >
              {a.coverUrl ? (
                <img
                  src={a.coverUrl}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-950/40 dark:to-orange-950/40">
                  <Newspaper className="h-10 w-10 text-amber-500/50" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-semibold leading-tight">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {a.excerpt}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3 text-[10px] text-muted-foreground">
                  <span>{new Date(a.createdAt).toLocaleDateString("fr-FR")}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {a.views}
>>>>>>> Stashed changes
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
<<<<<<< Updated upstream

      <ArticleEditor
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) {
            setEditingArticle(null);
            load();
          }
        }}
        existing={editingArticle}
      />
=======
>>>>>>> Stashed changes
    </div>
  );
}
