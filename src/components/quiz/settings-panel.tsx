"use client";

import { usePrefs } from "@/lib/prefs-store";
import { LOCALES, type Locale } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Contrast,
  Trophy,
  Flame,
  Star,
  Zap,
  Award,
  Download,
  Smartphone,
  Palette,
  Bell,
  WifiOff,
} from "lucide-react";
import { useTranslation } from "@/lib/use-translation";
<<<<<<< Updated upstream
import { PushNotificationSettings } from "./push-notification-settings";
import { AccessibilityPanel } from "./accessibility-panel";
import { EmailPreferencesSection } from "./email-preferences";
import { OfflineManagerPanel } from "./offline-manager-panel";
=======
import { OfflineManagerPanel } from "./offline-manager-panel";
import { AccessibilityPanel } from "./accessibility-panel";
import { PushNotificationSettings } from "./push-notification-settings";
>>>>>>> Stashed changes

export function SettingsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const {
    locale,
    setLocale,
    xp,
    level,
    streak,
    badges,
    totalCorrect,
    totalAnswered,
  } = usePrefs();
  const { t } = useTranslation();

  const unlockedBadges = badges.filter((b) => b.unlocked).length;
  const xpInLevel = xp % 100;
  const successRate =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        {/* Modern gradient header */}
        <SheetHeader className="shrink-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white">
          <SheetTitle className="flex items-center gap-2 text-lg text-white">
            <Palette className="h-5 w-5" />
            {t("settings.title")}
          </SheetTitle>
          <SheetDescription className="text-white/80">
            Personnalisez votre expérience QuizExam BF
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-5">
          {/* Gamification summary card */}
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {t("settings.level")} {level}
                    </p>
                    <p className="text-xs text-white/80">{xp} XP total</p>
                  </div>
                </div>
                <Badge className="border-white/30 bg-white/20 text-white backdrop-blur">
                  <Zap className="mr-1 h-3 w-3" />
                  {xpInLevel}/100
                </Badge>
              </div>
              <Progress
                value={xpInLevel}
                className="mt-3 h-1.5 bg-white/20"
              />
            </div>
            <div className="grid grid-cols-3 divide-x">
              <div className="p-3 text-center">
                <Flame className="mx-auto h-5 w-5 text-orange-500" />
                <p className="mt-1 text-lg font-bold">{streak}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t("settings.streak")}
                </p>
              </div>
              <div className="p-3 text-center">
                <Award className="mx-auto h-5 w-5 text-violet-500" />
                <p className="mt-1 text-lg font-bold">
                  {unlockedBadges}/{badges.length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("settings.badges")}
                </p>
              </div>
              <div className="p-3 text-center">
                <Trophy className="mx-auto h-5 w-5 text-emerald-500" />
                <p className="mt-1 text-lg font-bold">{successRate}%</p>
                <p className="text-[10px] text-muted-foreground">Réussite</p>
              </div>
            </div>
          </Card>

          {/* Language section */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4 text-emerald-600" />
              {t("settings.language")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code as Locale)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm transition-all ${
                    locale === l.code
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-border hover:border-emerald-300 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-xl">{l.flag}</span>
                  <span className="font-medium">{l.label}</span>
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Accessibility section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Contrast className="h-4 w-4 text-violet-600" />
              {t("settings.accessibility")}
            </div>
            <AccessibilityPanel />
          </section>

          <Separator />

          {/* Push notifications section */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-emerald-600" />
              Notifications push
            </div>
            <PushNotificationSettings />
          </section>

          <Separator />

          {/* Email preferences section */}
          <EmailPreferencesSection />

          <Separator />

          {/* Offline manager section — added in F5 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <WifiOff className="h-4 w-4 text-orange-600" />
              Mode hors ligne
            </div>
            <OfflineManagerPanel />
          </section>

          <Separator />

          {/* Badges grid */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-600" />
              {t("gamif.badges")} ({unlockedBadges}/{badges.length})
            </div>
            <div className="grid grid-cols-4 gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition-all ${
                    b.unlocked
                      ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                      : "border-dashed border-border opacity-50 grayscale"
                  }`}
                  title={b.description}
                >
                  <Award
                    className={`h-5 w-5 ${
                      b.unlocked
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-[9px] font-medium leading-tight">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* App download section */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="h-4 w-4 text-sky-600" />
              Application mobile
            </div>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-500 to-cyan-600 p-4 text-white shadow-md">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-quizexam.svg"
                  alt="App"
                  className="h-12 w-12 rounded-xl bg-white/20 p-1 backdrop-blur"
                  width={48}
                  height={48}
                />
                <div className="flex-1">
                  <p className="font-semibold">QuizExam BF Mobile</p>
                  <p className="text-xs text-white/80">
                    Mode hors ligne · Notifications push · Toutes vos banques
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  // PWA install prompt
                  const event = new Event("beforeinstallprompt");
                  window.dispatchEvent(event);
                  alert(
                    "Pour installer l'app : menu du navigateur → 'Installer l'application' ou 'Ajouter à l'écran d'accueil'."
                  );
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/30"
              >
                <Download className="h-4 w-4" />
                Télécharger l&apos;application
              </button>
            </Card>
          </section>

          <Separator />

          {/* Accessibility section (advanced) */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4 text-violet-600" />
              Accessibilité avancée
            </div>
            <AccessibilityPanel />
          </section>

          <Separator />

          {/* Push notifications section */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="h-4 w-4 text-amber-600" />
              Notifications push
            </div>
            <PushNotificationSettings />
          </section>

          <Separator />

          {/* Offline mode section */}
          <OfflineManagerPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
