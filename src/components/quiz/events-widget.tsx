"use client";

<<<<<<< Updated upstream
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  CalendarCheck,
  Clock,
  ChevronRight,
  Trophy,
  FileWarning,
  GraduationCap,
} from "lucide-react";
=======
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Clock, MapPin, ArrowRight } from "lucide-react";
>>>>>>> Stashed changes
import { useQuizStore } from "@/lib/quiz-store";

interface EventItem {
  id: string;
  title: string;
  description: string;
<<<<<<< Updated upstream
  type: "exam" | "contest" | "deadline";
  startDate: string;
  endDate: string | null;
  creator: { id: string; name: string };
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

/**
 * Compact dashboard widget showing the next 3 upcoming events.
 * Fetches from /api/events?limit=3 — public (no auth required) so it works
 * even for visitors browsing the dashboard.
=======
  date: string;
  endDate: string | null;
  location: string;
  category: string;
}

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
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

/**
 * EventsWidget — shows the next 3 upcoming events on the dashboard.
 * Clicking "Voir tout" navigates to the full events view.
>>>>>>> Stashed changes
 */
export function EventsWidget() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const openEvents = useQuizStore((s) => s.openEvents);

<<<<<<< Updated upstream
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events?limit=3", { cache: "no-store" });
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
  }, [load]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Prochains événements</h3>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Prochains événements</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={openEvents}
        >
          Voir tout
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CalendarCheck className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            Aucun événement à venir
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => {
            const meta = TYPE_META[e.type] ?? TYPE_META.deadline;
            const Icon = meta.icon;
            const d = new Date(e.startDate);
            return (
              <button
                key={e.id}
                onClick={openEvents}
                className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <span className="text-sm font-bold leading-none">
                    {d.getDate()}
                  </span>
                  <span className="text-[9px] uppercase">
                    {d.toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge className={`px-1.5 py-0 text-[10px] ${meta.badge}`}>
                      <Icon className="mr-0.5 h-2.5 w-2.5" />
                      {meta.label}
                    </Badge>
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {d.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
=======
  useEffect(() => {
    fetch("/api/events?upcoming=true&limit=3")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EventItem[]) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          <h3 className="text-sm font-semibold">Prochains événements</h3>
        </div>
        <button
          onClick={openEvents}
          className="flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs font-medium backdrop-blur transition-colors hover:bg-white/25"
        >
          Voir tout
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-white/15" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/80">
          Aucun événement à venir.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <button
              key={e.id}
              onClick={openEvents}
              className="flex w-full items-center gap-3 rounded-lg bg-white/10 p-2.5 text-left backdrop-blur transition-colors hover:bg-white/20"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-white/20 text-center">
                <span className="text-[9px] font-medium uppercase leading-none">
                  {new Date(e.date).toLocaleDateString("fr-FR", { month: "short" })}
                </span>
                <span className="text-base font-bold leading-none">
                  {new Date(e.date).getDate()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/80">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(e.date)}
                  </span>
                  {e.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {e.location}
                    </span>
                  )}
                </div>
              </div>
              <Badge className="shrink-0 border-white/30 bg-white/20 text-[9px] text-white backdrop-blur">
                {e.category}
              </Badge>
            </button>
          ))}
>>>>>>> Stashed changes
        </div>
      )}
    </Card>
  );
}
