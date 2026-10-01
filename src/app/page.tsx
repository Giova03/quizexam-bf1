"use client";

import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
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
import { UserMenuButton, AuthDialog, ResetPasswordDialog } from "@/components/quiz/auth-dialog";
import { Chatbot } from "@/components/quiz/chatbot";
import { SplashScreen } from "@/components/quiz/splash-screen";
import { InstallPrompt } from "@/components/quiz/install-prompt";
import { LegalConsentBanner } from "@/components/quiz/legal-consent-banner";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  UsersRound,
  CalendarDays,
  Newspaper,
  HelpCircle,
  Target,
  TreePalm,
  ShoppingBag,
  Coins,
  // V7 — Bento mobile nav premium + tour de contrôle admin.
  ChevronRight,
  Radar,
  RadioTower,
  Zap,
  Flame,
  Signal,
  Crosshair,
  LogIn,
  LogOut,
  Code2,
  X,
  // FIX2 — added Menu icon for the mobile nav (Grid removed in FIX3 in favour of Compass).
  Menu,
  // V5 — overflow menu icon.
  MoreHorizontal,
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

/* ============================================================================
 * V7 — SIDEBAR PREMIUM : la barre latérale mobile devient un tableau de bord
 * de navigation animé. Trois couches d'effets :
 *
 *   1. ENTRÉE EN CASCADE : chaque tuile descend en ressort avec un délai
 *      indexé (cascade rapide) à chaque ouverture du panneau.
 *   2. SPOTLIGHT INTERACTIF : un halo lumineux suit le doigt/curseur sur
 *      chaque tuile (variables CSS --spot-x/--spot-y).
 *   3. INDICATEUR ACTIF PARTAGÉ : un anneau framer-motion (layoutId) glisse
 *      d'une tuile active à l'autre avec un ressort.
 *
 * Les actions restent EXACTEMENT les mêmes handlers du quiz-store — seule la
 * présentation change. L'espace d'administration est isolé dans le bouton
 * flottant « Tour de contrôle » (AdminControlTower) : un radar animé qui
 * déploie ses sondes autour d'un écran radar orbital.
 * ========================================================================== */

/** Tonalités des tuiles Bento : dégradé du chip, lueur, spotlight, bande. */
const BENTO_TONES: Record<
  string,
  { chip: string; grad: string; wideBg: string; spot: string; shadow: string }
> = {
  blue: {
    chip: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    grad: "from-blue-500 to-blue-600",
    wideBg: "bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 shadow-lg shadow-blue-500/25",
    spot: "rgba(59,130,246,0.18)",
    shadow: "shadow-blue-500/40",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    grad: "from-emerald-500 to-teal-500",
    wideBg: "bg-gradient-to-br from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/25",
    spot: "rgba(16,185,129,0.18)",
    shadow: "shadow-emerald-500/40",
  },
  orange: {
    chip: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    grad: "from-orange-500 to-amber-500",
    wideBg: "bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-orange-500/25",
    spot: "rgba(249,115,22,0.18)",
    shadow: "shadow-orange-500/40",
  },
  violet: {
    chip: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    grad: "from-violet-500 to-purple-500",
    wideBg: "bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/25",
    spot: "rgba(139,92,246,0.18)",
    shadow: "shadow-violet-500/40",
  },
  rose: {
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    grad: "from-rose-500 to-pink-500",
    wideBg: "bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/25",
    spot: "rgba(244,63,94,0.18)",
    shadow: "shadow-rose-500/40",
  },
  sky: {
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    grad: "from-sky-500 to-blue-500",
    wideBg: "bg-gradient-to-br from-sky-600 to-blue-500 shadow-lg shadow-sky-500/25",
    spot: "rgba(14,165,233,0.18)",
    shadow: "shadow-sky-500/40",
  },
  amber: {
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    grad: "from-amber-500 to-orange-500",
    wideBg: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25",
    spot: "rgba(245,158,11,0.18)",
    shadow: "shadow-amber-500/40",
  },
};

type BentoTone = keyof typeof BENTO_TONES;

/**
 * V7 — BentoTile : tuile premium de la grille Bento.
 *
 * - `index` pilote le délai d'entrée (cascade descendante à l'ouverture).
 * - Le halo « spotlight » suit le pointeur (CSS vars mises à jour au vol).
 * - Le chip d'icône prend un dégradé plein et pivote légèrement au survol.
 * - `active` affiche un anneau partagé (layoutId) qui glisse entre tuiles.
 * - `wide` (2 colonnes) : tuile majeure dégradée avec balayage lumineux.
 */
