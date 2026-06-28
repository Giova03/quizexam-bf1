"use client";

import { useState, useEffect, lazy, Suspense } from "react";
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
import { SocialView } from "@/components/quiz/social-view";
import { CustomExamDialog } from "@/components/quiz/custom-exam-dialog";
import { SearchDialog } from "@/components/quiz/search-dialog";
import { RealtimeNotification } from "@/components/quiz/realtime-notification";
import { DarkModeToggle } from "@/components/quiz/dark-mode-toggle";
import { useOfflineMode } from "@/lib/use-offline-mode";
import { LanguageSwitcher } from "@/components/quiz/language-switcher";
import { NotificationsPanel } from "@/components/quiz/notifications-panel";
import { SettingsPanel } from "@/components/quiz/settings-panel";
import { PreferencesApplier } from "@/components/quiz/preferences-applier";
import { UserMenuButton, AuthDialog } from "@/components/quiz/auth-dialog";
import { Chatbot } from "@/components/quiz/chatbot";
import { SplashScreen } from "@/components/quiz/splash-screen";
<<<<<<< Updated upstream
import { InstallPrompt } from "@/components/quiz/install-prompt";
import { ErrorBoundary } from "@/components/quiz/error-boundary";
import { OnboardingTourContainer } from "@/components/quiz/onboarding-tour";
import { HelpButton } from "@/components/quiz/help-button";
import { PricingModal } from "@/components/quiz/pricing-modal";
import { ApiDocsView } from "@/components/quiz/api-docs-view";
import { Skeleton } from "@/components/ui/skeleton";
=======
import { ErrorBoundary } from "@/components/quiz/error-boundary";
import { SpacedRepetitionView } from "@/components/quiz/spaced-repetition-view";
import { ForumView } from "@/components/quiz/forum-view";
import { CompetitionView } from "@/components/quiz/competition-view";
import { AchievementsView } from "@/components/quiz/achievements-view";
import { ProfileView } from "@/components/quiz/profile-view";
import { ApiDocsView } from "@/components/quiz/api-docs-view";
import { StudyGroupsView } from "@/components/quiz/study-groups-view";
import { EventsView } from "@/components/quiz/events-view";
import { BlogView } from "@/components/quiz/blog-view";
import { OnboardingTour, restartTour } from "@/components/quiz/onboarding-tour";
import { PricingModal } from "@/components/quiz/pricing-modal";
>>>>>>> Stashed changes
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  WifiOff,
  Sparkles,
  Search,
  Trophy,
<<<<<<< Updated upstream
  Award,
  MessagesSquare,
  Swords,
  Brain,
  ChevronDown,
  Crown,
  Code2,
  UsersRound,
  CalendarDays,
  Newspaper,
=======
  Brain,
  MessagesSquare,
  Swords,
  Award,
  User as UserIcon,
  Code2,
  Crown,
  Users2,
  CalendarDays,
  Newspaper,
  HelpCircle,
>>>>>>> Stashed changes
} from "lucide-react";

// --- Lazy-loaded secondary views --------------------------------------------
// These views are not part of the main user flow (home → session → results →
// dashboard) and can be code-split to keep the initial JS bundle small. Each
// is loaded on first render via React.lazy() and wrapped in <Suspense> below.
const AboutView = lazy(() =>
  import("@/components/quiz/about-view").then((m) => ({ default: m.AboutView }))
);
const AdminView = lazy(() =>
  import("@/components/quiz/admin-view").then((m) => ({ default: m.AdminView }))
);
const LeaderboardView = lazy(() =>
  import("@/components/quiz/leaderboard-view").then((m) => ({
    default: m.LeaderboardView,
  }))
);
const SpacedRepetitionView = lazy(() =>
  import("@/components/quiz/spaced-repetition-view").then((m) => ({
    default: m.SpacedRepetitionView,
  }))
);
const AchievementsView = lazy(() =>
  import("@/components/quiz/achievements-view").then((m) => ({
    default: m.AchievementsView,
  }))
);
const ForumView = lazy(() =>
  import("@/components/quiz/forum-view").then((m) => ({ default: m.ForumView }))
);
const ProfileView = lazy(() =>
  import("@/components/quiz/profile-view").then((m) => ({
    default: m.ProfileView,
  }))
);
const CompetitionView = lazy(() =>
  import("@/components/quiz/competition-view").then((m) => ({
    default: m.CompetitionView,
  }))
);
const StudyGroupsView = lazy(() =>
  import("@/components/quiz/study-groups-view").then((m) => ({
    default: m.StudyGroupsView,
  }))
);
const EventsView = lazy(() =>
  import("@/components/quiz/events-view").then((m) => ({
    default: m.EventsView,
  }))
);
const BlogView = lazy(() =>
  import("@/components/quiz/blog-view").then((m) => ({
    default: m.BlogView,
  }))
);

