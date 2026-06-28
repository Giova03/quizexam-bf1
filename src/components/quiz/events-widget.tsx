"use client";

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
import { useQuizStore } from "@/lib/quiz-store";

interface EventItem {
  id: string;
  title: string;
  description: string;
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
 */
export function EventsWidget() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const openEvents = useQuizStore((s) => s.openEvents);

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
        </div>
      )}
    </Card>
  );
}
