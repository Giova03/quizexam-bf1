"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  BookOpen,
  Plus,
  ArrowLeft,
  Trash2,
  Pencil,
  Clock,
  Loader2,
  Tag,
  LogIn,
  Save,
  Eye,
} from "lucide-react";

// ---------- Types ----------

interface ArticleAuthor {
  id: string;
  name: string;
  role?: string;
}

interface WikiArticle {
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

// ---------- Constants ----------

const WIKI_CATEGORIES = [
  { value: "all", label: "Toutes les catégories" },
  { value: "wiki-general", label: "Général" },
  { value: "wiki-methodologie", label: "Méthodologie" },
  { value: "wiki-culture", label: "Culture générale" },
  { value: "wiki-concours", label: "Concours" },
  { value: "wiki-psychotechnique", label: "Tests psychotechniques" },
  { value: "wiki-temoignage", label: "Témoignage" },
  { value: "wiki-actualite", label: "Actualité" },
];

const EDITOR_CATEGORIES = WIKI_CATEGORIES.filter((c) => c.value !== "all");

function categoryLabel(slug: string): string {
  return WIKI_CATEGORIES.find((c) => c.value === slug)?.label ?? slug;
}

// ---------- Component ----------

export function WikiView() {
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WikiArticle | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<WikiArticle | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (category && category !== "all") params.set("category", category);
      if (currentUserId) params.set("mine", "1");
      const res = await fetch(`/api/wiki?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data.items) ? data.items : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, currentUserId]);

  useEffect(() => {
    if (status === "authenticated") load();
    else {
      // Public access — load without ?mine=1.
      setLoading(true);
      fetch(`/api/wiki?limit=100${category !== "all" ? `&category=${category}` : ""}`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setArticles(Array.isArray(d.items) ? d.items : []))
        .catch(() => setArticles([]))
        .finally(() => setLoading(false));
    }
  }, [status, category, currentUserId, load]);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    setDetail(null);
    try {
      // Use the existing /api/articles/[id] endpoint for fetching a single
      // article — wiki articles are stored in the Article table.
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

  // --- Detail view ----------------------------------------------------
  if (selectedId) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au wiki
        </Button>

        {loadingDetail || !detail ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <article className="space-y-6">
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

            <Card className="p-6">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-foreground dark:prose-invert">
                {detail.content}
              </div>
            </Card>

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

        <WikiEditor
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
                Cette action est irréversible. L&apos;article sera
                définitivement supprimé du wiki.
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
      </div>
    );
  }

  // --- List view ------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            Wiki collaboratif
          </h1>
          <p className="text-sm text-muted-foreground">
            Articles, fiches de révision et ressources créées par la
            communauté.
          </p>
        </div>
        {status === "authenticated" && (
          <Button
            onClick={() => {
              setEditingArticle(null);
              setEditorOpen(true);
            }}
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            <Plus className="h-4 w-4" />
            Nouvel article
          </Button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Catégorie :
        </span>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WIKI_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Articles grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : articles.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Aucun article dans cette catégorie</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {status === "authenticated"
              ? "Soyez le premier à contribuer au wiki !"
              : "Connectez-vous pour contribuer au wiki."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {articles.map((a) => (
            <Card
              key={a.id}
              className="group cursor-pointer p-4 transition-all hover:shadow-md"
              onClick={() => openDetail(a.id)}
            >
              <div className="flex items-start gap-3">
                {a.featuredImage ? (
                  <img
                    src={a.featuredImage}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/40">
                    <BookOpen className="h-6 w-6 text-emerald-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 font-semibold group-hover:text-emerald-600">
                      {a.title}
                    </h3>
                    {!a.published && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-300 text-[10px] text-amber-700 dark:border-amber-700 dark:text-amber-300"
                      >
                        Brouillon
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {a.excerpt}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">
                      {categoryLabel(a.category)}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="bg-emerald-100 text-[8px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {a.author.name?.charAt(0).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      {a.author.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(a.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Auth prompt for unauthenticated users */}
      {status !== "authenticated" && (
        <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <LogIn className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour créer et modifier des articles du wiki.
          </p>
        </Card>
      )}

      <WikiEditor
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
    </div>
  );
}

// ---------- Inline wiki editor (Dialog) ----------

function WikiEditor({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing?: WikiArticle | null;
}) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("wiki-general");
  const [published, setPublished] = useState(false);
  const [featuredImage, setFeaturedImage] = useState("");
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title);
      setExcerpt(existing.excerpt);
      setContent(existing.content);
      setCategory(existing.category);
      setPublished(existing.published);
      setFeaturedImage(existing.featuredImage ?? "");
    } else {
      setTitle("");
      setExcerpt("");
      setContent("");
      setCategory("wiki-general");
      setPublished(false);
      setFeaturedImage("");
    }
    setPreview(false);
  }, [open, existing]);

  async function submit() {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!content.trim()) {
      toast.error("Le contenu est requis");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || content.trim().slice(0, 180),
        category,
        published,
        featuredImage: featuredImage.trim() || null,
      };
      const isEditing = !!existing;
      const res = await fetch(
        isEditing ? `/api/articles/${existing!.id}` : "/api/wiki",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Échec de l'enregistrement");
        return;
      }
      toast.success(
        isEditing
          ? "Article mis à jour"
          : published
            ? "Article publié"
            : "Brouillon enregistré"
      );
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Modifier l'article wiki" : "Nouvel article wiki"}
          </DialogTitle>
          <DialogDescription>
            {existing
              ? "Apportez vos modifications puis enregistrez."
              : "Contribuez au wiki en partageant vos connaissances."}
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wiki-title">Titre *</Label>
              <Input
                id="wiki-title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de l'article"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wiki-cat">Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="wiki-cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDITOR_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wiki-img">Image de couverture (URL)</Label>
                <Input
                  id="wiki-img"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiki-excerpt">Extrait (résumé court)</Label>
              <Textarea
                id="wiki-excerpt"
                value={excerpt}
                maxLength={300}
                rows={2}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Laissez vide pour générer automatiquement."
              />
              <p className="text-[10px] text-muted-foreground">
                {excerpt.length}/300 caractères
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiki-content">Contenu *</Label>
              <Textarea
                id="wiki-content"
                value={content}
                rows={12}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez votre article ici. Les sauts de ligne sont préservés à l'affichage."
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                {content.length} caractères
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="wiki-published"
                checked={published}
                onCheckedChange={setPublished}
              />
              <div className="flex-1">
                <Label htmlFor="wiki-published" className="cursor-pointer">
                  Publier immédiatement
                </Label>
                <p className="text-xs text-muted-foreground">
                  {published
                    ? "L'article sera visible par tous les utilisateurs."
                    : "L'article sera enregistré comme brouillon (visible par vous seul)."}
                </p>
              </div>
              {published ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Publié
                </Badge>
              ) : (
                <Badge variant="outline">Brouillon</Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              {featuredImage && (
                <img
                  src={featuredImage}
                  alt=""
                  className="mb-3 h-40 w-full rounded-md object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <Badge variant="secondary" className="mb-2">
                {categoryLabel(category)}
              </Badge>
              <h2 className="text-xl font-bold">
                {title || "Titre de l'article"}
              </h2>
              {excerpt && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {excerpt}
                </p>
              )}
              <div className="mt-4 whitespace-pre-wrap break-words text-sm">
                {content || "Le contenu de l'article apparaîtra ici."}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? (
              <>
                <Pencil className="h-4 w-4" />
                Éditer
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Aperçu
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || !title.trim() || !content.trim()}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {existing ? "Enregistrer" : published ? "Publier" : "Enregistrer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