// Shared Suspense fallback for any lazy view.
function ViewSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

export default function Home() {
  const {
    view,
    goHome,
    openDashboard,
    openAbout,
    openAdmin,
    openSocial,
    openLeaderboard,
<<<<<<< Updated upstream
    openAchievements,
    openForum,
    openCompetition,
    openSpacedRepetition,
    openGroups,
    openEvents,
    openBlog,
=======
    openSpacedRepetition,
    openForum,
    openCompetition,
    openAchievements,
    openProfile,
    openApiDocs,
    openStudyGroups,
    openEvents,
    openBlog,
    selectedProfileId,
>>>>>>> Stashed changes
    startSession,
  } = useQuizStore();
  const { t } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Capture referral code from ?ref=CODE URL param on first render.
  // Pre-fills the signup form so referred users can complete signup with one click.
  // Using a lazy initializer (runs once on mount) avoids setState-in-effect lint.
  const [prefilledReferral] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    return ref && /^[A-Za-z0-9]{4,12}$/.test(ref) ? ref.toUpperCase() : null;
  });

  // Auto-open the auth dialog when arriving from a referral link so the user
  // immediately sees the prefilled signup form.
  const [authOpen, setAuthOpen] = useState<boolean>(!!prefilledReferral);

  // Clean the URL (avoid accidentally sharing the referral code in links).
  // This effect does NOT call setState — it only updates an external system
  // (the browser URL via history.replaceState), which is an allowed pattern.
  useEffect(() => {
    if (!prefilledReferral) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore (SSR / non-browser)
    }
  }, [prefilledReferral]);

  const [customExamOpen, setCustomExamOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
<<<<<<< Updated upstream
  const [apiDocsOpen, setApiDocsOpen] = useState(false);
=======
>>>>>>> Stashed changes
  const { data: session, status } = useSession();
  const unreadCount = usePrefs((s) =>
    s.notifications.filter((n) => !n.read).length
  );
  const { isOnline } = useOfflineMode();

  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  // Ensure admin account exists on first load
  useEffect(() => {
    fetch("/api/admin/init", { method: "POST" }).catch(() => {});
  }, []);

  // Keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          initialReferralCode={prefilledReferral ?? undefined}
        />
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

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          <WifiOff className="h-4 w-4" />
          Mode hors ligne. Synchronisation automatique à la reconnexion.
        </div>
      )}

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
              {/* Primary nav — always visible */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "home" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={goHome}
                      data-tour="home-nav"
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
                      data-tour="dashboard-nav"
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
<<<<<<< Updated upstream
=======
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
                      variant={view === "leaderboard" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openLeaderboard}
                    >
                      <Trophy className="h-4 w-4" data-testid="trophy-icon" />
                      <span className="hidden lg:inline">Classement</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Classement général</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "spaced-repetition" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openSpacedRepetition}
                    >
                      <Brain className="h-4 w-4" />
                      <span className="hidden lg:inline">Révision</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Révision espacée (SM-2)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "forum" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openForum}
                    >
                      <MessagesSquare className="h-4 w-4" />
                      <span className="hidden lg:inline">Forum</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Forum de discussion</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "competition" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openCompetition}
                    >
                      <Swords className="h-4 w-4" />
                      <span className="hidden lg:inline">Compétition</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mode compétition multijoueur</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "achievements" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openAchievements}
                    >
                      <Award className="h-4 w-4" />
                      <span className="hidden lg:inline">Badges</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Achievements (27 badges)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "profile" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openProfile()}
                    >
                      <UserIcon className="h-4 w-4" />
                      <span className="hidden lg:inline">Profil</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mon profil public</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "api-docs" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openApiDocs}
                    >
                      <Code2 className="h-4 w-4" />
                      <span className="hidden lg:inline">API</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Documentation API publique</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "study-groups" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openStudyGroups}
                    >
                      <Users2 className="h-4 w-4" />
                      <span className="hidden lg:inline">Groupes</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Groupes d&apos;étude</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "events" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openEvents}
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden lg:inline">Événements</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Événements à venir</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === "blog" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={openBlog}
                    >
                      <Newspaper className="h-4 w-4" />
                      <span className="hidden lg:inline">Blog</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Blog & articles</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-amber-600"
                      onClick={() => setPricingOpen(true)}
                    >
                      <Crown className="h-4 w-4" />
                      <span className="hidden lg:inline">Améliorer</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Abonnement & tarifs</TooltipContent>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
