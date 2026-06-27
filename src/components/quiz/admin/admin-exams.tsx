"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  GraduationCap,
  Plus,
  Trash2,
  Clock,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

/**
 * ExamsManager — "Examens" tab. Lists existing exams with delete action.
 * The "Nouvel examen" button triggers `onNew()` which the parent uses to
 * open NewExamDialog.
 */
export function ExamsManager({ onNew }: { onNew: () => void }) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer l'examen "${title}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/exams?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Examen supprimé");
        load();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (e) {
      toast.error("Erreur");
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-4 w-4 text-violet-600" />
            Examens blancs ({exams.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Créez et gérez les examens blancs disponibles pour les visiteurs
          </p>
        </div>
        <Button onClick={onNew} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
          <Plus className="h-4 w-4" />
          Nouvel examen
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {exams.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            Aucun examen pour le moment. Cliquez sur &quot;Nouvel examen&quot; pour en créer un.
          </Card>
        )}
        {exams.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {e.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    <Clock className="mr-1 h-3 w-3" />
                    {e.durationMin} min
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {e._count?.examQuestions ?? 0} questions
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => handleDelete(e.id, e.title)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * NewExamDialog — modal form for creating a new exam.
 * Selects how many questions to pull from each bank (distributions array).
 */
export function NewExamDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/banks")
        .then((r) => r.json())
        .then((d) => setBanks(Array.isArray(d) ? d : []))
        .catch(() => setBanks([]));
    }
  }, [open]);

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Titre requis");
      return;
    }
    const distributions = Object.entries(selectedBanks)
      .filter(([_, count]) => count > 0)
      .map(([bankId, count]) => ({ bankId, count }));
    if (distributions.length === 0) {
      toast.error("Sélectionnez au moins une banque");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          durationMin: duration,
          distributions,
        }),
      });
      if (res.ok) {
        toast.success("Examen créé");
        setTitle("");
        setDescription("");
        setDuration(60);
        setSelectedBanks({});
        onCreated();
        onOpenChange(false);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erreur");
      }
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer un nouvel examen blanc</DialogTitle>
          <DialogDescription>
            Sélectionnez les banques et le nombre de questions à tirer de chacune
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exam-title">Titre *</Label>
            <Input
              id="exam-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Examen Blanc - Concours Administratif 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-desc">Description</Label>
            <Textarea
              id="exam-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'examen..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-duration">Durée (minutes)</Label>
            <Input
              id="exam-duration"
              type="number"
              min={10}
              max={300}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
            />
          </div>

          <div className="space-y-2">
            <Label>Banques de questions</Label>
            <p className="text-xs text-muted-foreground">
              Indiquez le nombre de questions à tirer de chaque banque (0 = ignorer)
            </p>
            <div className="max-h-[300px] space-y-1.5 overflow-y-auto rounded-lg border p-2">
              {banks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {b._count?.questions ?? 0} questions disponibles
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    defaultValue={0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setSelectedBanks((prev) => ({
                        ...prev,
                        [b.id]: v,
                      }));
                    }}
                    className="h-8 w-16"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
          >
            {creating ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Créer l&apos;examen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
