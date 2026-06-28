"use client";

import { useEffect, useState, useCallback } from "react";
<<<<<<< Updated upstream
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
=======
import { useSession } from "next-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
import { toast } from "sonner";
=======
>>>>>>> Stashed changes
import {
  CalendarDays,
  Plus,
  Trash2,
<<<<<<< Updated upstream
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
=======
  MapPin,
  Clock,
  Info,
  GraduationCap,
  Wrench,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
>>>>>>> Stashed changes

interface EventItem {
  id: string;
  title: string;
  description: string;
<<<<<<< Updated upstream
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
=======
  date: string;
  endDate: string | null;
  location: string;
  category: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "info", label: "Information", icon: Info, color: "text-sky-600" },
  { value: "exam", label: "Examen", icon: GraduationCap, color: "text-rose-600" },
  { value: "workshop", label: "Atelier", icon: Wrench, color: "text-amber-600" },
  { value: "meeting", label: "Réunion", icon: Users2, color: "text-violet-600" },
];

function catMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0];
}

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function EventsView() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "09:00",
    location: "",
    category: "info",
  });
>>>>>>> Stashed changes

  const load = useCallback(async () => {
    setLoading(true);
    try {
<<<<<<< Updated upstream
      const res = await fetch("/api/events?limit=50", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data.items) ? data.items : []);
      }
=======
      const res = await fetch("/api/events?limit=100");
      if (res.ok) setEvents(await res.json());
>>>>>>> Stashed changes
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
<<<<<<< Updated upstream
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
=======
  }, [load]);

  async function handleCreate() {
    if (!form.title.trim() || !form.date) {
      toast.error("Titre et date requis");
      return;
    }
    const iso = new Date(`${form.date}T${form.time || "09:00"}`).toISOString();
    setCreating(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          date: iso,
          location: form.location.trim(),
          category: form.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }
      toast.success("Événement créé");
      setCreateOpen(false);
      setForm({ title: "", description: "", date: "", time: "09:00", location: "", category: "info" });
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erreur");
        return;
      }
      toast.success("Supprimé");
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  // Group by upcoming / past
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now);
  const past = events.filter((e) => new Date(e.date) < now);
>>>>>>> Stashed changes

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarDays className="h-6 w-6 text-emerald-600" />
            Événements
          </h1>
          <p className="text-muted-foreground">
<<<<<<< Updated upstream
            Examens, concours et échéances à venir
=======
            Examens blancs, ateliers de révision et réunions d&apos;information.
>>>>>>> Stashed changes
          </p>
        </div>
        {isAdmin && (
          <Button
<<<<<<< Updated upstream
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => setCreateOpen(true)}
=======
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
>>>>>>> Stashed changes
          >
            <Plus className="h-4 w-4" />
            Créer un événement
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
<<<<<<< Updated upstream
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
=======
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              À venir ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Aucun événement à venir.
              </Card>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    isAdmin={isAdmin}
                    onDelete={() => handleDelete(e.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                Passés ({past.length})
              </h2>
              <div className="space-y-2 opacity-70">
                {past.slice(0, 10).map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    isAdmin={isAdmin}
                    onDelete={() => handleDelete(e.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un événement</DialogTitle>
            <DialogDescription>
              L&apos;événement sera visible par tous les utilisateurs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Titre *</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="ex: Examen blanc de Culture Générale"
                maxLength={120}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">Date *</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-time">Heure</Label>
                <Input
                  id="ev-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-loc">Lieu</Label>
              <Input
                id="ev-loc"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="ex: Salle 12, Ouagadougou / En ligne"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-cat">Catégorie</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="ev-cat">
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
            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Détails, programme, prérequis..."
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
>>>>>>> Stashed changes
    </div>
  );
}

<<<<<<< Updated upstream
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
=======
function EventCard({
  event,
  isAdmin,
  onDelete,
}: {
  event: EventItem;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const cat = catMeta(event.category);
  const Icon = cat.icon;
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted text-center">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {new Date(event.date).toLocaleDateString("fr-FR", { month: "short" })}
        </span>
        <span className="text-lg font-bold leading-none">
          {new Date(event.date).getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{event.title}</h3>
          <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
            <Icon className={`h-3 w-3 ${cat.color}`} />
            {cat.label}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatEventDate(event.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(event.date)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
        </div>
        {event.description && (
          <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
        )}
      </div>
      {isAdmin && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Card>
>>>>>>> Stashed changes
  );
}