>>>>>>> Stashed changes
                      size="sm"
                      className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                      onClick={() => setCustomExamOpen(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden lg:inline">Examen IA</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Créer un examen personnalisé avec l&apos;IA
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Secondary nav — grouped under a "Plus" dropdown */}
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={
                            view === "social" ||
                            view === "forum" ||
                            view === "competition" ||
                            view === "leaderboard" ||
                            view === "achievements" ||
                            view === "spaced-repetition" ||
                            view === "groups" ||
                            view === "events" ||
                            view === "blog" ||
                            view === "about"
                              ? "secondary"
                              : "ghost"
                          }
                          size="sm"
                          className="gap-1.5"
                          data-tour="more-nav"
                        >
                          <span className="hidden lg:inline">Plus</span>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      Forum, Compétition, Classement, Succès…
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent
                  align="end"
                  className="w-56"
                  sideOffset={8}
                >
                  <DropdownMenuItem
                    onClick={openSocial}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Communauté
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openForum}
                    className="gap-2"
                  >
                    <MessagesSquare className="h-4 w-4" />
                    Forum
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openGroups}
                    className="gap-2"
                  >
                    <UsersRound className="h-4 w-4" />
                    Groupes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openEvents}
                    className="gap-2"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Événements
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openBlog}
                    className="gap-2"
                  >
                    <Newspaper className="h-4 w-4" />
                    Blog
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openCompetition}
                    className="gap-2 text-rose-600 focus:text-rose-600"
                  >
                    <Swords className="h-4 w-4" />
                    Compétition
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={openLeaderboard}
                    className="gap-2"
                  >
                    <Trophy className="h-4 w-4" data-testid="trophy-icon" />
                    Classement
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openAchievements}
                    className="gap-2"
                  >
                    <Award className="h-4 w-4" />
                    Succès
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openSpacedRepetition}
                    className="gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Révision espacée
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={openAbout}
                    className="gap-2"
                  >
                    <Info className="h-4 w-4" />
                    {t("nav.about")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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

            {/* Search button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Rechercher"
                    data-tour="search-btn"
                  >
                    <Search className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rechercher (Ctrl+K)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Language switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Dark mode toggle */}
            <DarkModeToggle />

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

            {/* Help - restart onboarding tour */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => restartTour()}
                    aria-label="Aide / Visite guidée"
                  >
                    <HelpCircle className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Revoir la visite guidée</TooltipContent>
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

            {/* Upgrade to Premium — only for authenticated non-admin users */}
            {status === "authenticated" && !isAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
                      onClick={() => setPricingOpen(true)}
                      aria-label="Passer à Premium"
                    >
                      <Crown className="h-4 w-4" />
                      <span className="hidden lg:inline">Améliorer</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Passer à Premium — illimité, IA, certificats
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Mobile nav row — primary buttons + "Plus" dropdown (full-width menu) */}
        <div className="border-t px-4 py-1.5 md:hidden">
          <div className="flex items-center gap-1 overflow-x-auto">
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              onClick={() => setCustomExamOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs">Examen IA</span>
            </Button>
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
<<<<<<< Updated upstream

            {/* Plus dropdown — secondary nav */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={
                    view === "social" ||
                    view === "forum" ||
                    view === "competition" ||
                    view === "leaderboard" ||
                    view === "achievements" ||
                    view === "spaced-repetition" ||
                    view === "groups" ||
                    view === "events" ||
                    view === "blog" ||
                    view === "about"
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                  className="gap-1"
                >
                  <span className="text-xs">Plus</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[calc(100vw-2rem)] max-w-xs"
                sideOffset={8}
              >
                <DropdownMenuItem
                  onClick={openSocial}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Communauté
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openForum}
                  className="gap-2"
                >
                  <MessagesSquare className="h-4 w-4" />
                  Forum
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openGroups}
                  className="gap-2"
                >
                  <UsersRound className="h-4 w-4" />
                  Groupes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openEvents}
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  Événements
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openBlog}
                  className="gap-2"
                >
                  <Newspaper className="h-4 w-4" />
                  Blog
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openCompetition}
                  className="gap-2 text-rose-600 focus:text-rose-600"
                >
                  <Swords className="h-4 w-4" />
                  Compétition
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={openLeaderboard}
                  className="gap-2"
                >
                  <Trophy className="h-4 w-4" data-testid="trophy-icon" />
                  Classement
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openAchievements}
                  className="gap-2"
                >
                  <Award className="h-4 w-4" />
                  Succès
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openSpacedRepetition}
                  className="gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Révision espacée
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={openAbout}
                  className="gap-2"
                >
                  <Info className="h-4 w-4" />
                  À propos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

