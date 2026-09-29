"use client";

import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  // V6 — Bento mobile nav + radial admin menu.
  ChevronRight,
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
 * V6 — BENTO GRID : la barre latérale mobile devient une grille de tuiles
 * asymétriques (« Bento Grid »). Chaque fonctionnalité existante garde exactement
 * la même action (mêmes handlers du quiz-store), seule la disposition change :
 * des tuiles visuelles distinctes et interactives au lieu d'une liste plate.
 * Les options d'administration sont extraites du bas du menu et isolées dans
 * un bouton flottant dédié (AdminRadialMenu) qui déploie un menu radial.
 * ========================================================================== */

/** Tonalités couleur des tuiles Bento : chip d'icône + dégradé « wide ». */
const BENTO_TONES: Record<
  string,
  { chip: string; wideBg: string }
> = {
  blue: {
    chip: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    wideBg: "bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 shadow-lg shadow-blue-500/25",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    wideBg: "bg-gradient-to-br from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/25",
  },
  orange: {
    chip: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    wideBg: "bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-orange-500/25",
  },
  violet: {
    chip: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    wideBg: "bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/25",
  },
  rose: {
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    wideBg: "bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/25",
  },
  sky: {
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    wideBg: "bg-gradient-to-br from-sky-600 to-blue-500 shadow-lg shadow-sky-500/25",
  },
  amber: {
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    wideBg: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25",
  },
};

type BentoTone = keyof typeof BENTO_TONES;

/**
 * V6 — BentoTile : une tuile de la grille Bento du menu mobile.
 *
 * Deux variantes :
 *  - standard (1 colonne) : chip d'icône colorée + libellé, zoom léger au
 *    survol, compression au toucher, anneau actif quand la vue correspond.
 *  - wide (2 colonnes) : tuile majeure avec dégradé de fond, description,
 *    lueur décorative et flèche — pour les destinations essentielles.
 */
