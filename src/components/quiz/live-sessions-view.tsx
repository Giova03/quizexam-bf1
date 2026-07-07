"use client";

import { useEffect, useState, useCallback } from "react";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Radio,
  Plus,
  LogIn,
  Loader2,
  Clock,
  CalendarDays,
  Users,
  PlayCircle,
  CheckCircle2,
  Video,
} from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";

// ---------- Types ----------

interface LiveSessionItem {
  id: string;
  title: string;
  bankId: string;
  hostName: string;
  hostId: string;
  scheduledAt: string;
  createdAt: string;
}

interface BankOption {
  id: string;
  title: string;
  category: string;
  _count?: { questions: number };
}

// ---------- Helpers ----------

function initials(name: string): string {
  return (
    name
      ?.split(" ")
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") ?? "?"
  );
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) {
    const past = -diff;
    if (past < 60 * 60 * 1000) return `Démarré il y a ${Math.floor(past / 60000)} min`;
    return `Terminé`;
  }
  const min = Math.floor(diff / 60000);
  if (min < 60) return `Dans ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Dans ${hr} h ${min % 60} min`;
  const days = Math.floor(hr / 24);
  return `Dans ${days} j`;
}

function isLiveNow(iso: string): boolean {
  const t = new Date(iso).getTime();
  const now = Date.now();
  return t <= now && now - t < 60 * 60 * 1000; // started within the last hour
}

// localStorage key for tracking joined sessions.
const JOINED_KEY = "qebf-joined-live-sessions";

function getJoinedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(JOINED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveJoinedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(JOINED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore quota errors
  }
}

// ---------- Component ----------

export function LiveSessionsView() {
  const { data: session, status } = useSession();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  const openBank = useQuizStore((s) => s.openBank);

  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // Create form state.
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [title, setTitle] = useState("");
  const [bankId, setBankId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load joined sessions from localStorage on mount.
  useEffect(() => {
    setJoined(getJoinedIds());
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/live-sessions", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data.items) ? data.items : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll every 60s so countdowns stay fresh.
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Load banks for the create dialog.
  useEffect(() => {
    if (!createOpen) return;
    if (banks.length > 0) return;
    fetch("/api/banks")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setBanks(Array.isArray(d) ? d : []))
      .catch(() => setBanks([]));
  }, [createOpen, banks.length]);

  async function createSession() {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!bankId) {
      toast.error("Choisissez une banque de questions");
      return;
    }
    if (!scheduledAt) {
      toast.error("Choisissez une date et heure");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          bankId,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Échec de la création");
        return;
      }
      toast.success("Session live créée !");
      setCreateOpen(false);
      setTitle("");
      setBankId("");
      setScheduledAt("");
      load();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  async function joinSession(s: LiveSessionItem) {
    setJoining(s.id);
    try {
      const res = await fetch("/api/live-sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: s.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Échec de la connexion");
        return;
      }
      // Persist joined state.
      const next = new Set(joined);
      next.add(s.id);
      setJoined(next);
      saveJoinedIds(next);
      toast.success(`Vous avez rejoint « ${s.title} »`);
      // Navigate to the bank so the user can start a quiz.
      if (data.bank?.id || s.bankId) {
        openBank(data.bank?.id ?? s.bankId);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setJoining(null);
    }
  }

  // Default scheduled time = now + 1 hour (in the local datetime-local format).
  function defaultScheduledAt(): string {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // --- Auth gate ------------------------------------------------------
  if (status !== "authenticated") {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <LogIn className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Connexion requise</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Connectez-vous pour voir les sessions de révision live et
          rejoindre la communauté.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Radio className="h-6 w-6 text-rose-600" />
            Sessions de révision live
          </h1>
          <p className="text-sm text-muted-foreground">
            Rejoignez des sessions de quiz en direct ou créez la vôtre pour
            réviser à plusieurs.
          </p>
        </div>
        <Button
          onClick={() => {
            setTitle("");
            setBankId("");
            setScheduledAt(defaultScheduledAt());
            setCreateOpen(true);
          }}
          className="gap-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white"
        >
          <Plus className="h-4 w-4" />
          Créer une session
        </Button>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Radio className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Aucune session programmée</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Créez la première session de révision live pour inviter
            d&apos;autres membres à réviser avec vous.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const live = isLiveNow(s.scheduledAt);
            const isHost = s.hostId === meId;
            const hasJoined = joined.has(s.id);
            return (
              <Card key={s.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      live
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {live ? (
                      <Radio className="h-5 w-5 animate-pulse" />
                    ) : (
                      <CalendarDays className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{s.title}</h3>
                      {live && (
                        <Badge className="gap-1 bg-rose-500 text-white">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                          EN DIRECT
                        </Badge>
                      )}
                      {isHost && (
                        <Badge
                          variant="outline"
                          className="border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                        >
                          Hôte
                        </Badge>
                      )}
                      {hasJoined && !live && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Inscrit
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-rose-100 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            {initials(s.hostName)}
                          </AvatarFallback>
                        </Avatar>
                        {s.hostName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatSessionDate(s.scheduledAt)}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatCountdown(s.scheduledAt)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                      disabled={joining === s.id}
                      onClick={() => joinSession(s)}
                    >
                      {joining === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : live ? (
                        <PlayCircle className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      {live ? "Rejoindre" : hasJoined ? "Ouvrir" : "S'inscrire"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info card explaining the feature */}
      <Card className="flex items-start gap-3 p-4 text-sm">
        <Video className="h-5 w-5 shrink-0 text-rose-600" />
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground">
            Comment ça marche ?
          </p>
          <p className="mt-1">
            Les sessions de révision live sont des rendez-vous de quiz en
            commun. Quand vous créez une session, vous choisissez une banque
            de questions et une heure. Les autres membres peuvent
            s&apos;inscrire et rejoindre la session pour démarrer le quiz
            en même temps que vous.
          </p>
        </div>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une session live</DialogTitle>
            <DialogDescription>
              Programmez une session de quiz en direct. Les autres membres
              pourront s&apos;inscrire et la rejoindre à l&apos;heure
              prévue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ls-title">Titre de la session *</Label>
              <Input
                id="ls-title"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Révision Culture Générale — Concours 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ls-bank">Banque de questions *</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger id="ls-bank">
                  <SelectValue placeholder="Choisir une banque…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {banks.length === 0 ? (
                    <SelectItem value="_none" disabled>
                    Chargement…
                  </SelectItem>
                  ) : (
                    banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title} ({b._count?.questions ?? 0} Q)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ls-date">Date et heure *</Label>
              <Input
                id="ls-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                La session sera ouverte 1 heure avant et après l&apos;heure
                prévue.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={createSession}
              disabled={submitting}
              className="gap-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
