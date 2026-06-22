"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Clock, CalendarClock, Sparkles, RefreshCw, Lightbulb } from "lucide-react";
import { usePrefs } from "@/lib/prefs-store";
import { useQuizStore } from "@/lib/quiz-store";

interface Reminder {
  id: string;
  type: "daily" | "streak" | "suggestion" | "revision";
  title: string;
  message: string;
  action?: string;
}

export function StudyReminders() {
  const streak = usePrefs((s) => s.streak);
  const lastActiveDate = usePrefs((s) => s.lastActiveDate);
  const sessionsCompleted = usePrefs((s) => s.sessionsCompleted);
  const totalAnswered = usePrefs((s) => s.totalAnswered);
  const openDashboard = useQuizStore((s) => s.openDashboard);
  const goHome = useQuizStore((s) => s.goHome);

  // Use useMemo to compute reminders from state (no useEffect needed)
  const reminders = useMemo(() => {
    const newReminders: Reminder[] = [];

    // Daily reminder
    const today = new Date().toISOString().slice(0, 10);
    if (lastActiveDate !== today) {
      newReminders.push({
        id: "daily",
        type: "daily",
        title: "Rappel quotidien",
        message: "Vous n'avez pas encore révisé aujourd'hui. 15 minutes de quiz suffisent pour progresser !",
        action: "Commencer un quiz",
      });
    }

    // Streak reminder
    if (streak >= 2) {
      newReminders.push({
        id: "streak",
        type: "streak",
        title: `Série de ${streak} jours ! 🔥`,
        message: `Continuez votre série ! Révisez aujourd'hui pour ne pas perdre votre progression de ${streak} jours.`,
      });
    }

    // Suggestions based on activity
    if (sessionsCompleted >= 3 && totalAnswered < 50) {
      newReminders.push({
        id: "suggestion-1",
        type: "suggestion",
        title: "Suggestion: Explorez plus de banques",
        message: `Vous avez répondu à ${totalAnswered} questions. Essayez de nouvelles banques pour diversifier vos connaissances.`,
        action: "Voir les banques",
      });
    }

    if (sessionsCompleted >= 5) {
      newReminders.push({
        id: "suggestion-2",
        type: "revision",
        title: "Suggestion: Révisez vos favoris",
        message: "Vous avez terminé plusieurs quiz. Consultez vos favoris et révisez les questions difficiles.",
        action: "Tableau de bord",
      });
    }

    // AI-powered suggestion
    if (totalAnswered >= 30) {
      newReminders.push({
        id: "ai-suggestion",
        type: "suggestion",
        title: "Conseil IA personnalisé",
        message: "Basé sur votre activité, nous recommandons de faire un examen blanc complet pour tester vos connaissances globales.",
        action: "Examen IA",
      });
    }

    return newReminders;
  }, [streak, lastActiveDate, sessionsCompleted, totalAnswered]);

  if (reminders.length === 0) return null;

  const ICONS: Record<string, typeof Bell> = {
    daily: CalendarClock,
    streak: Clock,
    suggestion: Lightbulb,
    revision: Sparkles,
  };

  const COLORS: Record<string, string> = {
    daily: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30",
    streak: "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30",
    suggestion: "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30",
    revision: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-emerald-600" />
        <h2 className="text-xl font-semibold">Rappels & Suggestions</h2>
        <Badge variant="secondary">{reminders.length}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {reminders.map((r) => {
          const Icon = ICONS[r.type] ?? Bell;
          return (
            <Card key={r.id} className={`border-2 p-4 ${COLORS[r.type] ?? COLORS.daily}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/50 dark:bg-black/20">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{r.title}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{r.message}</p>
                  {r.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 gap-1 text-xs"
                      onClick={() => {
                        if (r.action?.includes("Tableau")) openDashboard();
                        else if (r.action?.includes("Examen")) goHome();
                        else goHome();
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {r.action}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
