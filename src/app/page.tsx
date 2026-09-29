"use client";

import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQuizStore } from "@/shared/stores/quiz-store";
import { usePrefs } from "@/shared/stores/prefs-store";
import { useTranslation } from "@/lib/use-translation";
// E6: All views are now lazy-loaded (code splitting complet).
// Each view is its own JS chunk fetched on first navigation. Suspense
// fallbacks show shimmer skeletons while the chunk downloads.
const HomeView = lazy(() =>
  import("@/components/quiz/home-view").then((m) => ({ default: m.HomeView })),
);
// V3 — public marketing landing (unauthenticated visitors) + the dedicated
// banks library + the post-signup onboarding wizard (all code-split).
const LandingView = lazy(() =>
  import("@/components/quiz/landing-view").then((m) => ({
    default: m.LandingView,
  })),
);
const BanksLibraryView = lazy(() =>
  import("@/components/quiz/banks-library-view").then((m) => ({
    default: m.BanksLibraryView,
  })),
);
const OnboardingWizard = lazy(() =>
  import("@/components/quiz/onboarding-wizard").then((m) => ({
    default: m.OnboardingWizard,
  })),
);
const BankDetailView = lazy(() =>
  import("@/components/quiz/bank-detail-view").then((m) => ({
    default: m.BankDetailView,
  })),
);
const ExamDetailView = lazy(() =>
  import("@/components/quiz/exam-detail-view").then((m) => ({
    default: m.ExamDetailView,
  })),
);
const SessionView = lazy(() =>
  import("@/components/quiz/session-view").then((m) => ({
    default: m.SessionView,
  })),
);
const ResultsView = lazy(() =>
  import("@/components/quiz/results-view").then((m) => ({
    default: m.ResultsView,
  })),
);
const DashboardView = lazy(() =>
  import("@/components/quiz/dashboard-view").then((m) => ({
    default: m.DashboardView,
  })),
);
const SocialView = lazy(() =>
  import("@/components/quiz/social-view").then((m) => ({
    default: m.SocialView,
  })),
);
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
import { InstallPrompt } from "@/components/quiz/install-prompt";
import { ErrorBoundary } from "@/components/quiz/error-boundary";
import { OnboardingTourContainer, restartOnboarding } from "@/components/quiz/onboarding-tour";
import { HelpButton } from "@/components/quiz/help-button";
import { PricingModal } from "@/components/quiz/pricing-modal";
import { ApiDocsView } from "@/components/quiz/api-docs-view";
// E4 — gamification bridge (registers quest-reward callback + refreshes
// quests/league/seasons stores on mount).
import { GamificationBridge } from "@/components/quiz/gamification-bridge";
// E6 — screen reader announcer + global error tracker.
import { SrAnnouncer } from "@/components/quiz/sr-announcer";
import { announcePageChange } from "@/lib/screen-reader";
import {
  installGlobalErrorTracker,
  captureError,
} from "@/lib/error-tracking";
import { LeagueBadge } from "@/components/quiz/league-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GraduationCap,
  LibraryBig,
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
  HelpCircle,
  Target,
  TreePalm,
  ShoppingBag,
  Coins,
  // FIX2 — added Menu icon for the mobile nav (Grid removed in FIX3 in favour of Compass).
  Menu,
  // FIX3 — Compass icon for the new "Explorer" dropdown trigger.
  Compass,
  // E5 — social feature icons:
  Mail,
  UserCheck,
  BookOpen,
  Radio,
  // E6 — pedagogy feature icons:
  FileText,
  CalendarCheck,
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
const StudyPlanView = lazy(() =>
  import("@/components/quiz/study-plan-view").then((m) => ({
    default: m.StudyPlanView,
  }))
);
// E4 — gamification views (lazy-loaded to keep the main bundle small).
const QuestsPanelFull = lazy(() =>
  import("@/components/quiz/quests-panel").then((m) => ({
    default: m.QuestsPanel,
  }))
);
const SkillTree = lazy(() =>
  import("@/components/quiz/skill-tree").then((m) => ({
    default: m.SkillTree,
  }))
);
const ShopView = lazy(() =>
  import("@/components/quiz/shop-view").then((m) => ({
    default: m.ShopView,
  }))
);
// E5 — social views (lazy-loaded to keep the main bundle small).
const MessagesView = lazy(() =>
  import("@/components/quiz/messages-view").then((m) => ({
    default: m.MessagesView,
  }))
);
const MentorshipView = lazy(() =>
  import("@/components/quiz/mentorship-view").then((m) => ({
    default: m.MentorshipView,
  }))
);
const WikiView = lazy(() =>
  import("@/components/quiz/wiki-view").then((m) => ({
    default: m.WikiView,
  }))
);
const LiveSessionsView = lazy(() =>
  import("@/components/quiz/live-sessions-view").then((m) => ({
    default: m.LiveSessionsView,
  }))
);
// E6 — pedagogy views (lazy-loaded to keep the main bundle small).
const OfficialExamView = lazy(() =>
  import("@/components/quiz/official-exam-view").then((m) => ({
    default: m.OfficialExamView,
  }))
);
const StudySheetView = lazy(() =>
  import("@/components/quiz/study-sheet-view").then((m) => ({
    default: m.StudySheetView,
  }))
);
const GuidedPath = lazy(() =>
  import("@/components/quiz/guided-path").then((m) => ({
    default: m.GuidedPath,
  }))
);

