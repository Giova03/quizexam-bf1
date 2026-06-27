"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, BellRing, Clock, Send, AlertTriangle } from "lucide-react";
import {
  isSupported,
  requestNotificationPermission,
  showNotification,
  scheduleDailyReminder,
  clearScheduledReminders,
  getPrefs,
  savePrefs,
  type PushPrefs,
} from "@/lib/push-notifications";

/**
 * Push notification settings card.
 *
 * - Toggle: enable / disable push notifications (asks for permission on enable)
 * - Time picker: choose the daily reminder time (HH:MM)
 * - Test button: send a sample notification immediately
 *
 * Preferences are persisted to localStorage via the push-notifications lib.
 * The daily reminder is re-armed on mount if it was previously enabled.
 */
export function PushNotificationSettings() {
  const [supported, setSupported] = useState(true);
  const [prefs, setPrefs] = useState<PushPrefs>({
    enabled: false,
    reminderTime: "19:00",
  });
  const [permission, setPermission] = useState<
    NotificationPermission | null
  >(null);
  const [busy, setBusy] = useState(false);

  // Initialize from localStorage + browser state on mount.
  useEffect(() => {
    const sup = isSupported();
    setSupported(sup);
    if (!sup) return;

    setPermission(Notification.permission);
    const stored = getPrefs();
    setPrefs(stored);

    // Re-arm the daily reminder if it was previously enabled and we
    // still have permission.
    if (stored.enabled && Notification.permission === "granted") {
      scheduleDailyReminder(stored.reminderTime);
    }
  }, []);

  async function handleToggle(enabled: boolean) {
    if (!enabled) {
      // Disabling — cancel any pending reminders and persist.
      const next = { ...prefs, enabled: false };
      setPrefs(next);
      savePrefs(next);
      clearScheduledReminders();
      toast.success("Notifications push désactivées");
      return;
    }

    // Enabling — ask for permission first.
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error(
          "Permission refusée. Activez les notifications dans les réglages du navigateur."
        );
        setPermission(Notification.permission);
        return;
      }
      setPermission("granted");
      const next = { ...prefs, enabled: true };
      setPrefs(next);
      savePrefs(next);
      scheduleDailyReminder(next.reminderTime);
      toast.success("Notifications push activées 🎉");
    } finally {
      setBusy(false);
    }
  }

  function handleTimeChange(time: string) {
    const next = { ...prefs, reminderTime: time };
    setPrefs(next);
    savePrefs(next);
    // Re-arm the reminder for the new time, if still enabled + permitted.
    if (next.enabled && permission === "granted") {
      scheduleDailyReminder(time);
    }
  }

  function handleTest() {
    if (permission !== "granted") {
      toast.error("Activez d'abord les notifications.");
      return;
    }
    showNotification(
      "QuizExam BF — Test",
      "Les notifications fonctionnent ! 🎉"
    );
    toast.success("Notification de test envoyée");
  }

  // ---------------------------------------------------------------------
  // Unsupported browser
  // ---------------------------------------------------------------------
  if (!supported) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-2.5">
          <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Label className="text-sm font-medium">Notifications push</Label>
            <p className="text-xs text-muted-foreground">
              Votre navigateur ne supporte pas les notifications push.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const permissionDenied = permission === "denied";

  return (
    <div className="space-y-2">
      <Card className="divide-y p-0 shadow-sm">
        {/* === Enable / disable toggle === */}
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-start gap-2.5">
            {prefs.enabled ? (
              <BellRing className="mt-0.5 h-4 w-4 text-emerald-600" />
            ) : (
              <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <Label className="text-sm font-medium">Notifications push</Label>
              <p className="text-xs text-muted-foreground">
                Recevez un rappel quotidien pour pratiquer
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.enabled}
            onCheckedChange={handleToggle}
            disabled={busy || permissionDenied}
            aria-label="Activer les notifications push"
          />
        </div>

        {/* === Reminder time picker (only when enabled) === */}
        {prefs.enabled && (
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Heure du rappel</Label>
                <p className="text-xs text-muted-foreground">
                  Vous serez notifié chaque jour à cette heure
                </p>
              </div>
            </div>
            <input
              type="time"
              value={prefs.reminderTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              aria-label="Heure du rappel quotidien"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm tabular-nums outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        )}

        {/* === Test notification button (only when enabled) === */}
        {prefs.enabled && (
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-start gap-2.5">
              <Send className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Tester</Label>
                <p className="text-xs text-muted-foreground">
                  Envoie une notification pour vérifier le bon fonctionnement
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={permission !== "granted"}
            >
              Tester
            </Button>
          </div>
        )}
      </Card>

      {/* === Permission-denied warning === */}
      {permissionDenied && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Permission refusée. Réautorisez les notifications dans les
            réglages de votre navigateur pour activer les rappels.
          </span>
        </div>
      )}
    </div>
  );
}