function BentoTile({
  icon,
  label,
  desc,
  tone = "blue",
  active,
  wide,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  desc?: string;
  tone?: BentoTone;
  active?: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  const toneCls = BENTO_TONES[tone] ?? BENTO_TONES.blue;

  if (wide) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 26 }}
        className={`group relative col-span-2 flex items-center gap-3 overflow-hidden rounded-2xl p-3.5 text-left text-white ${toneCls.wideBg}`}
      >
        {/* Lueurs décoratives (halos diffus) */}
        <span
          aria-hidden="true"
          className="absolute -right-7 -top-9 h-24 w-24 rounded-full bg-white/20 blur-xl transition-transform duration-500 group-hover:scale-125"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-10 -left-6 h-20 w-20 rounded-full bg-white/10 blur-lg"
        />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          {icon}
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold">
            {label}
          </span>
          {desc && (
            <span className="block truncate text-[11px] text-white/85">
              {desc}
            </span>
          )}
        </span>
        <ChevronRight className="relative h-4 w-4 shrink-0 opacity-70 transition-transform duration-300 group-hover:translate-x-1" />
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={`group relative flex min-h-[72px] flex-col items-start justify-between gap-2.5 rounded-2xl border p-3 text-left transition-colors duration-200 ${
        active
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/30"
          : "border-border/70 bg-card hover:border-blue-200 hover:bg-blue-50/60 dark:border-white/5 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
      }`}
    >
      {active && (
        <span
          className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
      )}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${toneCls.chip}`}
      >
        {icon}
      </span>
      <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
        {label}
      </span>
    </motion.button>
  );
}

/**
 * V6 — BentoSectionLabel : petit titre de groupe entre les rangées de tuiles
 * Bento (équivalent des anciennes sections, plus compact).
 */
const BentoSectionLabel = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <p className="mb-2 mt-5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
    {title}
  </p>
);

/**
 * V6 — AdminRadialMenu : bouton flottant dédié à l'espace administration.
 *
 * Toutes les options d'administration (et les réglages associés) sont
 * extraites du bas du menu et isolées ici. Au clic, le bouton déploie les
 * actions en arc de cercle (menu radial / orbital) : chaque action est une
 * bulle qui s'éloigne du bouton avec un ressort et une légère cascade.
 * Le halo « ping » attire l'œil tant que le menu est fermé.
 */
function AdminRadialMenu({
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

  // Bulles en arc de cercle : angles en degrés (180° = gauche, 90° = haut).
  // Le bouton vit en bas à droite du panneau → l'arc balaye le quart
  // supérieur gauche, toujours à l'intérieur du panneau.
  const items = [
    {
      icon: <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-300" />,
      label: t("nav.admin"),
      angle: 180,
      radius: 104,
      onClick: openAdmin,
    },
    {
      icon: <Search className="h-5 w-5 text-blue-600 dark:text-blue-300" />,
      label: t("nav.search"),
      angle: 157.5,
      radius: 106,
      onClick: openSearch,
    },
    {
      icon: <Bell className="h-5 w-5 text-rose-600 dark:text-rose-300" />,
      label: t("nav.notifications"),
      angle: 135,
      radius: 106,
      onClick: openNotifications,
      badge: unreadCount,
    },
    {
      icon: <Settings className="h-5 w-5 text-sky-600 dark:text-sky-300" />,
      label: t("nav.settings"),
      angle: 112.5,
      radius: 106,
      onClick: openSettings,
    },
    {
      icon: <HelpCircle className="h-5 w-5 text-violet-600 dark:text-violet-300" />,
      label: t("nav.help"),
      angle: 90,
      radius: 104,
      onClick: openHelp,
    },
  ];

  const run = (action: () => void) => {
    action();
    setOpen(false);
    onAfterAction();
  };

  return (
    <>
      {/* Voile cliquable : ferme le menu radial au clic extérieur */}
      <AnimatePresence>
        {open && (
          <motion.button
            key="radial-veil"
            type="button"
            aria-label={t("banks.cta.close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 z-40 cursor-default rounded-none bg-black/25 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Conteneur ancré sur le bouton flottant (même boîte que le FAB) */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-50 h-14 w-14">
        <AnimatePresence>
          {open &&
            items.map((item, i) => {
              const rad = (item.angle * Math.PI) / 180;
              const dx = Math.cos(rad) * item.radius;
              const dy = -Math.sin(rad) * item.radius;
              return (
                <motion.button
                  key={item.label}
                  type="button"
                  onClick={() => run(item.onClick)}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{ opacity: 1, x: dx, y: dy, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 24,
                    delay: open ? i * 0.045 : 0,
                  }}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  className="pointer-events-auto absolute left-1/2 top-1/2 -ml-6 -mt-6 flex h-12 w-12 items-center justify-center"
                >
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full border bg-card shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                    {item.icon}
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </span>
                  <span className="pointer-events-none absolute top-full mt-1 max-w-24 truncate rounded-full border bg-background/95 px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Bouton flottant dédié (FAB) */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.9 }}
        aria-label={t("nav.admin.menu")}
        aria-expanded={open}
        className="absolute bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-orange-500/30 transition-transform hover:scale-105"
      >
        {!open && (
          <span
            className="absolute inset-0 rounded-full bg-orange-500/40 animate-ping"
            aria-hidden="true"
          />
        )}
        <motion.span
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="relative flex"
          aria-hidden="true"
        >
          <ShieldCheck className="h-6 w-6" />
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
                {t("land.menu.aria")}
              </SheetDescription>
            </SheetHeader>

            {/* V6 — Scrollable body : Bento Grid de toutes les destinations.
                Mêmes actions du quiz-store qu'avant ; seule la disposition
                change — tuiles asymétriques interactives au lieu d'une liste. */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* — Essentiels — */}
              <div className="grid grid-cols-2 gap-2">
                <BentoTile
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
              <BentoSectionLabel icon={BookOpen} title={t("nav.section.revise")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile icon={<Sparkles className="h-5 w-5" />} label={t("menu.aiPath")} tone="violet" active={view === "study-plan"} onClick={() => { openStudyPlan(); setMobileNavOpen(false); }} />
                <BentoTile icon={<GraduationCap className="h-5 w-5" />} label={t("menu.officialExam")} tone="violet" active={view === "official-exam"} onClick={() => { openOfficialExam(); setMobileNavOpen(false); }} />
                <BentoTile icon={<CalendarCheck className="h-5 w-5" />} label={t("menu.thirtyDays")} tone="orange" active={view === "guided-path"} onClick={() => { openGuidedPath(); setMobileNavOpen(false); }} />
                <BentoTile icon={<FileText className="h-5 w-5" />} label={t("menu.studySheets")} tone="emerald" active={view === "study-sheet"} onClick={() => { openStudySheet(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Brain className="h-5 w-5" />} label={t("menu.spacedRepetition")} tone="sky" active={view === "spaced-repetition"} onClick={() => { openSpacedRepetition(); setMobileNavOpen(false); }} />
                <BentoTile icon={<BookOpen className="h-5 w-5" />} label={t("menu.wiki")} tone="emerald" active={view === "wiki"} onClick={() => { openWiki(); setMobileNavOpen(false); }} />
              </div>

              {/* — Progresser — */}
              <BentoSectionLabel icon={Trophy} title={t("nav.section.progress")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile icon={<Trophy className="h-5 w-5" />} label={t("menu.leaderboard")} tone="orange" active={view === "leaderboard"} onClick={() => { openLeaderboard(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Award className="h-5 w-5" />} label={t("menu.achievements")} tone="orange" active={view === "achievements"} onClick={() => { openAchievements(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Target className="h-5 w-5" />} label={t("menu.quests")} tone="amber" active={view === "quests"} onClick={() => { openQuests(); setMobileNavOpen(false); }} />
                <BentoTile icon={<TreePalm className="h-5 w-5" />} label={t("menu.skillTree")} tone="emerald" active={view === "skill-tree"} onClick={() => { openSkillTree(); setMobileNavOpen(false); }} />
                <BentoTile icon={<ShoppingBag className="h-5 w-5" />} label={t("menu.shop")} tone="violet" active={view === "shop"} onClick={() => { openShop(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Crown className="h-5 w-5" />} label={t("menu.leagues")} tone="orange" onClick={() => { openLeaderboard(); setMobileNavOpen(false); }} />
              </div>

              {/* — Communauté — */}
              <BentoSectionLabel icon={Users} title={t("nav.section.community")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile icon={<MessagesSquare className="h-5 w-5" />} label={t("menu.forum")} tone="blue" active={view === "forum"} onClick={() => { openForum(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Users className="h-5 w-5" />} label={t("menu.social")} tone="emerald" active={view === "social"} onClick={() => { openSocial(); setMobileNavOpen(false); }} />
                <BentoTile icon={<UsersRound className="h-5 w-5" />} label={t("menu.groups")} tone="emerald" active={view === "groups"} onClick={() => { openGroups(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Mail className="h-5 w-5" />} label={t("menu.messages")} tone="violet" active={view === "messages"} onClick={() => { openMessages(); setMobileNavOpen(false); }} />
                <BentoTile icon={<UserCheck className="h-5 w-5" />} label={t("menu.mentorship")} tone="emerald" active={view === "mentorship"} onClick={() => { openMentorship(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Radio className="h-5 w-5" />} label={t("menu.liveSessions")} tone="rose" active={view === "live-sessions"} onClick={() => { openLiveSessions(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Newspaper className="h-5 w-5" />} label={t("menu.blog")} tone="blue" active={view === "blog"} onClick={() => { openBlog(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Swords className="h-5 w-5" />} label={t("menu.competition")} tone="rose" active={view === "competition"} onClick={() => { openCompetition(); setMobileNavOpen(false); }} />
              </div>

              {/* — Plus — */}
              <BentoSectionLabel icon={Info} title={t("menu.about")} />
              <div className="grid grid-cols-2 gap-2">
                <BentoTile icon={<CalendarDays className="h-5 w-5" />} label={t("menu.events")} tone="violet" active={view === "events"} onClick={() => { openEvents(); setMobileNavOpen(false); }} />
                <BentoTile icon={<Info className="h-5 w-5" />} label={t("nav.about")} tone="sky" active={view === "about"} onClick={() => { openAbout(); setMobileNavOpen(false); }} />
              </div>

              {/* — Réglages (non-admins uniquement) : pour les admins, ces
                  options sont extraites dans le menu radial du bouton
                  flottant « Espace admin » ci-dessous. */}
              {!isAdmin && (
                <>
                  <BentoSectionLabel icon={Settings} title={t("nav.section.settings")} />
                  <div className="grid grid-cols-2 gap-2">
                    <BentoTile icon={<Search className="h-5 w-5" />} label={t("nav.search")} tone="blue" onClick={() => { setSearchOpen(true); setMobileNavOpen(false); }} />
                    <BentoTile icon={<Bell className="h-5 w-5" />} label={`${t("nav.notifications")}${unreadCount > 0 ? ` (${unreadCount > 9 ? "9+" : unreadCount})` : ""}`} tone="rose" onClick={() => { setNotifOpen(true); setMobileNavOpen(false); }} />
                    <BentoTile icon={<Settings className="h-5 w-5" />} label={t("nav.settings")} tone="sky" onClick={() => { setSettingsOpen(true); setMobileNavOpen(false); }} />
                    <BentoTile icon={<HelpCircle className="h-5 w-5" />} label={t("nav.help")} tone="violet" onClick={() => { restartOnboarding(); setMobileNavOpen(false); }} />
                    {status === "authenticated" && (
                      <BentoTile icon={<Crown className="h-5 w-5" />} label={t("nav.premium.aria")} tone="amber" onClick={() => { setPricingOpen(true); setMobileNavOpen(false); }} />
                    )}
                  </div>
                </>
              )}

              <div className="mt-4 flex items-center gap-2 border-t pt-3">
                <DarkModeToggle />
                <LanguageSwitcher />
              </div>
            </div>

            {/* V6 — Espace Admin : toutes les options d'administration sont
                extraites du bas du menu et isolées dans ce bouton flottant
                dédié. Au clic, il déploie les actions en menu radial/orbital
                (bulles en arc de cercle). */}
            {isAdmin && (
              <AdminRadialMenu
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