function BentoTile({
  icon,
  label,
  desc,
  tone = "blue",
  active,
  wide,
  index = 0,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  desc?: string;
  tone?: BentoTone;
  active?: boolean;
  wide?: boolean;
  index?: number;
  onClick: () => void;
}) {
  const toneCls = BENTO_TONES[tone] ?? BENTO_TONES.blue;
  const entrance = {
    initial: { opacity: 0, y: 18, scale: 0.94 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring" as const, stiffness: 380, damping: 26, delay: 0.03 * index },
  };

  const trackSpotlight = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  if (wide) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        onPointerMove={trackSpotlight}
        whileTap={{ scale: 0.97 }}
        {...entrance}
        className={`group relative col-span-2 flex items-center gap-3 overflow-hidden rounded-2xl p-3.5 text-left text-white ${toneCls.wideBg}`}
      >
        {/* Balayage lumineux périodique (shine sweep) */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          initial={{ x: "-140%" }}
          animate={{ x: "460%" }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.6, ease: "easeInOut" }}
        />
        {/* Lueurs décoratives */}
        <span
          aria-hidden="true"
          className="absolute -right-7 -top-9 h-24 w-24 rounded-full bg-white/20 blur-xl transition-transform duration-500 group-hover:scale-125"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-10 -left-6 h-20 w-20 rounded-full bg-white/10 blur-lg"
        />
        {/* Spotlight */}
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            backgroundImage: `radial-gradient(150px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,0.28), transparent 70%)`,
          }}
        />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          {icon}
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold">{label}</span>
          {desc && <span className="block truncate text-[11px] text-white/85">{desc}</span>}
        </span>
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-white/25">
          <ChevronRight className="h-4 w-4" />
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      onPointerMove={trackSpotlight}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.93 }}
      {...entrance}
      className={`group relative flex min-h-[76px] flex-col items-start justify-between gap-2.5 overflow-hidden rounded-2xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-200 ${
        active
          ? "border-emerald-300 bg-emerald-50/80 shadow-sm shadow-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-950/30"
          : "border-border/70 bg-card/90 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 dark:border-white/5 dark:hover:border-blue-500/30"
      }`}
    >
      {/* Halo spotlight suivant le pointeur */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          backgroundImage: `radial-gradient(130px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${toneCls.spot}, transparent 70%)`,
        }}
      />
      {/* Anneau actif partagé : glisse d'une tuile à l'autre (layoutId) */}
      {active && (
        <motion.span
          layoutId="bento-active-ring"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-emerald-400/70"
          aria-hidden="true"
        />
      )}
      <span
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 ${toneCls.grad} ${toneCls.shadow}`}
      >
        {icon}
      </span>
      <span className="relative line-clamp-2 text-xs font-semibold leading-tight text-foreground">
        {label}
      </span>
      {active && (
        <span
          className="absolute right-2.5 top-2.5 flex h-2 w-2"
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
    </motion.button>
  );
}

/**
 * V7 — BentoSectionLabel : titre de section avec filet dégradé.
 */
const BentoSectionLabel = ({
  title,
  icon: Icon,
  index = 0,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  index?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -14 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay: 0.028 * index, ease: "easeOut" }}
    className="mb-2 mt-5 flex items-center gap-2 px-1"
  >
    <span
      className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-emerald-400"
      aria-hidden="true"
    />
    {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {title}
    </p>
    <span
      className="ml-1 h-px flex-1 bg-gradient-to-r from-border to-transparent"
      aria-hidden="true"
    />
  </motion.div>
);

/**
 * V7 — SidebarProfileCard : carte d'identité en haut du menu mobile.
 * Affiche l'avatar, le nom, le rôle et deux compteurs (pièces, réponses).
 * Pour un visiteur non connecté, propose un CTA de connexion (même
 * AuthDialog qu'avant — aucune nouvelle logique d'authentification).
 * V9 — bouton « Se déconnecter » toujours visible pour l'utilisateur
 * connecté (demande explicite : il doit être immédiatement trouvable).
 */
function SidebarProfileCard({
  name,
  email,
  isAdmin,
  coins,
  answers,
  onLogin,
  onLogout,
}: {
  name?: string | null;
  email?: string | null;
  isAdmin: boolean;
  coins: number;
  answers: number;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();

  if (!name && !email) {
    return (
      <motion.button
        type="button"
        onClick={onLogin}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        whileTap={{ scale: 0.98 }}
        className="group flex w-full items-center gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-3 text-left dark:border-blue-500/20 dark:from-blue-950/40 dark:via-card dark:to-emerald-950/30"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-md shadow-blue-500/25 transition-transform duration-300 group-hover:scale-105">
          <LogIn className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">
            {t("sidebar.profile.guest")}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t("sidebar.profile.signin")}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 p-[1.5px] shadow-md shadow-blue-500/15"
    >
      <div className="rounded-[calc(1rem-1px)] bg-card p-3">
        <div className="flex items-center gap-3">
          <span
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md ${
              isAdmin
                ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/25"
                : "bg-gradient-to-br from-blue-500 to-emerald-500 shadow-blue-500/25"
            }`}
          >
            {initial}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-400"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-bold text-foreground">
              {name}
              {isAdmin && (
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  ADMIN
                </span>
              )}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <span className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Coins className="h-3 w-3" />
            {coins.toLocaleString("fr-FR")}
            <span className="font-normal opacity-70">{t("sidebar.stat.coins")}</span>
          </span>
          <span className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <Zap className="h-3 w-3" />
            {answers.toLocaleString("fr-FR")}
            <span className="font-normal opacity-70">{t("sidebar.stat.answers")}</span>
          </span>
        </div>
        {/* V9 — Déconnexion : bouton dédié, toujours visible, action directe. */}
        <motion.button
          type="button"
          onClick={onLogout}
          whileTap={{ scale: 0.98 }}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50/70 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:border-rose-500/25 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/60"
          aria-label={t("sidebar.profile.logout")}
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("sidebar.profile.logout")}
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * V7 — AdminControlTower : bouton flottant « Tour de contrôle ».
 *
 * État fermé : un émetteur radar (RadioTower) ceint d'un anneau-sweep conique
 * en rotation continue et d'un halo ping.
 *
 * État ouvert : l'intérieur du panneau se transforme en salle de contrôle —
 * écran radar (anneaux concentriques + faisceau rotatif + réticule), noyau
 * central pulsant, et les 5 sondes d'administration disposées en orbite,
 * reliées au noyau par des lignes SVG qui se dessinent (pathLength).
 * Chaque sonde conserve EXACTEMENT l'action qu'elle avait dans l'ancien
 * menu radial (openAdmin / openSearch / openNotifications / openSettings /
 * openHelp), déclenchée au clic puis refermée (onAfterAction).
 */