// Shared Suspense fallback for any lazy view.
// E6: upgraded to a shimmer skeleton (multiple lines + a card) so the
// loading state is more polished than a single grey box.
function ViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-8 w-1/3 rounded-md bg-muted" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/**
 * Small inline component that renders the user's QuizCoins balance.
 * Lives in the header next to the league badge. Subscribes to the prefs
 * store so it re-renders whenever the balance changes (after a quiz, after
 * claiming a quest, after buying a shop item).
 */
function CoinsBalance() {
  const coins = usePrefs((s) => s.quizCoins);
  return <>{coins}</>;
}

/**
 * FIX2 — MobileNavItem
 *
 * Single navigation entry inside the mobile slide-out Sheet. A full-width
 * button with a 44px minimum touch target, leading icon, label, and active
 * state styling. Clicking calls the supplied onClick (which usually navigates
 * and closes the sheet).
 */
interface MobileNavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  highlight?: "violet" | "amber" | "emerald" | "rose";
  onClick: () => void;
}
const MobileNavItem = ({ icon, label, active, highlight, onClick }: MobileNavItemProps) => {
  const highlightCls =
    highlight === "violet"
      ? "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300"
      : highlight === "amber"
        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
        : highlight === "emerald"
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
          : highlight === "rose"
            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
            : "";
  const activeCls = active
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "text-foreground hover:bg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        highlight ? highlightCls : activeCls
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

/**
 * FIX2 — MobileNavSection
 *
 * A small section heading used between groups of MobileNavItem entries
 * inside the mobile Sheet (mirrors the DropdownMenuLabel groups in the
 * desktop "Plus" dropdown).
 */
const MobileNavSection = ({ title }: { title: string }) => {
  return (
    <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
  );
}

/**
 * V4 — AppNavItem
 *
 * Desktop header nav entry with an animated gradient pill: the active item
 * wears a shared framer-motion pill (layoutId) that slides between items
 * with a spring. Hover gets a soft blue tint.
 */
const APP_NAV_SPRING = { type: "spring" as const, stiffness: 420, damping: 34 };
function AppNavItem({
  active,
  onClick,
  icon,
  label,
  testId,
}: {
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={testId}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
        active
          ? "text-white"
          : "text-muted-foreground hover:bg-blue-50 hover:text-foreground dark:hover:bg-white/5"
      }`}
    >
      {active && (
        <motion.span
          layoutId="app-nav-pill"
          className="animate-gradient-x absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 shadow-md shadow-blue-500/25"
          transition={APP_NAV_SPRING}
          aria-hidden="true"
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        <span className="hidden lg:inline">{label}</span>
      </span>
    </button>
  );
}

/* Tone maps for the Explorer mega-panel (V4). */
const EXPLORER_SECTION_TONES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
};

const EXPLORER_ITEM_TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 group-hover/item:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:group-hover/item:bg-blue-500/20",
  emerald:
    "bg-emerald-50 text-emerald-600 group-hover/item:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:group-hover/item:bg-emerald-500/20",
  orange:
    "bg-orange-50 text-orange-600 group-hover/item:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:group-hover/item:bg-orange-500/20",
  violet:
    "bg-violet-50 text-violet-600 group-hover/item:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:group-hover/item:bg-violet-500/20",
  rose: "bg-rose-50 text-rose-600 group-hover/item:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:group-hover/item:bg-rose-500/20",
  sky: "bg-sky-50 text-sky-600 group-hover/item:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:group-hover/item:bg-sky-500/20",
};

/**
 * V4 — ExplorerSection / ExplorerItem
 *
 * Building blocks of the "Explorer" mega dropdown: a bordered section card
 * with a coloured header chip, and a compact item with a coloured icon chip
 * that deepens on hover and nudges the label.
 */
function ExplorerSection({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof EXPLORER_SECTION_TONES;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background/60 p-2.5">
      <p className="mb-1.5 flex items-center gap-2 px-1">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg ${EXPLORER_SECTION_TONES[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ExplorerItem({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: keyof typeof EXPLORER_ITEM_TONES;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className="group/item gap-2.5 rounded-lg px-2 py-1.5 text-sm"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${EXPLORER_ITEM_TONES[tone]}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="truncate transition-transform duration-200 group-hover/item:translate-x-0.5">
        {label}
      </span>
    </DropdownMenuItem>
  );
}

export default function Home() {
  const {
    view,
    goHome,
    openBanks,
    openDashboard,
    openAbout,
    openAdmin,
    openSocial,
    openLeaderboard,
    openAchievements,
    openForum,
    openCompetition,
    openSpacedRepetition,
    openGroups,
    openEvents,
    openBlog,
    openStudyPlan,
    openQuests,
    openSkillTree,
    openShop,
    openMessages,
    openMentorship,
    openWiki,
    openLiveSessions,
    openOfficialExam,
    openStudySheet,
    openGuidedPath,
    startSession,
  } = useQuizStore();
  const { t } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // FIX2 — mobile slide-out navigation sheet (< md only). Holds ALL nav items
  // so the header itself can show just logo + hamburger on small screens.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
  // V3 — which tab the auth dialog should open on (driven by landing CTAs).
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const openAuth = useCallback((mode: "login" | "signup" = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

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
  const [apiDocsOpen, setApiDocsOpen] = useState(false);

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

  // Sticky-header shadow on scroll (E3). Toggles a CSS class that adds a
  // subtle box-shadow once the user scrolls past 4px, giving the header a
  // "lifted" premium feel without breaking the transparent glass at rest.
  const [headerScrolled, setHeaderScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // E6.6 — install the global error tracker on mount (window.onerror +
  // unhandledrejection). Idempotent — safe to call once.
  useEffect(() => {
    const cleanup = installGlobalErrorTracker();
    return cleanup;
  }, []);

  // E6.9 — announce the view change to screen reader users.
  useEffect(() => {
    announcePageChange(view);
  }, [view]);

  // E6.6 — wrap the unauthenticated-state effect below so any future
  // top-level error is reported. (Currently a no-op but kept here as
  // a hook point for future global try/catch wrappers.)
  useEffect(() => {
    // Surface any prior client-side errors (already in localStorage) to
    // the admin badge on first load — handled by the admin view itself.
    // This effect is intentionally a no-op captureError call so the
    // tracker module initialises (loads the buffer from localStorage).
    void captureError;
  }, []);

  // Show loading while session is being checked
  if (status === "loading" && !splashDone) {
    return <SplashScreen />;
  }

  // If not authenticated, show the V3 marketing landing page
  if (status === "unauthenticated") {
    return (
      <ErrorBoundary>
        <LandingView onAuthOpen={openAuth} />
        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          initialMode={authMode}
          initialReferralCode={prefilledReferral ?? undefined}
        />
      </ErrorBoundary>
    );
  }

  // Loading state while session loads
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/40 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50/40 via-background to-background">
      <SplashScreen />
      <PreferencesApplier />
      {/* E4 — wires quest rewards into the prefs store + refreshes the
          quests / league / seasons stores on mount + on prefs changes. */}
      <GamificationBridge />
      {/* E6.9 — invisible aria-live regions for screen reader announcements. */}
      <SrAnnouncer />

      {/* Offline banner */}
      {!isOnline && (
        <div className="animate-gradient-x flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          <WifiOff className="h-4 w-4" />
          Mode hors ligne. Synchronisation automatique à la reconnexion.
        </div>
      )}

      {/* Header — glass bar with gradient accent + animated active pill (V4) */}
      <header
        className={`glass-strong sticky top-0 z-40 border-b border-blue-100/60 transition-shadow dark:border-white/5 ${
          headerScrolled ? "header-scrolled" : ""
        }`}
      >
        <div
          className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-orange-400"
          aria-hidden="true"
        />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          {/* Logo + brand */}
          <button
            onClick={goHome}
            className="group flex items-center gap-2.5 font-bold transition-opacity hover:opacity-80"
          >
            <img
              src="/logo-quizexam.svg"
              alt="Logo QuizExam BF"
              className="h-10 w-10 rounded-xl shadow-md shadow-blue-500/15 transition-transform duration-500 group-hover:rotate-[10deg] group-hover:scale-105"
              width={40}
              height={40}
            />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-base">
                QuizExam <span className="text-gradient-brand">BF</span>
              </span>
              <span className="text-[10px] font-normal text-muted-foreground">
                Préparation Concours · 2026
              </span>
            </span>
          </button>

          {/* Navigation + actions */}
          <div className="flex items-center gap-1.5">
            {/* FIX2 — Mobile hamburger button. Opens a slide-out Sheet that
                holds ALL navigation items so the header can stay minimal
                (just logo + hamburger + user menu) on small screens. */}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <nav className="hidden items-center gap-0.5 md:flex">
              {/* Primary nav — animated pill (V4): the active item wears a
                  sliding gradient pill shared across items via layoutId. */}
              <AppNavItem
                active={view === "home"}
                onClick={goHome}
                icon={<House className="h-4 w-4" />}
                label={t("nav.home")}
                testId="home-nav"
              />
              <AppNavItem
                active={view === "dashboard"}
                onClick={openDashboard}
                icon={<LayoutDashboard className="h-4 w-4" />}
                label={t("nav.dashboard")}
                testId="dashboard-nav"
              />
              <AppNavItem
                active={view === "bank-list"}
                onClick={openBanks}
                icon={<LibraryBig className="h-4 w-4" />}
                label="Banques"
                testId="banks-nav"
              />
              {/* AI custom exam */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 pulse-glow"
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

              {/* Classement */}
              <AppNavItem
                active={view === "leaderboard"}
                onClick={openLeaderboard}
                icon={<Trophy className="h-4 w-4" />}
                label="Classement"
              />

              {/* Forum */}
              <AppNavItem
                active={view === "forum"}
                onClick={openForum}
                icon={<MessagesSquare className="h-4 w-4" />}
                label="Forum"
 />

              {/* FIX3 — Secondary nav grouped under an "Explorer" dropdown.
                  Replaces the old "Plus" dropdown with a more creative
                  "Explorer" button (Compass icon, emerald-to-teal gradient).
                  The dropdown is wider (w-72) and groups items by 4 themed
                  categories with emoji labels:
                    📚 APPRENTISSAGE — Forum, Wiki, Parcours IA, Examen officiel,
                       Fiches de révision, Parcours 30 jours, Révision espacée
                    🏆 PROGRESSION — Classement, Succès, Quêtes, Arbre compétences,
                       Boutique, Ligues
                    👥 COMMUNAUTÉ — Communauté, Groupes, Messagerie, Mentorat,
                       Sessions live, Blog, Compétition
                    ℹ️ AUTRES — À propos, Événements */}
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
                      view === "study-plan" ||
                      view === "quests" ||
                      view === "skill-tree" ||
                      view === "shop" ||
                      view === "messages" ||
                      view === "mentorship" ||
                      view === "wiki" ||
                      view === "live-sessions" ||
                      view === "official-exam" ||
                      view === "study-sheet" ||
                      view === "guided-path" ||
                      view === "about"
                        ? "secondary"
                        : "ghost"
                    }
                    size="sm"
                    className="btn-shine animate-gradient-x gap-1.5 bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-md shadow-blue-500/25 hover:opacity-95"
                    data-tour="more-nav"
                    aria-label="Explorer la plateforme"
                  >
                    <Compass className="h-4 w-4" />
                    <span className="hidden sm:inline">Explorer</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[460px] p-3"
                  sideOffset={10}
                >
                  {/* V4 — mega panel: 4 themed sections in a 2-column grid,
                      each item with a coloured icon chip. */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <ExplorerSection title="Apprentissage" icon={BookOpen} tone="blue">
                      <ExplorerItem
                        icon={<MessagesSquare className="h-4 w-4" />}
                        label="Forum"
                        tone="blue"
                        onClick={openForum}
                      />
                      <ExplorerItem
                        icon={<BookOpen className="h-4 w-4" />}
                        label="Wiki"
                        tone="emerald"
                        onClick={openWiki}
                      />
                      <ExplorerItem
                        icon={<Sparkles className="h-4 w-4" />}
                        label="Parcours IA"
                        tone="violet"
                        onClick={openStudyPlan}
                      />
                      <ExplorerItem
                        icon={<GraduationCap className="h-4 w-4" />}
                        label="Examen officiel"
                        tone="violet"
                        onClick={openOfficialExam}
                      />
                      <ExplorerItem
                        icon={<FileText className="h-4 w-4" />}
                        label="Fiches de révision"
                        tone="emerald"
                        onClick={openStudySheet}
                      />
                      <ExplorerItem
                        icon={<CalendarCheck className="h-4 w-4" />}
                        label="Parcours 30 jours"
                        tone="orange"
                        onClick={openGuidedPath}
                      />
                      <ExplorerItem
                        icon={<Brain className="h-4 w-4" />}
                        label="Révision espacée"
                        tone="sky"
                        onClick={openSpacedRepetition}
                      />
                    </ExplorerSection>

                    <ExplorerSection title="Progression" icon={Trophy} tone="orange">
                      <ExplorerItem
                        icon={<Trophy className="h-4 w-4" />}
                        label="Classement"
                        tone="orange"
                        onClick={openLeaderboard}
                      />
                      <ExplorerItem
                        icon={<Award className="h-4 w-4" />}
                        label="Succès"
                        tone="orange"
                        onClick={openAchievements}
                      />
                      <ExplorerItem
                        icon={<Target className="h-4 w-4" />}
                        label="Quêtes"
                        tone="orange"
                        onClick={openQuests}
                      />
                      <ExplorerItem
                        icon={<TreePalm className="h-4 w-4" />}
                        label="Arbre de compétences"
                        tone="emerald"
                        onClick={openSkillTree}
                      />
                      <ExplorerItem
                        icon={<ShoppingBag className="h-4 w-4" />}
                        label="Boutique"
                        tone="violet"
                        onClick={openShop}
                      />
                      <ExplorerItem
                        icon={<Crown className="h-4 w-4" />}
                        label="Ligues"
                        tone="orange"
                        onClick={openLeaderboard}
                      />
                    </ExplorerSection>

                    <ExplorerSection title="Communauté" icon={Users} tone="emerald">
                      <ExplorerItem
                        icon={<Users className="h-4 w-4" />}
                        label="Communauté"
                        tone="emerald"
                        onClick={openSocial}
                      />
                      <ExplorerItem
                        icon={<UsersRound className="h-4 w-4" />}
                        label="Groupes"
                        tone="emerald"
                        onClick={openGroups}
                      />
                      <ExplorerItem
                        icon={<Mail className="h-4 w-4" />}
                        label="Messagerie"
                        tone="violet"
                        onClick={openMessages}
                      />
                      <ExplorerItem
                        icon={<UserCheck className="h-4 w-4" />}
                        label="Mentorat"
                        tone="emerald"
                        onClick={openMentorship}
                      />
                      <ExplorerItem
                        icon={<Radio className="h-4 w-4" />}
                        label="Sessions live"
                        tone="rose"
                        onClick={openLiveSessions}
                      />
                      <ExplorerItem
                        icon={<Newspaper className="h-4 w-4" />}
                        label="Blog"
                        tone="blue"
                        onClick={openBlog}
                      />
                      <ExplorerItem
                        icon={<Swords className="h-4 w-4" />}
                        label="Compétition"
                        tone="rose"
                        onClick={openCompetition}
                      />
                    </ExplorerSection>

                    <ExplorerSection title="Autres" icon={Info} tone="violet">
                      <ExplorerItem
                        icon={<Info className="h-4 w-4" />}
                        label={t("nav.about")}
                        tone="violet"
                        onClick={openAbout}
                      />
                      <ExplorerItem
                        icon={<CalendarDays className="h-4 w-4" />}
                        label="Événements"
                        tone="violet"
                        onClick={openEvents}
                      />
                    </ExplorerSection>
                  </div>
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

            <div className="mx-1 hidden h-6 w-px bg-border md:block" />

            {/* E4 — League badge (compact) + QuizCoins balance.
                Click the league badge → opens the leaderboard view.
                Click the coins balance → opens the shop.
                FIX2: hidden on < md to keep the mobile header minimal
                (the same controls are available inside the mobile Sheet). */}
            <div className="hidden items-center gap-1.5 md:flex">
              <LeagueBadge onClick={openLeaderboard} />
              <button
                onClick={openShop}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-all hover:scale-105 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                aria-label="QuizCoins — ouvrir la boutique"
              >
                <Coins className="h-3.5 w-3.5" />
                <span className="tabular-nums">
                  <CoinsBalance />
                </span>
              </button>
            </div>

            {/* Search button — FIX2: hidden on < md (also in the mobile Sheet). */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-9 w-9 md:inline-flex"
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

            {/* Language switcher — already hidden on < sm */}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {/* Dark mode toggle — FIX2: hidden on < md (also in the mobile Sheet). */}
            <div className="hidden md:block">
              <DarkModeToggle />
            </div>

            {/* Notifications — FIX2: hidden on < md (also in the mobile Sheet). */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative hidden h-9 w-9 md:inline-flex"
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

            {/* Help - restart onboarding tour — FIX2: hidden on < md (also in the mobile Sheet). */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-9 w-9 md:inline-flex"
                    onClick={() => restartOnboarding()}
                    aria-label="Aide / Visite guidée"
                  >
                    <HelpCircle className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Revoir la visite guidée</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Settings — FIX2: hidden on < md (also in the mobile Sheet). */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-9 w-9 md:inline-flex"
                    onClick={() => setSettingsOpen(true)}
                    aria-label={t("nav.settings")}
                  >
                    <Settings className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nav.settings")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* User menu — always visible (auth state is essential). */}
            <UserMenuButton />

            {/* Upgrade to Premium — only for authenticated non-admin users.
                FIX2: hidden on < md (also in the mobile Sheet). */}
            {status === "authenticated" && !isAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 md:inline-flex"
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

        {/* FIX2 — Mobile slide-out navigation Sheet (< md only).
            Replaces the old horizontal-scroll mobile nav row + duplicate
            "Plus" dropdown. The Sheet holds ALL navigation items grouped by
            category, with 44px-min touch targets and a scrollable body. */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="right"
            className="flex w-[85vw] max-w-sm flex-col gap-0 p-0"
          >
            {/* V4 — brand gradient accent strip */}
            <div
              className="h-1 w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-orange-400"
              aria-hidden="true"
            />
            <SheetHeader className="border-b p-4">
              <SheetTitle className="flex items-center gap-2">
                <img
                  src="/logo-quizexam.svg"
                  alt=""
                  className="h-8 w-8 rounded-lg"
                  width={32}
                  height={32}
                />
                <span>QuizExam BF</span>
              </SheetTitle>
              <SheetDescription className="sr-only">
                Navigation principale
              </SheetDescription>
            </SheetHeader>

            {/* Scrollable body — all nav items, grouped. */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* Primary actions */}
              <div className="space-y-1">
                <MobileNavItem
                  icon={<House className="h-5 w-5" />}
                  label="Accueil"
                  active={view === "home"}
                  onClick={() => {
                    goHome();
                    setMobileNavOpen(false);
                  }}
                />
                <MobileNavItem
                  icon={<LayoutDashboard className="h-5 w-5" />}
                  label="Tableau de bord"
                  active={view === "dashboard"}
                  onClick={() => {
                    openDashboard();
                    setMobileNavOpen(false);
                  }}
                />
                <MobileNavItem
                  icon={<LibraryBig className="h-5 w-5" />}
                  label="Banques de questions"
                  active={view === "bank-list"}
                  onClick={() => {
                    openBanks();
                    setMobileNavOpen(false);
                  }}
                />
                <MobileNavItem
                  icon={<Sparkles className="h-5 w-5 text-violet-600" />}
                  label="Examen IA"
                  highlight="violet"
                  onClick={() => {
                    setCustomExamOpen(true);
                    setMobileNavOpen(false);
                  }}
                />
              </div>

              {/* Social */}
              <MobileNavSection title="👥 Communauté" />
              <div className="space-y-1">
                <MobileNavItem icon={<Users className="h-5 w-5" />} label="Communauté" active={view === "social"} onClick={() => { openSocial(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<UsersRound className="h-5 w-5" />} label="Groupes" active={view === "groups"} onClick={() => { openGroups(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Mail className="h-5 w-5 text-violet-600" />} label="Messagerie" active={view === "messages"} onClick={() => { openMessages(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<UserCheck className="h-5 w-5 text-emerald-600" />} label="Mentorat" active={view === "mentorship"} onClick={() => { openMentorship(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Radio className="h-5 w-5 text-rose-600" />} label="Sessions live" active={view === "live-sessions"} onClick={() => { openLiveSessions(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Newspaper className="h-5 w-5" />} label="Blog" active={view === "blog"} onClick={() => { openBlog(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Swords className="h-5 w-5 text-rose-600" />} label="Compétition" active={view === "competition"} onClick={() => { openCompetition(); setMobileNavOpen(false); }} />
              </div>

              {/* Apprentissage */}
              <MobileNavSection title="📚 Apprentissage" />
              <div className="space-y-1">
                <MobileNavItem icon={<MessagesSquare className="h-5 w-5" />} label="Forum" active={view === "forum"} onClick={() => { openForum(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<BookOpen className="h-5 w-5 text-emerald-600" />} label="Wiki" active={view === "wiki"} onClick={() => { openWiki(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Sparkles className="h-5 w-5 text-violet-600" />} label="Parcours IA" active={view === "study-plan"} onClick={() => { openStudyPlan(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<GraduationCap className="h-5 w-5 text-violet-600" />} label="Examen officiel" active={view === "official-exam"} onClick={() => { openOfficialExam(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<FileText className="h-5 w-5 text-emerald-600" />} label="Fiches de révision" active={view === "study-sheet"} onClick={() => { openStudySheet(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<CalendarCheck className="h-5 w-5 text-amber-600" />} label="Parcours 30 jours" active={view === "guided-path"} onClick={() => { openGuidedPath(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Brain className="h-5 w-5" />} label="Révision espacée" active={view === "spaced-repetition"} onClick={() => { openSpacedRepetition(); setMobileNavOpen(false); }} />
              </div>

              {/* Progression */}
              <MobileNavSection title="🏆 Progression" />
              <div className="space-y-1">
                <MobileNavItem icon={<Trophy className="h-5 w-5" />} label="Classement" active={view === "leaderboard"} onClick={() => { openLeaderboard(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Award className="h-5 w-5" />} label="Succès" active={view === "achievements"} onClick={() => { openAchievements(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Target className="h-5 w-5 text-amber-600" />} label="Quêtes" active={view === "quests"} onClick={() => { openQuests(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<TreePalm className="h-5 w-5 text-emerald-600" />} label="Arbre de compétences" active={view === "skill-tree"} onClick={() => { openSkillTree(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<ShoppingBag className="h-5 w-5 text-violet-600" />} label="Boutique" active={view === "shop"} onClick={() => { openShop(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<Crown className="h-5 w-5 text-amber-600" />} label="Ligues" active={view === "leaderboard"} onClick={() => { openLeaderboard(); setMobileNavOpen(false); }} />
              </div>

              {/* Autres */}
              <MobileNavSection title="ℹ️ Autres" />
              <div className="space-y-1">
                <MobileNavItem icon={<Info className="h-5 w-5" />} label={t("nav.about")} active={view === "about"} onClick={() => { openAbout(); setMobileNavOpen(false); }} />
                <MobileNavItem icon={<CalendarDays className="h-5 w-5" />} label="Événements" active={view === "events"} onClick={() => { openEvents(); setMobileNavOpen(false); }} />
              </div>

              {/* Admin (admin only) */}
              {isAdmin && (
                <>
                  <MobileNavSection title="Administration" />
                  <div className="space-y-1">
                    <MobileNavItem
                      icon={<ShieldCheck className="h-5 w-5 text-amber-600" />}
                      label="Panneau d'administration"
                      active={view === "admin"}
                      onClick={() => {
                        openAdmin();
                        setMobileNavOpen(false);
                      }}
                    />
                  </div>
                </>
              )}

              {/* Utilities (search, settings, help, premium) */}
              <MobileNavSection title="Réglages" />
              <div className="space-y-1">
                <MobileNavItem
                  icon={<Search className="h-5 w-5" />}
                  label="Rechercher"
                  onClick={() => {
                    setSearchOpen(true);
                    setMobileNavOpen(false);
                  }}
                />
                <MobileNavItem
                  icon={<Bell className="h-5 w-5" />}
                  label={`Notifications${unreadCount > 0 ? ` (${unreadCount > 9 ? "9+" : unreadCount})` : ""}`}
                  onClick={() => {
                    setNotifOpen(true);
                    setMobileNavOpen(false);
                  }}
                />
                <MobileNavItem
                  icon={<Settings className="h-5 w-5" />}
                  label={t("nav.settings")}
                  onClick={() => {
                    setSettingsOpen(true);
                    setMobileNavOpen(false);
                  }}
                />
                <MobileNavItem
                  icon={<HelpCircle className="h-5 w-5" />}
                  label="Aide / Visite guidée"
                  onClick={() => {
                    restartOnboarding();
                    setMobileNavOpen(false);
                  }}
                />
                {status === "authenticated" && !isAdmin && (
                  <MobileNavItem
                    icon={<Crown className="h-5 w-5 text-amber-600" />}
                    label="Passer à Premium"
                    highlight="amber"
                    onClick={() => {
                      setPricingOpen(true);
                      setMobileNavOpen(false);
                    }}
                  />
                )}
              </div>

              {/* Compact row of small toggles: dark mode + language */}
              <div className="mt-4 flex items-center gap-2 border-t pt-3">
                <DarkModeToggle />
                <LanguageSwitcher />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main content */}
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"
        data-tour="home"
      >
        <ErrorBoundary>
          {/* E6: ALL views are now lazy-loaded and wrapped in Suspense.
              Each view ships in its own JS chunk, fetched on first
              navigation. The shimmer-skeleton fallback (ViewSkeleton)
              shows while the chunk downloads. */}
          <Suspense fallback={<ViewSkeleton />}>
            {view === "home" && <HomeView onOpenCustomExam={() => setCustomExamOpen(true)} />}
            {view === "bank-list" && <BanksLibraryView />}
            {view === "bank-detail" && <BankDetailView />}
            {view === "exam-detail" && <ExamDetailView />}
            {view === "session" && <SessionView />}
            {view === "results" && <ResultsView />}
            {view === "dashboard" && <DashboardView />}
            {view === "social" && <SocialView />}

            {/* Secondary views */}
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
            {view === "study-plan" && <StudyPlanView />}
            {/* E4 — gamification views */}
            {view === "quests" && <QuestsPanelFull />}
            {view === "skill-tree" && <SkillTree />}
            {view === "shop" && <ShopView />}
            {/* E5 — social views */}
            {view === "messages" && <MessagesView />}
            {view === "mentorship" && <MentorshipView />}
            {view === "wiki" && <WikiView />}
            {view === "live-sessions" && <LiveSessionsView />}
            {/* E6 — pedagogy views */}
            {view === "official-exam" && <OfficialExamView />}
            {view === "study-sheet" && <StudySheetView />}
            {view === "guided-path" && <GuidedPath />}
          </Suspense>
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
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                © 2026
              </span>
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
              onClick={() => setApiDocsOpen(true)}
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

      {/* Pricing modal (freemium upgrade) */}
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />

      {/* API documentation dialog */}
      <ApiDocsView open={apiDocsOpen} onOpenChange={setApiDocsOpen} />

      {/* Real-time floating notifications */}
      <RealtimeNotification />

      {/* PWA install banner (mobile / non-installed only) */}
      <InstallPrompt />

      {/* Chatbot IA flottant */}
      <Chatbot />

      {/* Aide contextuelle (bouton flottant en bas à gauche) */}
      <HelpButton />

      {/* Tour guidé au premier login */}
      <OnboardingTourContainer isAuthenticated={status === "authenticated"} />

      {/* V3 — onboarding wizard post-inscription (une seule fois) */}
      <OnboardingWizard active={status === "authenticated"} />
    </div>
  );
}
