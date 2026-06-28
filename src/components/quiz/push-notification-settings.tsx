"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
<<<<<<< Updated upstream
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
=======
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Send, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPermission,
  requestPermission,
  showNotification,
  scheduleDailyReminder,
  clearDailyReminder,
  restoreReminderIfEnabled,
  loadPushSettings,
  savePushSettings,
  type PushSettings,
} from "@/lib/push-notifications";

export function PushNotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [settings, setSettings] = useState<PushSettings>({ enabled: false, time: "19:00" });
  const [requesting, setRequesting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setPermission(getPermission());
    setSettings(loadPushSettings());
    // Re-arm any previously scheduled reminder
    restoreReminderIfEnabled();
  }, []);

  async function handleRequestPermission() {
    setRequesting(true);
    try {
      const result = await requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Notifications autorisées");
      } else if (result === "denied") {
        toast.error("Notifications refusées par le navigateur");
      } else {
        toast.info("Demande ignorée");
      }
    } finally {
      setRequesting(false);
    }
  }

  function handleToggle(enabled: boolean) {
    const next = { ...settings, enabled };
    setSettings(next);
    savePushSettings(next);
    if (enabled && permission === "granted") {
      scheduleDailyReminder(next.time);
      toast.success("Rappel quotidien activé");
    } else if (enabled && permission !== "granted") {
      toast.info("Autorisez les notifications d'abord");
      // Auto-prompt permission
      handleRequestPermission();
    } else {
      clearDailyReminder();
      toast.info("Rappel quotidien désactivé");
>>>>>>> Stashed changes
    }
  }

  function handleTimeChange(time: string) {
<<<<<<< Updated upstream
    const next = { ...prefs, reminderTime: time };
    setPrefs(next);
    savePrefs(next);
    // Re-arm the reminder for the new time, if still enabled + permitted.
    if (next.enabled && permission === "granted") {
=======
    const next = { ...settings, time };
    setSettings(next);
    savePushSettings(next);
    if (settings.enabled && permission === "granted") {
>>>>>>> Stashed changes
      scheduleDailyReminder(time);
    }
  }

<<<<<<< Updated upstream
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
=======
  async function handleTest() {
    setTesting(true);
    try {
      if (permission !== "granted") {
        toast.error("Autorisez les notifications d'abord");
        return;
      }
      const ok = showNotification("QuizExam BF — Test", {
        body: "Si vous voyez ceci, les notifications fonctionnent ! ✅",
        tag: "test",
      });
      if (ok) {
        toast.success("Notification envoyée");
      } else {
        toast.error("Échec de l'envoi");
      }
    } finally {
      setTesting(false);
    }
  }

  if (permission === "unsupported") {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Notifications non supportées</p>
>>>>>>> Stashed changes
            <p className="text-xs text-muted-foreground">
              Votre navigateur ne supporte pas les notifications push.
            </p>
          </div>
        </div>
      </Card>
    );
  }

<<<<<<< Updated upstream
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
=======
  return (
    <Card className="divide-y p-0 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-start gap-2.5">
          <Bell className="mt-0.5 h-4 w-4 text-amber-600" />
          <div>
            <Label className="text-sm font-medium">Rappel quotidien</Label>
            <p className="text-xs text-muted-foreground">
              Recevez une notification pour réviser chaque jour.
            </p>
          </div>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={handleToggle}
          disabled={permission === "denied"}
        />
      </div>

      {/* Permission status */}
      {permission !== "granted" && (
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-start gap-2.5">
            {permission === "denied" ? (
              <BellOff className="mt-0.5 h-4 w-4 text-rose-500" />
            ) : (
              <Bell className="mt-0.5 h-4 w-4 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-medium">
                {permission === "denied"
                  ? "Notifications bloquées"
                  : "Permission requise"}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === "denied"
                  ? "Modifiez les paramètres du navigateur pour autoriser les notifications."
                  : "Autorisez les notifications pour activer le rappel quotidien."}
              </p>
            </div>
          </div>
          {permission !== "denied" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestPermission}
              disabled={requesting}
            >
              {requesting ? "..." : "Autoriser"}
            </Button>
          )}
        </div>
      )}

      {/* Time picker */}
      {settings.enabled && (
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div>
              <Label htmlFor="push-time" className="text-sm font-medium">
                Heure du rappel
              </Label>
              <p className="text-xs text-muted-foreground">
                Tous les jours à cette heure.
              </p>
            </div>
          </div>
          <Input
            id="push-time"
            type="time"
            value={settings.time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-28"
          />
        </div>
      )}

      {/* Test button */}
      {permission === "granted" && (
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-start gap-2.5">
            <Send className="mt-0.5 h-4 w-4 text-sky-600" />
            <div>
              <p className="text-sm font-medium">Tester les notifications</p>
              <p className="text-xs text-muted-foreground">
                Envoyer une notification immédiate pour vérifier le fonctionnement.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {testing ? "..." : "Tester"}
          </Button>
        </div>
      )}

      {/* Status footer */}
      {permission === "granted" && settings.enabled && (
        <div className="flex items-center gap-2 bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Rappel actif à <strong className="mx-1">{settings.time}</strong>
          <Badge variant="outline" className="ml-auto border-emerald-300 text-[9px] text-emerald-700">
            Activé
          </Badge>
        </div>
      )}
    </Card>
>>>>>>> Stashed changes
  );
}