function AdminControlTower({
  openAdmin,
  openSearch,
  openNotifications,
  openSettings,
  openHelp,
  unreadCount,
  onAfterAction,
}: {
  openAdmin: () => void;
  openSearch: () => void;
  openNotifications: () => void;
  openSettings: () => void;
  openHelp: () => void;
  unreadCount: number;
  onAfterAction: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  /* V9 — sonde ciblée (réticule de visée) + télémétrie animée du radar. */
  const [target, setTarget] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState({ az: 214.6, el: 42.1 });

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setTelemetry((prev) => ({
        az: (prev.az + 7.3 + Math.random() * 5) % 360,
        el: 30 + Math.random() * 55,
      }));
    }, 900);
    return () => window.clearInterval(id);
  }, [open]);

  // Sondes en orbite : angles répartis uniformément (72° d'écart, départ au
  // sommet). 90° = haut, sens antihoraire, coordonnées écran (y inversé).
  const items = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      label: t("nav.admin"),
      angle: 90,
      chip: "from-amber-500 to-orange-600",
      shadow: "shadow-orange-500/40",
      onClick: openAdmin,
    },
    {
      icon: <Search className="h-5 w-5" />,
      label: t("nav.search"),
      angle: 162,
      chip: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/40",
      onClick: openSearch,
    },
    {
      icon: <Bell className="h-5 w-5" />,
      label: t("nav.notifications"),
      angle: 234,
      chip: "from-rose-500 to-pink-600",
      shadow: "shadow-rose-500/40",
      onClick: openNotifications,
      badge: unreadCount,
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: t("nav.settings"),
      angle: 306,
      chip: "from-sky-500 to-cyan-600",
      shadow: "shadow-sky-500/40",
      onClick: openSettings,
    },
    {
      icon: <HelpCircle className="h-5 w-5" />,
      label: t("nav.help"),
      angle: 18,
      chip: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/40",
      onClick: openHelp,
    },
  ];

  const RADIUS = 118;

  // Échap referme la tour de contrôle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
    onAfterAction();
  };

  return (
    <>
      {/* ===== Overlay « salle de contrôle » (plein panneau) ===== */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="control-tower"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 z-50 flex flex-col overflow-hidden rounded-none bg-slate-950/95 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.controlTower")}
          >
            {/* Trame de fond (grille de points) */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.13]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(52,211,153,0.9) 1px, transparent 1.5px)",
                backgroundSize: "22px 22px",
              }}
            />
            {/* V9 — scanlines CRT subtiles */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(52,211,153,0.7) 0px, rgba(52,211,153,0.7) 1px, transparent 1px, transparent 4px)",
              }}
            />
            {/* V9 — équerres HUD aux quatre coins */}
            {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map(
              (pos) => (
                <span
                  key={pos}
                  aria-hidden="true"
                  className={`absolute h-6 w-6 rounded-[3px] border-emerald-400/40 ${pos}`}
                />
              ),
            )}

            {/* ---- Bandeau HUD supérieur ---- */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="relative flex items-center justify-between border-b border-emerald-400/15 px-4 py-3"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                <Signal className="h-3.5 w-3.5" />
                {t("nav.controlTower.hud")}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("banks.cta.close")}
                className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-1.5 text-emerald-300 transition-colors hover:bg-emerald-400/15"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="relative flex items-center gap-2 px-4 pt-2 font-mono text-[9px] uppercase tracking-[0.3em] text-emerald-400/60"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {t("nav.controlTower.status")}
            </motion.p>

            {/* ---- Écran radar + sondes orbitales ---- */}
            <div className="relative flex flex-1 items-center justify-center">
              <div className="relative h-[300px] w-[300px]">
                {/* Écran radar */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/20"
                >
                  <div className="absolute inset-5 rounded-full border border-emerald-400/15" />
                  <div className="absolute inset-11 rounded-full border border-emerald-400/10" />
                  {/* Réticule */}
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-emerald-400/10" />
                  <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-400/10" />
                  {/* Faisceau rotatif */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(52,211,153,0.35) 350deg, rgba(52,211,153,0.55) 358deg, transparent 360deg)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
                  />
                  {/* V9 — blips radar : contacts qui s'estompent au passage du faisceau */}
                  {[
                    { x: "31%", y: "38%", d: 0.4 },
                    { x: "68%", y: "30%", d: 1.5 },
                    { x: "58%", y: "70%", d: 2.4 },
                    { x: "26%", y: "64%", d: 2.9 },
                  ].map((b, i) => (
                    <span
                      key={`blip-${i}`}
                      aria-hidden="true"
                      className="absolute"
                      style={{ left: b.x, top: b.y }}
                    >
                      <motion.span
                        className="block h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                        animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.25, 0.8] }}
                        transition={{
                          duration: 3.4,
                          repeat: Infinity,
                          delay: b.d,
                          ease: "easeInOut",
                        }}
                      />
                      <motion.span
                        className="absolute inset-0 -m-1 rounded-full border border-emerald-300/50"
                        animate={{ scale: [0.6, 2.2], opacity: [0.7, 0] }}
                        transition={{
                          duration: 1.8,
                          repeat: Infinity,
                          delay: b.d,
                          ease: "easeOut",
                        }}
                      />
                    </span>
                  ))}
                </div>

                {/* Lignes SVG qui relient le noyau aux sondes */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 300"
                  className="absolute inset-0 h-full w-full"
                >
                  {items.map((item, i) => {
                    const rad = (item.angle * Math.PI) / 180;
                    const x2 = 150 + Math.cos(rad) * 96;
                    const y2 = 150 - Math.sin(rad) * 96;
                    const isTarget = target === i;
                    return (
                      <motion.line
                        key={`line-${item.label}`}
                        x1="150"
                        y1="150"
                        x2={x2}
                        y2={y2}
                        stroke={
                          isTarget ? "rgba(52,211,153,0.85)" : "rgba(52,211,153,0.35)"
                        }
                        strokeWidth={isTarget ? 1.6 : 1}
                        strokeDasharray="3 3"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ delay: 0.35 + i * 0.06, duration: 0.4, ease: "easeOut" }}
                      />
                    );
                  })}
                </svg>

                {/* V9 — réticule de visée verrouillé sur la sonde survolée */}
                <AnimatePresence>
                  {target !== null && items[target] && (
                    <motion.div
                      key="probe-reticle"
                      initial={{ opacity: 0, scale: 1.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.7 }}
                      transition={{ duration: 0.18 }}
                      className="pointer-events-none absolute left-1/2 top-1/2 -ml-10 -mt-10 h-20 w-20"
                      style={{
                        x: Math.cos((items[target].angle * Math.PI) / 180) * RADIUS,
                        y: -Math.sin((items[target].angle * Math.PI) / 180) * RADIUS,
                      }}
                    >
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-300/70"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/50"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Noyau central pulsant */}
                <motion.div
                  className="absolute left-1/2 top-1/2 -ml-8 -mt-8"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                >
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-amber-400/30"
                    animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-xl shadow-orange-500/50 ring-2 ring-amber-300/40">
                    <ShieldCheck className="h-7 w-7" />
                  </span>
                </motion.div>

                {/* Sondes orbitales */}
                {items.map((item, i) => {
                  const rad = (item.angle * Math.PI) / 180;
                  const dx = Math.cos(rad) * RADIUS;
                  const dy = -Math.sin(rad) * RADIUS;
                  return (
                    <motion.button
                      key={item.label}
                      type="button"
                      onClick={() => run(item.onClick)}
                      onMouseEnter={() => setTarget(i)}
                      onMouseLeave={() => setTarget(null)}
                      onFocus={() => setTarget(i)}
                      onBlur={() => setTarget(null)}
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0.2 }}
                      animate={{ opacity: 1, x: dx, y: dy, scale: 1 }}
                      exit={{ opacity: 0, x: 0, y: 0, scale: 0.2 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 22,
                        delay: 0.3 + i * 0.07,
                      }}
                      whileHover={{ scale: 1.14 }}
                      whileTap={{ scale: 0.9 }}
                      className="group absolute left-1/2 top-1/2 -ml-7 -mt-7 flex h-14 w-14 flex-col items-center"
                      aria-label={item.label}
                    >
                      <span
                        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-1 ring-white/10 ${item.chip} ${item.shadow}`}
                      >
                        {item.icon}
                        {typeof item.badge === "number" && item.badge > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </span>
                      <span className="pointer-events-none absolute top-full mt-1.5 max-w-24 truncate rounded-full border border-emerald-400/20 bg-slate-950/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ---- Bandeau HUD inférieur : télémétrie animée + aide ---- */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-5 font-mono text-[9px] uppercase tracking-[0.28em] text-slate-500"
            >
              <span className="inline-flex items-center gap-1.5 tabular-nums text-emerald-400/85">
                <Crosshair className="h-3 w-3" />
                AZ {telemetry.az.toFixed(1)}° · EL {telemetry.el.toFixed(1)}°
              </span>
              <span>{t("nav.controlTower.hint")}</span>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Bouton flottant « émetteur radar » (FAB) ===== */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.06 }}
        aria-label={t("nav.controlTower")}
        aria-expanded={open}
        className="absolute bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black text-emerald-300 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-400/25 transition-colors"
      >
        {/* Anneau-sweep conique en rotation */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-1 rounded-xl"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(52,211,153,0.6) 340deg, transparent 360deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-[3px] rounded-[10px] bg-gradient-to-br from-slate-800 via-slate-900 to-black"
        />
        {/* Halo ping quand fermé */}
        {!open && (
          <span
            className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-ping"
            aria-hidden="true"
            style={{ animationDuration: "2.2s" }}
          />
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0, scale: open ? 0.85 : 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="relative flex"
          aria-hidden="true"
        >
          {open ? <X className="h-6 w-6" /> : <RadioTower className="h-6 w-6" />}
        </motion.span>
      </motion.button>
    </>
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

/**
 * V5 — MegaItem : entrée de méga-menu avec pastille d'icône colorée, libellé
 * et (optionnel) une description d'une ligne qui explique la destination.
 * La description est ce qui rend le menu « organisé » : on sait où on va
 * avant de cliquer.
 */
function MegaItem({
  icon,
  label,
  desc,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  desc?: string;
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
      <span className="min-w-0">
        <span className="block truncate transition-transform duration-200 group-hover/item:translate-x-0.5">
          {label}
        </span>
        {desc && (
          <span className="block truncate text-xs text-muted-foreground">
            {desc}
          </span>
        )}
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

  // V7 — "mot de passe oublié" : lien email (?reset=<token>) → ouvre le
  // ResetPasswordDialog. Lazy init + nettoyage d'URL comme pour ?ref=.
  const [resetToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset");
    return token && /^[a-f0-9]{64}$/i.test(token) ? token : null;
  });
  const [resetOpen, setResetOpen] = useState<boolean>(!!resetToken);
  useEffect(() => {
    if (!resetToken) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("reset");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore (SSR / non-browser)
    }
  }, [resetToken]);

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
  // V7 — compteurs de la carte profil de la sidebar mobile.
  const sidebarCoins = usePrefs((s) => s.quizCoins);
  const sidebarAnswers = usePrefs((s) => s.totalAnswered);
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
        {/* V7 — définition du nouveau mot de passe (lien email) */}
        <ResetPasswordDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          token={resetToken ?? ""}
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
          {t("nav.offlineBanner")}
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
                {t("brand.slogan")}
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
              aria-label={t("nav.openMenu")}
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
                label={t("menu.banks")}
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
                      <span className="hidden lg:inline">{t("nav.aiExam")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("nav.aiExam.tip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* V5 — Classement et Forum déménagent dans les méga-menus
                  « Progresser » et « Communauté » : le premier niveau ne
                  garde que les destinations essentielles. */}

              {/* V5 — Méga-menus organisés par objectif. L'ancien fourre-tout
                  « Explorer » (19 entrées) est remplacé par trois familles
                  claires : Réviser (apprendre), Progresser (se mesurer) et
                  Communauté (échanger). Chaque entrée porte une description. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={["official-exam","study-plan","guided-path","study-sheet","spaced-repetition","wiki"].includes(view) ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5"
                    data-tour="more-nav"
                    aria-label={t("nav.revise")}
                  >
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="hidden lg:inline">{t("nav.revise")}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[420px] p-3"
                  sideOffset={10}
                >
                  <ExplorerSection title={t("nav.revise")} icon={BookOpen} tone="blue">
                    <MegaItem
                      icon={<GraduationCap className="h-4 w-4" />}
                      label={t("menu.officialExam")}
                      desc={t("menu.officialExam.desc")}
                      tone="violet"
                      onClick={openOfficialExam}
                    />
                    <MegaItem
                      icon={<Sparkles className="h-4 w-4" />}
                      label={t("menu.aiPath")}
                      desc={t("menu.aiPath.desc")}
                      tone="violet"
                      onClick={openStudyPlan}
                    />
                    <MegaItem
                      icon={<CalendarCheck className="h-4 w-4" />}
                      label={t("menu.thirtyDays")}
                      desc={t("menu.thirtyDays.desc")}
                      tone="orange"
                      onClick={openGuidedPath}
                    />
                    <MegaItem
                      icon={<FileText className="h-4 w-4" />}
                      label={t("menu.studySheets")}
                      desc={t("menu.studySheets.desc")}
                      tone="emerald"
                      onClick={openStudySheet}
                    />
                    <MegaItem
                      icon={<Brain className="h-4 w-4" />}
                      label={t("menu.spacedRepetition")}
                      desc={t("menu.spacedRepetition.desc")}
                      tone="sky"
                      onClick={openSpacedRepetition}
                    />
                    <MegaItem
                      icon={<BookOpen className="h-4 w-4" />}
                      label={t("menu.wiki")}
                      desc={t("menu.wiki.desc")}
                      tone="emerald"
                      onClick={openWiki}
                    />
                  </ExplorerSection>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={["leaderboard","achievements","quests","skill-tree","shop"].includes(view) ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5"
                    aria-label={t("nav.progress")}
                  >
                    <Trophy className="h-4 w-4 text-orange-500" />
                    <span className="hidden lg:inline">{t("nav.progress")}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[420px] p-3"
                  sideOffset={10}
                >
                  <ExplorerSection title={t("nav.progress")} icon={Trophy} tone="orange">
                    <div className="grid grid-cols-2 gap-x-1">
                      <MegaItem icon={<Trophy className="h-4 w-4" />} label={t("menu.leaderboard")} desc={t("menu.leaderboard.desc")} tone="orange" onClick={openLeaderboard} />
                      <MegaItem icon={<Award className="h-4 w-4" />} label={t("menu.achievements")} desc={t("menu.achievements.desc")} tone="orange" onClick={openAchievements} />
                      <MegaItem icon={<Target className="h-4 w-4" />} label={t("menu.quests")} desc={t("menu.quests.desc")} tone="orange" onClick={openQuests} />
                      <MegaItem icon={<Crown className="h-4 w-4" />} label={t("menu.leagues")} desc={t("menu.leagues.desc")} tone="orange" onClick={openLeaderboard} />
                      <MegaItem icon={<TreePalm className="h-4 w-4" />} label={t("menu.skillTree")} desc={t("menu.skillTree.desc")} tone="emerald" onClick={openSkillTree} />
                      <MegaItem icon={<ShoppingBag className="h-4 w-4" />} label={t("menu.shop")} desc={t("menu.shop.desc")} tone="violet" onClick={openShop} />
                    </div>
                  </ExplorerSection>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={["social","forum","groups","messages","mentorship","live-sessions","blog","competition","events","about"].includes(view) ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5"
                    aria-label={t("nav.community")}
                  >
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="hidden lg:inline">{t("nav.community")}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[430px] p-3"
                  sideOffset={10}
                >
                  <ExplorerSection title={t("nav.community")} icon={Users} tone="emerald">
                    <div className="grid grid-cols-2 gap-x-1">
                      <MegaItem icon={<MessagesSquare className="h-4 w-4" />} label={t("menu.forum")} desc={t("menu.forum.desc")} tone="blue" onClick={openForum} />
                      <MegaItem icon={<Users className="h-4 w-4" />} label={t("menu.social")} desc={t("menu.social.desc")} tone="emerald" onClick={openSocial} />
                      <MegaItem icon={<UsersRound className="h-4 w-4" />} label={t("menu.groups")} desc={t("menu.groups.desc")} tone="emerald" onClick={openGroups} />
                      <MegaItem icon={<Mail className="h-4 w-4" />} label={t("menu.messages")} desc={t("menu.messages.desc")} tone="violet" onClick={openMessages} />
                      <MegaItem icon={<UserCheck className="h-4 w-4" />} label={t("menu.mentorship")} desc={t("menu.mentorship.desc")} tone="emerald" onClick={openMentorship} />
                      <MegaItem icon={<Radio className="h-4 w-4" />} label={t("menu.liveSessions")} desc={t("menu.liveSessions.desc")} tone="rose" onClick={openLiveSessions} />
                      <MegaItem icon={<Newspaper className="h-4 w-4" />} label={t("menu.blog")} desc={t("menu.blog.desc")} tone="blue" onClick={openBlog} />
                      <MegaItem icon={<Swords className="h-4 w-4" />} label={t("menu.competition")} desc={t("menu.competition.desc")} tone="rose" onClick={openCompetition} />
                      <MegaItem icon={<CalendarDays className="h-4 w-4" />} label={t("menu.events")} desc={t("menu.events.desc")} tone="violet" onClick={openEvents} />
                      <MegaItem icon={<Info className="h-4 w-4" />} label={t("menu.about")} desc={t("menu.about.desc")} tone="violet" onClick={openAbout} />
                    </div>
                  </ExplorerSection>
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
                        <span className="hidden lg:inline">{t("nav.admin")}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("nav.admin.tip")}
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
                aria-label={t("nav.coins.aria")}
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
                    aria-label={t("nav.search")}
                    data-tour="search-btn"
                  >
                    <Search className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nav.search.tip")}</TooltipContent>
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

            {/* V5 — Menu « ⋯ » : les réglages secondaires (aide, préférences,
                Premium) sont regroupés pour garder le header épuré. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-9 w-9 md:inline-flex"
                  aria-label={t("nav.settings")}
                >
                  <MoreHorizontal className="h-4.5 w-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => restartOnboarding()}
                >
                  <HelpCircle className="h-4 w-4" />
                  {t("nav.help")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                  {t("nav.settings")}
                </DropdownMenuItem>
                {status === "authenticated" && !isAdmin && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-amber-600 focus:text-amber-700"
                    onClick={() => setPricingOpen(true)}
                  >
                    <Crown className="h-4 w-4" />
                    {t("nav.premium")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* V9 — Menu compte (desktop) : avatar + identité + déconnexion.
                Le bouton « Se déconnecter » est désormais visible et accessible
                depuis n'importe quelle vue sur grand écran aussi. */}
            {status === "authenticated" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("nav.account")}
                    className="relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:inline-flex"
                  >
                    {(session?.user?.name || session?.user?.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                    {isAdmin && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-amber-400 text-[7px] font-black text-amber-950"
                        aria-hidden="true"
                      >
                        A
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-bold">
                      {session?.user?.name ?? "—"}
                    </span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {session?.user?.email ?? ""}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                    {t("nav.settings")}
                  </DropdownMenuItem>
                  {status === "authenticated" && !isAdmin && (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-amber-600 focus:text-amber-700"
                      onClick={() => setPricingOpen(true)}
                    >
                      <Crown className="h-4 w-4" />
                      {t("nav.premium")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("sidebar.profile.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            /* FIX — pas de classe "relative" ici : elle écrase le "fixed"
               de base (ordre d'émission CSS Tailwind) et le panneau tombait
               en bas du flux du document → overlay sombre sans menu visible.
               Le décor interne en absolute s'ancre sur l'ancêtre fixed. */
            className="flex w-[86vw] max-w-sm flex-col gap-0 overflow-hidden p-0"
          >
            {/* V7 — décor : lueurs aurora + trame de points derrière le contenu */}
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <span className="aurora-blob absolute -left-16 -top-16 h-48 w-48 bg-blue-400/20" />
              <span
                className="aurora-blob absolute -bottom-20 -right-14 h-44 w-44 bg-emerald-400/20"
                style={{ animationDelay: "-8s" }}
              />
              <span
                className="aurora-blob absolute right-10 top-24 h-28 w-28 bg-orange-300/15"
                style={{ animationDelay: "-14s" }}
              />
              <div
                className="absolute inset-0 opacity-[0.5]"
                style={{
                  backgroundImage:
                    "radial-gradient(var(--border) 0.5px, transparent 0.5px)",
                  backgroundSize: "18px 18px",
                }}
              />
            </div>

            {/* V4 — brand gradient accent strip */}
            <div
              className="relative h-1 w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-orange-400"
              aria-hidden="true"
            />
            <SheetHeader className="relative space-y-3 border-b p-4 pb-3">
              <SheetTitle className="flex items-center gap-2">
                <img
                  src="/logo-quizexam.svg"
                  alt=""
                  className="h-8 w-8 rounded-lg"
                  width={32}
                  height={32}
                />
                <span>QuizExam BF</span>
                <span
                  className="ml-auto rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300"
                  aria-hidden="true"
                >
                  2026
                </span>
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t("land.menu.aria")}
              </SheetDescription>
              {/* V7 — carte profil animée (identité + compteurs) */}
              <SidebarProfileCard
                name={session?.user?.name}
                email={session?.user?.email}
                isAdmin={isAdmin}
                coins={sidebarCoins}
                answers={sidebarAnswers}
                onLogin={() => setAuthOpen(true)}
                onLogout={() => signOut({ callbackUrl: "/" })}
              />
            </SheetHeader>

            {/* V6 — Scrollable body : Bento Grid de toutes les destinations.
                Mêmes actions du quiz-store qu'avant ; seule la disposition
                change — tuiles asymétriques interactives au lieu d'une liste. */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* — Essentiels — */}
              <div className="grid grid-cols-2 gap-2">
                <BentoTile
                  index={0}
                  icon={<House className="h-5 w-5" />}
                  label={t("nav.home")}
                  tone="blue"
                  active={view === "home"}
                  onClick={() => {
                    goHome();
                    setMobileNavOpen(false);
                  }}
                />
                <BentoTile
                  index={1}
                  icon={<LayoutDashboard className="h-5 w-5" />}
                  label={t("nav.dashboard")}
                  tone="emerald"
                  active={view === "dashboard"}
                  onClick={() => {
                    openDashboard();
                    setMobileNavOpen(false);
                  }}
                />
                <BentoTile
                  index={2}
                  wide
                  icon={<LibraryBig className="h-5 w-5" />}
                  label={t("menu.banks")}
                  desc={t("menu.banks.desc")}
                  tone="blue"
                  active={view === "bank-list"}
                  onClick={() => {
                    openBanks();
                    setMobileNavOpen(false);
                  }}
                />
                <BentoTile
                  index={3}
                  wide
                  icon={<Sparkles className="h-5 w-5" />}
                  label={t("nav.aiExam")}
                  desc={t("menu.aiExam.desc")}
                  tone="violet"
                  onClick={() => {
                    setCustomExamOpen(true);
                    setMobileNavOpen(false);
                  }}
                />
              </div>

              {/* — Réviser — */}
              <BentoSectionLabel index={4} icon={BookOpen} title={t("nav.section.revise")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile index={5} icon={<Sparkles className="h-5 w-5" />} label={t("menu.aiPath")} tone="violet" active={view === "study-plan"} onClick={() => { openStudyPlan(); setMobileNavOpen(false); }} />
                <BentoTile index={6} icon={<GraduationCap className="h-5 w-5" />} label={t("menu.officialExam")} tone="violet" active={view === "official-exam"} onClick={() => { openOfficialExam(); setMobileNavOpen(false); }} />
                <BentoTile index={7} icon={<CalendarCheck className="h-5 w-5" />} label={t("menu.thirtyDays")} tone="orange" active={view === "guided-path"} onClick={() => { openGuidedPath(); setMobileNavOpen(false); }} />
                <BentoTile index={8} icon={<FileText className="h-5 w-5" />} label={t("menu.studySheets")} tone="emerald" active={view === "study-sheet"} onClick={() => { openStudySheet(); setMobileNavOpen(false); }} />
                <BentoTile index={9} icon={<Brain className="h-5 w-5" />} label={t("menu.spacedRepetition")} tone="sky" active={view === "spaced-repetition"} onClick={() => { openSpacedRepetition(); setMobileNavOpen(false); }} />
                <BentoTile index={10} icon={<BookOpen className="h-5 w-5" />} label={t("menu.wiki")} tone="emerald" active={view === "wiki"} onClick={() => { openWiki(); setMobileNavOpen(false); }} />
              </div>

              {/* — Progresser — */}
              <BentoSectionLabel index={11} icon={Trophy} title={t("nav.section.progress")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile index={12} icon={<Trophy className="h-5 w-5" />} label={t("menu.leaderboard")} tone="orange" active={view === "leaderboard"} onClick={() => { openLeaderboard(); setMobileNavOpen(false); }} />
                <BentoTile index={13} icon={<Award className="h-5 w-5" />} label={t("menu.achievements")} tone="orange" active={view === "achievements"} onClick={() => { openAchievements(); setMobileNavOpen(false); }} />
                <BentoTile index={14} icon={<Target className="h-5 w-5" />} label={t("menu.quests")} tone="amber" active={view === "quests"} onClick={() => { openQuests(); setMobileNavOpen(false); }} />
                <BentoTile index={15} icon={<TreePalm className="h-5 w-5" />} label={t("menu.skillTree")} tone="emerald" active={view === "skill-tree"} onClick={() => { openSkillTree(); setMobileNavOpen(false); }} />
                <BentoTile index={16} icon={<ShoppingBag className="h-5 w-5" />} label={t("menu.shop")} tone="violet" active={view === "shop"} onClick={() => { openShop(); setMobileNavOpen(false); }} />
                <BentoTile index={17} icon={<Crown className="h-5 w-5" />} label={t("menu.leagues")} tone="orange" onClick={() => { openLeaderboard(); setMobileNavOpen(false); }} />
              </div>

              {/* — Communauté — */}
              <BentoSectionLabel index={18} icon={Users} title={t("nav.section.community")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile index={19} icon={<MessagesSquare className="h-5 w-5" />} label={t("menu.forum")} tone="blue" active={view === "forum"} onClick={() => { openForum(); setMobileNavOpen(false); }} />
                <BentoTile index={20} icon={<Users className="h-5 w-5" />} label={t("menu.social")} tone="emerald" active={view === "social"} onClick={() => { openSocial(); setMobileNavOpen(false); }} />
                <BentoTile index={21} icon={<UsersRound className="h-5 w-5" />} label={t("menu.groups")} tone="emerald" active={view === "groups"} onClick={() => { openGroups(); setMobileNavOpen(false); }} />
                <BentoTile index={22} icon={<Mail className="h-5 w-5" />} label={t("menu.messages")} tone="violet" active={view === "messages"} onClick={() => { openMessages(); setMobileNavOpen(false); }} />
                <BentoTile index={23} icon={<UserCheck className="h-5 w-5" />} label={t("menu.mentorship")} tone="emerald" active={view === "mentorship"} onClick={() => { openMentorship(); setMobileNavOpen(false); }} />
                <BentoTile index={24} icon={<Radio className="h-5 w-5" />} label={t("menu.liveSessions")} tone="rose" active={view === "live-sessions"} onClick={() => { openLiveSessions(); setMobileNavOpen(false); }} />
                <BentoTile index={25} icon={<Newspaper className="h-5 w-5" />} label={t("menu.blog")} tone="blue" active={view === "blog"} onClick={() => { openBlog(); setMobileNavOpen(false); }} />
                <BentoTile index={26} icon={<Swords className="h-5 w-5" />} label={t("menu.competition")} tone="rose" active={view === "competition"} onClick={() => { openCompetition(); setMobileNavOpen(false); }} />
              </div>

              {/* — Plus — */}
              <BentoSectionLabel index={27} icon={Info} title={t("menu.about")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile index={28} icon={<CalendarDays className="h-5 w-5" />} label={t("menu.events")} tone="violet" active={view === "events"} onClick={() => { openEvents(); setMobileNavOpen(false); }} />
                <BentoTile index={29} icon={<Info className="h-5 w-5" />} label={t("nav.about")} tone="sky" active={view === "about"} onClick={() => { openAbout(); setMobileNavOpen(false); }} />
                <BentoTile index={30} icon={<Code2 className="h-5 w-5" />} label={t("menu.developer")} tone="amber" active={view === "about"} onClick={() => { openAbout(); setMobileNavOpen(false); }} />
              </div>

              {/* — Réglages (non-admins uniquement) : pour les admins, ces
                  options sont extraites dans la Tour de contrôle (bouton
                  flottant « Espace admin » ci-dessous). */}
              {!isAdmin && (
                <>
                  <BentoSectionLabel index={30} icon={Settings} title={t("nav.section.settings")} />
                  <div className="grid grid-cols-2 gap-2">
                    <BentoTile index={31} icon={<Search className="h-5 w-5" />} label={t("nav.search")} tone="blue" onClick={() => { setSearchOpen(true); setMobileNavOpen(false); }} />
                    <BentoTile index={32} icon={<Bell className="h-5 w-5" />} label={`${t("nav.notifications")}${unreadCount > 0 ? ` (${unreadCount > 9 ? "9+" : unreadCount})` : ""}`} tone="rose" onClick={() => { setNotifOpen(true); setMobileNavOpen(false); }} />
                    <BentoTile index={33} icon={<Settings className="h-5 w-5" />} label={t("nav.settings")} tone="sky" onClick={() => { setSettingsOpen(true); setMobileNavOpen(false); }} />
                    <BentoTile index={34} icon={<HelpCircle className="h-5 w-5" />} label={t("nav.help")} tone="violet" onClick={() => { restartOnboarding(); setMobileNavOpen(false); }} />
                    {status === "authenticated" && (
                      <BentoTile index={35} icon={<Crown className="h-5 w-5" />} label={t("nav.premium.aria")} tone="amber" onClick={() => { setPricingOpen(true); setMobileNavOpen(false); }} />
                    )}
                  </div>
                </>
              )}

              <div className="mt-4 flex items-center gap-2 border-t pt-3">
                <DarkModeToggle />
                <LanguageSwitcher />
              </div>
            </div>

            {/* V7 — Espace Admin : toutes les options d'administration sont
                extraites du bas du menu et isolées dans ce bouton flottant
                dédié « Tour de contrôle ». Au clic, le panneau se transforme
                en salle de contrôle : écran radar animé, faisceau rotatif et
                sondes d'administration en orbite reliées au noyau. */}
            {isAdmin && (
              <AdminControlTower
                openAdmin={() => {
                  openAdmin();
                  setMobileNavOpen(false);
                }}
                openSearch={() => {
                  setSearchOpen(true);
                  setMobileNavOpen(false);
                }}
                openNotifications={() => {
                  setNotifOpen(true);
                  setMobileNavOpen(false);
                }}
                openSettings={() => {
                  setSettingsOpen(true);
                  setMobileNavOpen(false);
                }}
                openHelp={() => {
                  restartOnboarding();
                  setMobileNavOpen(false);
                }}
                unreadCount={unreadCount}
                onAfterAction={() => setMobileNavOpen(false)}
              />
            )}
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
                  aria-label={t("footer.apiDocs")}
                >
                  <Code2 className="h-3 w-3" />
                  {t("footer.apiDocs")}
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
              {t("footer.apiDocs")}
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setPricingOpen(true)}
              className="inline-flex items-center gap-1 hover:text-amber-600"
            >
              <Crown className="h-3 w-3" />
              {t("footer.pricing")}
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

      {/* V7 — définition du nouveau mot de passe (lien email ?reset=) */}
      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        token={resetToken ?? ""}
      />

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

      {/* V16 — bannière de consentement légal (première visite, 12 mois) :
          avertit l'utilisateur des CGU + politique de confidentialité. */}
      <LegalConsentBanner />

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
