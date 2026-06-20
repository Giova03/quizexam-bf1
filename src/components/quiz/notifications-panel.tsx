"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  Bell,
  Mail,
  TrendingUp,
  CalendarClock,
  Info,
  CheckCheck,
  Inbox,
} from "lucide-react";
import { usePrefs } from "@/lib/prefs-store";

const ICONS: Record<string, typeof Trophy> = {
  result: Trophy,
  reminder: CalendarClock,
  progress: TrendingUp,
  badge: Trophy,
  info: Info,
};

const COLORS: Record<string, string> = {
  result: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
  reminder: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
  progress: "text-sky-600 bg-sky-50 dark:bg-sky-950/40",
  badge: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
  info: "text-muted-foreground bg-muted",
};

export function NotificationsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const notifications = usePrefs((s) => s.notifications);
  const markAllRead = usePrefs((s) => s.markAllRead);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {notifications.length > 0 && (
              <Badge variant="secondary">{notifications.length}</Badge>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">Notifications</SheetDescription>
        </SheetHeader>

        <div className="shrink-0 flex items-center justify-between px-5 pb-2 pt-2">
          <p className="text-xs text-muted-foreground">
            Rappels d&apos;examens, résultats et alertes de progression
          </p>
          {notifications.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout lu
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <Inbox className="h-12 w-12 opacity-40" />
                <p className="text-sm">Aucune notification pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {notifications.map((n) => {
                  const Icon = ICONS[n.type] ?? Info;
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 rounded-xl border p-3 transition-colors ${
                        n.read
                          ? "bg-card"
                          : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${COLORS[n.type] ?? COLORS.info}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70">
                          {new Date(n.date).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="shrink-0 border-t bg-muted/40 p-2.5">
          <div className="flex items-center gap-2 rounded-lg p-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>
              Les notifications importantes sont aussi envoyées par e-mail.
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
