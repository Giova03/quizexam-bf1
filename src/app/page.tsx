"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuizStore } from "@/lib/quiz-store";
import { usePrefs } from "@/lib/prefs-store";
import { useTranslation } from "@/lib/use-translation";
import { HomeView } from "@/components/quiz/home-view";
import { BankDetailView } from "@/components/quiz/bank-detail-view";
import { ExamDetailView } from "@/components/quiz/exam-detail-view";
import { SessionView } from "@/components/quiz/session-view";
import { ResultsView } from "@/components/quiz/results-view";
import { DashboardView } from "@/components/quiz/dashboard-view";
import { AboutView } from "@/components/quiz/about-view";
import { AdminView } from "@/components/quiz/admin-view";
import { SocialView } from "@/components/quiz/social-view";
import { LanguageSwitcher } from "@/components/quiz/language-switcher";
import { NotificationsPanel } from "@/components/quiz/notifications-panel";
import { SettingsPanel } from "@/components/quiz/settings-panel";
import { PreferencesApplier } from "@/components/quiz/preferences-applier";
import { UserMenuButton, AuthDialog } from "@/components/quiz/auth-dialog";
import { Chatbot } from "@/components/quiz/chatbot";
import { SplashScreen } from "@/components/quiz/splash-screen";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GraduationCap,
  LayoutDashboard,
  Info,
  Bell,
  Settings,
  House,
  ShieldCheck,
  Users,
  Loader2,
} from "lucide-react";

export default function Home() {
  const {
    view,
    goHome,
    openDashboard,
    openAbout,
    openAdmin,
    openSocial,
  } = useQuizStore();
  const { t } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session, status } = useSession();
  const unreadCount = usePrefs((s) =>
    s.notifications.filter((n) => !n.read).length
  );

  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  // Ensure admin account exists on first load
  useEffect(() => {
    fetch("/api/admin/init", { method: "POST" }).catch(() => {});
  }, []);

  // Show splash screen on first load
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Show loading while session is being checked
  if (status === "loading" && !splashDone) {
    return <SplashScreen />;
  }

  // If not authenticated, show login screen
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700">
        <SplashScreen />
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-card">
            <div className="mb-6 flex flex-col items-center text-center">
              <img
                src="/logo-quizexam.svg"
                alt="QuizExam BF"
                className="h-20 w-20 rounded-2xl"
                width={80}
                height={80}
              />
              <h1 className="mt-4 text-2xl font-bold text-foreground">
                QuizExam BF
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Plateforme de Quiz &amp; Examens Blancs
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Connectez-vous pour accéder à la plateforme
              </p>
            </div>

            <Button
              className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              onClick={() => setAuthOpen(true)}
            >
              <GraduationCap className="h-4 w-4" />
              Se connecter / S&apos;inscrire
            </Button>

            <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
              <p>
                Pas encore de compte ? Créez un compte visiteur gratuit en
                un clic.
              </p>
              <p className="font-medium">
                Créateur : BAMOGO Pingdwendé Giovanni · giobamos03@gmail.com
              </p>
            </div>
          </div>
        </div>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }

  // Loading state while session loads
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SplashScreen />
      <PreferencesApplier />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          {/* Logo + brand */}
          <button
            onClick={goHome}
            className="flex items-center gap-2.5 font-bold transition-opacity hover:opacity-80"
          >
            <img
              src="/logo-quizexam.svg"
              alt="Logo QuizExam BF"
              className="h-10 w-10 rounded-xl"
              width={40}
              height={40}
            />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-base">QuizExam BF</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                Préparation Concours
              </span>
            </span>
          </button>

          {/* Navigation + actions */}
          <div className="flex items-center gap-1.5">
            <nav className="hidden items-center gap-1 md:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "home" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={goHome}
                    >
                      <House className="h-4 w-4" />
                      <span className="hidden lg:inline">
                        {t("nav.home")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("nav.home")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "dashboard" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openDashboard}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden lg:inline">
                        {t("nav.dashboard")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("nav.dashboard")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "social" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openSocial}
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden lg:inline">Communauté</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Communauté</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "about" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openAbout}
                    >
                      <Info className="h-4 w-4" />
                      <span className="hidden lg:inline">
                        {t("nav.about")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("nav.about")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isAdmin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={view === "admin" ? "secondary" : "ghost"}
                        size="sm"
                        className="gap-1.5 text-amber-600"
                        onClick={openAdmin}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span className="hidden lg:inline">Admin</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Panneau d&apos;administration
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </nav>

            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

            {/* Language switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Notifications */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                    onClick={() => setNotifOpen(true)}
                    aria-label={t("nav.notifications")}
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nav.notifications")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Settings */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSettingsOpen(true)}
                    aria-label={t("nav.settings")}
                  >
                    <Settings className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nav.settings")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* User menu */}
            <UserMenuButton />
          </div>
        </div>

        {/* Mobile nav row */}
        <div className="border-t px-4 py-1.5 md:hidden">
          <div className="flex items-center gap-1">
            <Button
              variant={view === "home" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={goHome}
            >
              <House className="h-4 w-4" />
              <span className="text-xs">Accueil</span>
            </Button>
            <Button
              variant={view === "dashboard" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openDashboard}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-xs">Stats</span>
            </Button>
            <Button
              variant={view === "social" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openSocial}
            >
              <Users className="h-4 w-4" />
              <span className="text-xs">Communauté</span>
            </Button>
            <Button
              variant={view === "about" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openAbout}
            >
              <Info className="h-4 w-4" />
              <span className="text-xs">À propos</span>
            </Button>
            {isAdmin && (
              <Button
                variant={view === "admin" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 gap-1.5 text-amber-600"
                onClick={openAdmin}
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs">Admin</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {view === "home" && <HomeView />}
        {view === "bank-detail" && <BankDetailView />}
        {view === "exam-detail" && <ExamDetailView />}
        {view === "session" && <SessionView />}
        {view === "results" && <ResultsView />}
        {view === "dashboard" && <DashboardView />}
        {view === "about" && <AboutView />}
        {view === "admin" && <AdminView />}
        {view === "social" && <SocialView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/logo-quizexam.svg"
                alt=""
                className="h-6 w-6 rounded-md"
                width={24}
                height={24}
              />
              <span>{t("footer.tagline")}</span>
            </div>
            <div className="text-center sm:text-right">
              <p className="font-medium text-foreground">
                BAMOGO Pingdwendé Giovanni
              </p>
              <p className="text-xs">
                <a
                  href="mailto:giobamos03@gmail.com"
                  className="hover:text-emerald-600"
                >
                  giobamos03@gmail.com
                </a>{" "}
                ·{" "}
                <a
                  href="tel:+22670698070"
                  className="hover:text-emerald-600"
                >
                  +226 70 69 80 70
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Panels */}
      <NotificationsPanel open={notifOpen} onOpenChange={setNotifOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Chatbot IA flottant */}
      <Chatbot />
    </div>
  );
}