=======
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
              variant={view === "leaderboard" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openLeaderboard}
            >
              <Trophy className="h-4 w-4" data-testid="trophy-icon" />
              <span className="text-xs">Classement</span>
            </Button>
            <Button
              variant={view === "spaced-repetition" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openSpacedRepetition}
            >
              <Brain className="h-4 w-4" />
              <span className="text-xs">Révision</span>
            </Button>
            <Button
              variant={view === "forum" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openForum}
            >
              <MessagesSquare className="h-4 w-4" />
              <span className="text-xs">Forum</span>
            </Button>
            <Button
              variant={view === "competition" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openCompetition}
            >
              <Swords className="h-4 w-4" />
              <span className="text-xs">Compétition</span>
            </Button>
            <Button
              variant={view === "achievements" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openAchievements}
            >
              <Award className="h-4 w-4" />
              <span className="text-xs">Badges</span>
            </Button>
            <Button
              variant={view === "profile" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => openProfile()}
            >
              <UserIcon className="h-4 w-4" />
              <span className="text-xs">Profil</span>
            </Button>
            <Button
              variant={view === "api-docs" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openApiDocs}
            >
              <Code2 className="h-4 w-4" />
              <span className="text-xs">API</span>
            </Button>
            <Button
              variant={view === "study-groups" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openStudyGroups}
            >
              <Users2 className="h-4 w-4" />
              <span className="text-xs">Groupes</span>
            </Button>
            <Button
              variant={view === "events" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openEvents}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs">Évén.</span>
            </Button>
            <Button
              variant={view === "blog" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={openBlog}
            >
              <Newspaper className="h-4 w-4" />
              <span className="text-xs">Blog</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 gap-1.5 text-amber-600"
              onClick={() => setPricingOpen(true)}
            >
              <Crown className="h-4 w-4" />
              <span className="text-xs">Améliorer</span>
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
>>>>>>> Stashed changes
            {isAdmin && (
              <Button
                variant={view === "admin" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 text-amber-600"
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
<<<<<<< Updated upstream
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"
        data-tour="home"
      >
        <ErrorBoundary>
          {/* Eager views — main user flow (no Suspense needed) */}
=======
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <ErrorBoundary
          onError={(err, info) => {
            console.error("[Page] Erreur de rendu interceptée :", err, info);
          }}
        >
>>>>>>> Stashed changes
          {view === "home" && <HomeView />}
          {view === "bank-detail" && <BankDetailView />}
          {view === "exam-detail" && <ExamDetailView />}
          {view === "session" && <SessionView />}
          {view === "results" && <ResultsView />}
          {view === "dashboard" && <DashboardView />}
<<<<<<< Updated upstream
          {view === "social" && <SocialView />}

          {/* Lazy views — wrapped in Suspense with a skeleton fallback */}
          <Suspense fallback={<ViewSkeleton />}>
            {view === "about" && <AboutView />}
            {view === "admin" && <AdminView />}
            {view === "leaderboard" && <LeaderboardView />}
            {view === "spaced-repetition" && <SpacedRepetitionView />}
            {view === "achievements" && <AchievementsView />}
            {view === "forum" && <ForumView />}
            {view === "profile" && <ProfileView />}
            {view === "competition" && <CompetitionView />}
            {view === "groups" && <StudyGroupsView />}
            {view === "events" && <EventsView />}
            {view === "blog" && <BlogView />}
          </Suspense>
=======
          {view === "about" && <AboutView />}
          {view === "admin" && <AdminView />}
          {view === "social" && <SocialView />}
          {view === "leaderboard" && <LeaderboardView />}
          {view === "spaced-repetition" && <SpacedRepetitionView />}
          {view === "forum" && <ForumView />}
          {view === "competition" && <CompetitionView />}
          {view === "achievements" && <AchievementsView />}
          {view === "profile" && (
            <ProfileView userId={selectedProfileId ?? undefined} />
          )}
          {view === "api-docs" && <ApiDocsView />}
          {view === "study-groups" && <StudyGroupsView />}
          {view === "events" && <EventsView />}
          {view === "blog" && <BlogView />}
>>>>>>> Stashed changes
        </ErrorBoundary>
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
                </a>{" "}
                ·{" "}
                <button
                  onClick={() => setApiDocsOpen(true)}
                  className="inline-flex items-center gap-1 hover:text-emerald-600"
                  aria-label="Documentation API"
                >
                  <Code2 className="h-3 w-3" />
                  API Docs
                </button>
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            <button
              onClick={openApiDocs}
              className="inline-flex items-center gap-1 hover:text-emerald-600"
            >
              <Code2 className="h-3 w-3" />
              API Docs
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setPricingOpen(true)}
              className="inline-flex items-center gap-1 hover:text-amber-600"
            >
              <Crown className="h-3 w-3" />
              Tarifs
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={openAbout}
              className="inline-flex items-center gap-1 hover:text-emerald-600"
            >
              <Info className="h-3 w-3" />
              {t("nav.about")}
            </button>
          </div>
        </div>
      </footer>

      {/* Panels */}
      <NotificationsPanel open={notifOpen} onOpenChange={setNotifOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Custom exam dialog */}
      <CustomExamDialog
        open={customExamOpen}
        onOpenChange={setCustomExamOpen}
        onCreated={(sessionId) => startSession(sessionId)}
      />

      {/* Search dialog (Ctrl+K) */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

<<<<<<< Updated upstream
      {/* Pricing modal (freemium upgrade) */}
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />

      {/* API documentation dialog */}
      <ApiDocsView open={apiDocsOpen} onOpenChange={setApiDocsOpen} />

=======
      {/* Pricing modal */}
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />

>>>>>>> Stashed changes
      {/* Real-time floating notifications */}
      <RealtimeNotification />

      {/* PWA install banner (mobile / non-installed only) */}
      <InstallPrompt />

      {/* Chatbot IA flottant */}
      <Chatbot />

<<<<<<< Updated upstream
      {/* Aide contextuelle (bouton flottant en bas à gauche) */}
      <HelpButton />

      {/* Tour guidé au premier login */}
      <OnboardingTourContainer isAuthenticated={status === "authenticated"} />
=======
      {/* Onboarding guided tour (first login) */}
      <OnboardingTour />
>>>>>>> Stashed changes
    </div>
  );
}
