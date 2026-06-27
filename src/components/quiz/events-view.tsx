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
import {
  CalendarDays,
  Plus,
  Trash2,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  CalendarCheck,
  Trophy,
  FileWarning,
  GraduationCap,
} from "lucide-react";

// ---------- Types ----------

interface EventCreator {
  id: string;
  name: string;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  type: "exam" | "contest" | "deadline";
  startDate: string;
  endDate: string | null;
  createdBy: string;
  creator: EventCreator;
  createdAt: string;
}

const STORAGE_KEY = "qebf-subscribed-events";

function getSubscribedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSubscribedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore quota errors
  }
}

const TYPE_META: Record<
  EventItem["type"],
  { label: string; badge: string; icon: typeof GraduationCap }
> = {
  exam: {
    label: "Examen",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    icon: GraduationCap,
  },
  contest: {
    label: "Concours",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    icon: Trophy,
  },
  deadline: {
    label: "Échéance",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    icon: FileWarning,
  },
};

function formatEventDate(start: string, end: string | null): string {
  const s = new Date(start);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  if (!end) return fmt(s);
  const e = new Date(end);
  if (e.toDateString() === s.toDateString()) return fmt(s);
  return `${fmt(s)} → ${fmt(e)}`;
}

function formatEventTime(start: string, end: string | null): string {
  const s = new Date(start);
  const sTime = s.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!end) return sTime;
  const e = new Date(end);
  if (e.toDateString() === s.toDateString()) {
    return `${sTime} – ${e.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return sTime;
}

// ---------- Component ----------

export function EventsView() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events?limit=50", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data.items) ? data.items : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setSubscribed(getSubscribedIds());
  }, [load]);

  const toggleSubscribe = (id: string) => {
    setSubscribed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info("Désinscription enregistrée (local)");
      } else {
        next.add(id);
        toast.success("Inscription enregistrée (local)");
      }
      saveSubscribedIds(next);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Suppression impossible");
        return;
      }
      toast.success("Événement supprimé");
      load();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  // Group events by month for a "calendar-style" list.
  const grouped = events.reduce<Record<string, EventItem[]>>((acc, e) => {
    const d = new Date(e.startDate);
    const key = d.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarDays className="h-6 w-6 text-emerald-600" />
            Événements
          </h1>
          <p className="text-muted-foreground">
            Examens, concours et échéances à venir
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Créer un événement
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucun événement à venir. Revenez bientôt !
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {month}
                </h2>
                <div className="h-px flex-1 bg-border" />
                <Badge variant="outline">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((e) => {
                  const meta = TYPE_META[e.type] ?? TYPE_META.deadline;
                  const Icon = meta.icon;
                  const isSubscribed = subscribed.has(e.id);
                  return (
                    <Card key={e.id} className="overflow-hidden p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 gap-3">
                          {/* Date block */}
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                            <span className="text-lg font-bold leading-none">
                              {new Date(e.startDate).getDate()}
                            </span>
                            <span className="text-[10px] uppercase">
                              {new Date(e.startDate).toLocaleDateString(
                                "fr-FR",
                                { month: "short" }
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{e.title}</h3>
                              <Badge className={`gap-1 ${meta.badge}`}>
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </Badge>
                              {isSubscribed && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 text-emerald-600"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Inscrit
                                </Badge>
                              )}
                            </div>
                            {e.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {e.description}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatEventDate(e.startDate, e.endDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatEventTime(e.startDate, e.endDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                par {e.creator.name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            variant={isSubscribed ? "secondary" : "outline"}
                            className="gap-1.5"
                            onClick={() => toggleSubscribe(e.id)}
                          >
                            <CalendarCheck className="h-4 w-4" />
                            {isSubscribed ? "Inscrit" : "S'inscrire"}
                          </Button>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                              onClick={() => handleDelete(e.id)}
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          toast.success("Événement créé");
          load();
        }}
      />
    </div>
  );
}

// ---------- Create event dialog ----------

function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"exam" | "contest" | "deadline">("deadline");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setType("deadline");
      setStartDate("");
      setEndDate("");
    }
  }, [open]);

  async function submit() {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!startDate) {
      toast.error("La date de début est requise");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        type,
        startDate,
      };
      if (endDate) body.endDate = endDate;
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Création échouée");
        return;
      }
      onCreated();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  // min datetime = now (rounded to minute)
  const nowStr = (() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un événement</DialogTitle>
          <DialogDescription>
            Annoncez un examen blanc, un concours ou une échéance importante.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="evt-title">Titre *</Label>
            <Input
              id="evt-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Concours Fonction Publique 2025"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evt-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                setType(v as "exam" | "contest" | "deadline")
              }
            >
              <SelectTrigger id="evt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">Examen</SelectItem>
                <SelectItem value="contest">Concours</SelectItem>
                <SelectItem value="deadline">Échéance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="evt-start">Date de début *</Label>
              <Input
                id="evt-start"
                type="datetime-local"
                value={startDate}
                min={nowStr}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evt-end">Date de fin (optionnel)</Label>
              <Input
                id="evt-end"
                type="datetime-local"
                value={endDate}
                min={startDate || nowStr}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="evt-desc">Description (optionnel)</Label>
            <Textarea
              id="evt-desc"
              value={description}
              maxLength={1000}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails, lieu, modalités d'inscription..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !title.trim() || !startDate}
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
