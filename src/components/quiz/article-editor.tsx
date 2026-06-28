"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, Pencil, Loader2, Save } from "lucide-react";

// ---------- Types ----------

interface ArticleAuthor {
  id: string;
  name: string;
  role?: string;
}

interface ExistingArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  published: boolean;
  featuredImage: string | null;
  authorId: string;
  author: ArticleAuthor;
}

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "methodologie", label: "Méthodologie" },
  { value: "concours", label: "Concours" },
  { value: "culture-generale", label: "Culture générale" },
  { value: "psychotechnique", label: "Tests psychotechniques" },
  { value: "temoignage", label: "Témoignage" },
  { value: "actualite", label: "Actualité" },
];

// ---------- Component ----------

/**
 * Simple article editor (no rich text — just textarea-based).
 * Supports both create and edit modes (when `existing` is provided).
 * Has a "Preview" toggle that renders the content as it will appear on the
 * blog detail view.
 */
export function ArticleEditor({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing?: ExistingArticle | null;
}) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [published, setPublished] = useState(false);
  const [featuredImage, setFeaturedImage] = useState("");
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync form state whenever the dialog opens (and when `existing` changes).
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
      setCategory("general");
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
        isEditing ? `/api/articles/${existing!.id}` : "/api/articles",
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Modifier l'article" : "Nouvel article"}
          </DialogTitle>
          <DialogDescription>
            {existing
              ? "Apportez vos modifications puis enregistrez."
              : "Rédigez votre article. Vous pouvez le publier immédiatement ou l'enregistrer comme brouillon."}
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="art-title">Titre *</Label>
              <Input
                id="art-title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de l'article"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="art-cat">Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="art-cat">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="art-img">Image de couverture (URL)</Label>
                <Input
                  id="art-img"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="art-excerpt">Extrait (résumé court)</Label>
              <Textarea
                id="art-excerpt"
                value={excerpt}
                maxLength={300}
                rows={2}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Laissez vide pour générer automatiquement à partir du contenu."
              />
              <p className="text-[10px] text-muted-foreground">
                {excerpt.length}/300 caractères
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="art-content">Contenu *</Label>
              <Textarea
                id="art-content"
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
                id="art-published"
                checked={published}
                onCheckedChange={setPublished}
              />
              <div className="flex-1">
                <Label htmlFor="art-published" className="cursor-pointer">
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
                {CATEGORIES.find((c) => c.value === category)?.label ?? category}
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
