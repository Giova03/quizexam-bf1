"use client";

import { useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Bell, Trophy, TrendingUp, CalendarClock, Info, CheckCircle2 } from "lucide-react";

const ICONS: Record<string, typeof Trophy> = {
  result: Trophy,
  reminder: CalendarClock,
  progress: TrendingUp,
  badge: Trophy,
  info: Info,
};

const COLORS: Record<string, string> = {
  result: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40",
  reminder: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40",
  progress: "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40",
  badge: "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40",
  info: "border-border bg-card",
};

/**
 * Affiche une notification flottante temps réel quand une nouvelle notification est ajoutée.
 * Se ferme automatiquement après 5 secondes ou au clic.
 */
export function RealtimeNotification() {
  const notifications = usePrefs((s) => s.notifications);
  const [current, setCurrent] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Show the most recent unread notification (that hasn't been shown yet)
  useEffect(() => {
    const latest = notifications.find((n) => !n.read && !dismissed.has(n.id));
    if (latest && current !== latest.id) {
      // Use setTimeout to avoid calling setState synchronously in effect
      const showTimer = setTimeout(() => setCurrent(latest.id), 0);
      // Auto-dismiss after 6 seconds
      const dismissTimer = setTimeout(() => {
        setDismissed((prev) => new Set([...prev, latest.id]));
        setCurrent(null);
      }, 6000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    }
  }, [notifications, dismissed, current]);

  if (!current) return null;

  const notif = notifications.find((n) => n.id === current);
  if (!notif) return null;

  const Icon = ICONS[notif.type] ?? Info;

  return (
    <div className="fixed bottom-5 left-1/2 z-[60] w-full max-w-md -translate-x-1/2 px-4 sm:bottom-5 sm:left-5 sm:right-auto sm:translate-x-0">
      <Card className={`flex items-start gap-3 border-2 p-3 shadow-2xl ${COLORS[notif.type] ?? COLORS.info} animate-in slide-in-from-bottom-5`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/50 dark:bg-black/20">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{notif.title}</p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{notif.message}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => {
            setDismissed((prev) => new Set([...prev, notif.id]));
            setCurrent(null);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </Card>
    </div>
  );
}
