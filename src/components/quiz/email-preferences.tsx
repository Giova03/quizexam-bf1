"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Bell, Clock, MessageSquare, Target, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * EmailPreferences — three toggles controlling which automated emails the
 * user wants to receive.
 *
 * Storage strategy:
 *   - Mirror in localStorage (key "email-prefs") so the UI reflects the
 *     user's choice instantly on subsequent loads even before the server
 *     PATCH round-trips.
 *   - PATCH /api/me with { emailPreferences: {...} } so the server can
 *     filter recipients when the daily-reminder cron runs. If the user is
 *     not logged in, only localStorage is updated (silent no-op on server).
 *
 * The three toggles map 1:1 to the EmailPreferences shape used by the
 * /api/email/daily-reminder route and the sendReplyNotification /
 * sendChallengeReminder helpers in src/lib/email-service.ts.
 */
const STORAGE_KEY = "email-prefs";

interface EmailPrefs {
  dailyReminder: boolean;
  replyNotifications: boolean;
  challengeReminders: boolean;
}

const DEFAULT_PREFS: EmailPrefs = {
  dailyReminder: false,
  replyNotifications: true,
  challengeReminders: false,
};

function loadFromStorage(): EmailPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<EmailPrefs>;
    return {
      dailyReminder: Boolean(parsed.dailyReminder),
      replyNotifications:
        typeof parsed.replyNotifications === "boolean"
          ? parsed.replyNotifications
          : true,
      challengeReminders: Boolean(parsed.challengeReminders),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function saveToStorage(prefs: EmailPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore (privacy mode)
  }
}

export function EmailPreferences() {
  const [prefs, setPrefs] = useState<EmailPrefs>(DEFAULT_PREFS);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount. Wrapped in useEffect to avoid SSR
  // hydration mismatches (window.localStorage is unavailable on the server).
  useEffect(() => {
    setPrefs(loadFromStorage());
    setMounted(true);
  }, []);

  async function updatePref(key: keyof EmailPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveToStorage(next);
    setSavingKey(key);
    try {
      // Fire-and-await: the server PATCH may fail silently if the user
      // isn't logged in — that's fine, we still have localStorage.
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailPreferences: next }),
      });
      if (res.ok) {
        toast.success("Préférences enregistrées", {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
      } else if (res.status === 401) {
        // Not logged in — only localStorage was updated. Don't toast.error
        // because the user might be browsing anonymously.
        toast.info("Connectez-vous pour synchroniser sur l'appareil");
      } else {
        toast.error("Préférence sauvegardée localement seulement");
      }
    } catch {
      toast.error("Erreur réseau — préférence locale seulement");
    } finally {
      setSavingKey(null);
    }
  }

  const toggles: Array<{
    key: keyof EmailPrefs;
    label: string;
    description: string;
    icon: typeof Bell;
  }> = [
    {
      key: "dailyReminder",
      label: "Recevoir les rappels quotidiens",
      description:
        "Un email par jour pour vous rappeler de faire votre quiz et préserver votre série.",
      icon: Clock,
    },
    {
      key: "replyNotifications",
      label: "Recevoir les notifications de réponses",
      description:
        "Soyez prévenu·e quand quelqu'un répond à vos sujets sur le forum.",
      icon: MessageSquare,
    },
    {
      key: "challengeReminders",
      label: "Recevoir les notifications de défis",
      description:
        "Un email quand un nouveau défi quotidien est disponible (bonus XP).",
      icon: Target,
    },
  ];

  return (
    <Card className="divide-y p-1">
      {toggles.map(({ key, label, description, icon: Icon }) => {
        const value = mounted ? prefs[key] : false;
        const isSaving = savingKey === key;
        return (
          <div
            key={key}
            className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/30"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <Label
                htmlFor={`pref-${key}`}
                className="cursor-pointer text-sm font-medium leading-tight"
              >
                {label}
              </Label>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {description}
              </p>
              {isSaving && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <AlertCircle className="h-3 w-3 animate-pulse" />
                  Synchronisation…
                </p>
              )}
            </div>
            <Switch
              id={`pref-${key}`}
              checked={value}
              onCheckedChange={(v) => updatePref(key, v)}
              disabled={isSaving}
              aria-label={label}
            />
          </div>
        );
      })}
    </Card>
  );
}

/**
 * Convenience wrapper that renders the EmailPreferences card with a header
 * matching the rest of the settings panel sections.
 */
export function EmailPreferencesSection() {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Bell className="h-4 w-4 text-emerald-600" />
        Préférences email
      </div>
      <p className="text-xs text-muted-foreground">
        Choisissez les emails automatisés que vous souhaitez recevoir. Vos
        préférences sont enregistrées localement et synchronisées avec votre
        compte si vous êtes connecté·e.
      </p>
      <EmailPreferences />
    </section>
  );
}
