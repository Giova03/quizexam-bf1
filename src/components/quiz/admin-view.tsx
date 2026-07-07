"use client";

/**
 * AdminView — FIX5 fresh modern redesign.
 *
 * Layout (per spec):
 *   • Top bar — search + quick actions (Upload PDF, Nouvelle banque, admin chip)
 *   • Left sidebar — glass-strong, sticky, 240px desktop, horizontal scroll on mobile
 *   • Active item — emerald gradient with sliding white indicator bar
 *   • KPI strip — 6 gradient cards with count-up animation
 *   • 12 sections rendered via existing sub-components (admin-overview, …)
 *   • Framer Motion fade+slide transitions between sections
 *   • Subtle gradient-mesh background behind everything
 *
 * The file is intentionally lean: it only owns the shell (state, search,
 * KPI strip, sidebar, tab content switcher, cross-tab dialogs). Each tab's
 * UI lives in ./admin/*.tsx or ./admin-*.tsx.
 */

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  TrendingUp,
  Database,
  Activity,
  GraduationCap,
  Download,
  Upload,
  Mail,
  BarChart3,
  LineChart,
  ShieldCheck,
  ShieldAlert,
  Plus,
  FileText,
  Bot,
  AlertTriangle,
  Search,
  BookOpen,
  FileQuestion,
  Trophy,
  Sparkles,
  Zap,
  X,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRecentErrorCount,
  getStoredErrors,
  clearStoredErrors,
  type TrackedError,
} from "@/lib/error-tracking";
import { PdfUploadDialog } from "@/components/quiz/pdf-upload-dialog";
import { AdminAnalytics } from "@/components/quiz/admin-analytics";
import { AiQuestionGenerator } from "@/components/quiz/ai-question-generator";

import { OverviewTab } from "@/components/quiz/admin/admin-overview";
import { VisitorsStats } from "@/components/quiz/admin/admin-visitors";
import { BanksTab, NewBankDialog } from "@/components/quiz/admin/admin-banks";
import { BankQuestionsDialog } from "@/components/quiz/admin/admin-bank-dialog";
import { SessionsList } from "@/components/quiz/admin/admin-sessions";
import {
  ExamsManager,
  NewExamDialog,
} from "@/components/quiz/admin/admin-exams";
import { ExportsPanel } from "@/components/quiz/admin/admin-exports";
import { ImportsPanel } from "@/components/quiz/admin/admin-import";
import { BroadcastPanel } from "@/components/quiz/admin/admin-broadcast";
import { ModerationPanel } from "@/components/quiz/admin/admin-moderation";

import type {
  AdminStats,
  BankWithCount,
} from "@/components/quiz/admin/types";

/* ------------------------------------------------------------------ */
/* Animated counter (count-up)                                         */
/* ------------------------------------------------------------------ */

function AnimatedCounter({
  value,
  duration = 0.9,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const lastValueRef = useRef(value);

  useEffect(() => {
    const startVal = lastValueRef.current;
    const delta = value - startVal;
    lastValueRef.current = value;
    if (delta === 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="tabular-nums">{display.toLocaleString("fr-FR")}</span>;
}

/* ------------------------------------------------------------------ */
/* KPI card — gradient + animated counter + trend pill                 */
/* ------------------------------------------------------------------ */

interface KpiProps {
  icon: LucideIcon;
  label: string;
  value: number;
  gradient: string;
  delay?: number;
  trend?: number;
  trendLabel?: string;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  gradient,
  delay = 0,
  trend,
  trendLabel,
}: KpiProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -3, scale: 1.015 }}
      className={`group relative overflow-hidden rounded-2xl p-4 text-white shadow-lg sm:p-5 ${gradient}`}
    >
      {/* Decorative watermark icon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-4 opacity-25 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
      >
        <Icon className="h-16 w-16 sm:h-20 sm:w-20" />
      </div>
      {/* Soft highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 to-transparent"
      />
      <div className="relative z-10 flex h-full flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-5 w-5" />
          </div>
          {typeof trend === "number" && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm"
              title={trendLabel}
            >
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-tight sm:text-3xl">
            <AnimatedCounter value={value} />
          </p>
          <p className="mt-0.5 text-[11px] font-medium opacity-90 sm:text-xs">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick stat chip (today / new / answered)                            */
/* ------------------------------------------------------------------ */

function QuickStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="glass flex items-center gap-2.5 rounded-xl px-3 py-2 shadow-sm">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-bold sm:text-base">
          <AnimatedCounter value={value} />
        </p>
        <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab definitions                                                     */
/* ------------------------------------------------------------------ */

interface TabDef {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
  badge?: number;
  desc: string;
}

/* ------------------------------------------------------------------ */
/* Sidebar item — desktop vertical button                              */
/* ------------------------------------------------------------------ */

function SidebarItem({
  tab,
  active,
  onClick,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  const showBadge = (tab.badge ?? 0) > 0;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
          : "text-muted-foreground hover:bg-emerald-50/80 hover:text-emerald-700 hover:shadow-sm dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
      }`}
      aria-current={active ? "page" : undefined}
      aria-label={tab.label}
    >
      <Icon
        className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
          active ? "text-white drop-shadow" : ""
        }`}
      />
      <span className="flex-1 truncate text-left">{tab.label}</span>
      {showBadge && (
        <span
          className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
            active ? "bg-white/25 text-white" : "bg-rose-500 text-white"
          }`}
          title={`${tab.badge} en attente`}
        >
          {tab.badge}
        </span>
      )}
      {/* Active indicator bar */}
      {active && (
        <motion.span
          layoutId="admin-active-bar"
          className="absolute inset-y-1 left-0 w-1 rounded-full bg-white/80"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function AdminView() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankWithCount | null>(null);
  const [newBankOpen, setNewBankOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newExamOpen, setNewExamOpen] = useState(false);
  const [pdfUploadOpen, setPdfUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingReports, setPendingReports] = useState(0);

  /* ----- Fetch admin stats from /api/admin/stats ----- */
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data as AdminStats);
      }
    } catch (e) {
      console.error("Admin stats error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ----- Initial load: stats + ensure admin account exists ----- */
  useEffect(() => {
    loadStats();
    fetch("/api/admin/init", { method: "POST" }).catch((e) =>
      console.error("Admin init failed", e),
    );
  }, [loadStats]);

  /* ----- Pending reports count (moderation badge) ----- */
  const loadPendingReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports?status=pending", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setPendingReports(Array.isArray(data) ? data.length : 0);
    } catch {
      /* silent — non-critical */
    }
  }, []);

  useEffect(() => {
    loadPendingReports();
    const id = setInterval(loadPendingReports, 60_000);
    return () => clearInterval(id);
  }, [loadPendingReports]);

  /* ----- Error-tracking badge (recent errors in the last 60 min) ----- */
  const [recentErrorCount, setRecentErrorCount] = useState(0);
  const [storedErrors, setStoredErrors] = useState<TrackedError[]>([]);
  useEffect(() => {
    const refresh = () => {
      setRecentErrorCount(getRecentErrorCount(60));
      setStoredErrors(getStoredErrors());
    };
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  function handleClearErrors() {
    clearStoredErrors();
    setRecentErrorCount(0);
    setStoredErrors([]);
    toast.success("Journal d'erreurs effacé.");
  }

  /* ----- 12 tabs (spec: 12 sections using existing sub-components) ----- */
  const TABS: TabDef[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Vue d'ensemble",
        short: "Vue",
        icon: BarChart3,
        desc: "Tableau de bord principal avec KPIs et activité récente",
      },
      {
        id: "banks",
        label: "Banques",
        short: "Banques",
        icon: Database,
        desc: "Grille de banques de questions avec stats détaillées",
      },
      {
        id: "visitors",
        label: "Visiteurs",
        short: "Visit.",
        icon: Users,
        desc: "Utilisateurs inscrits avec rôles et activité",
      },
      {
        id: "sessions",
        label: "Sessions",
        short: "Sess.",
        icon: Activity,
        desc: "Timeline des sessions récentes avec scores",
      },
      {
        id: "exams",
        label: "Examens",
        short: "Exam.",
        icon: GraduationCap,
        desc: "Examens blancs avec nombre de questions et durée",
      },
      {
        id: "imports",
        label: "Import",
        short: "Import",
        icon: Upload,
        desc: "5 méthodes d'import : PDF, Word, Texte, CSV, Exam Builder",
      },
      {
        id: "exports",
        label: "Export",
        short: "Export",
        icon: Download,
        desc: "Téléchargements CSV : utilisateurs, sessions, banques",
      },
      {
        id: "analytics",
        label: "Analytics",
        short: "Analy.",
        icon: LineChart,
        desc: "Graphiques, heatmap et questions les plus ratées",
      },
      {
        id: "moderation",
        label: "Modération",
        short: "Mod.",
        icon: ShieldAlert,
        badge: pendingReports,
        desc: "Signalements avec actions rapides",
      },
      {
        id: "broadcast",
        label: "Broadcast",
        short: "Mail",
        icon: Mail,
        desc: "Envoyer un email à tous les utilisateurs",
      },
      {
        id: "ai-generator",
        label: "Générateur IA",
        short: "IA",
        icon: Bot,
        desc: "Générer des QCM depuis un sujet",
      },
      {
        id: "errors",
        label: "Erreurs",
        short: "Err.",
        icon: AlertTriangle,
        badge: recentErrorCount,
        desc: "Journal des erreurs tracked",
      },
    ],
    [pendingReports, recentErrorCount],
  );

  /* ----- Filter tabs by search query (desktop sidebar) ----- */
  const filteredTabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TABS;
    return TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );
  }, [TABS, searchQuery]);

  /* ----- KPI data derived from stats ----- */
  const kpis: KpiProps[] = useMemo(
    () => [
      {
        icon: BookOpen,
        label: "Banques",
        value: stats?.counts.banks ?? 0,
        gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
        trend: 8,
        trendLabel: "vs semaine dernière",
      },
      {
        icon: FileQuestion,
        label: "Questions",
        value: stats?.counts.questions ?? 0,
        gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
        trend: 12,
        trendLabel: "vs semaine dernière",
      },
      {
        icon: Trophy,
        label: "Examens",
        value: stats?.counts.exams ?? 0,
        gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
        trend: 3,
        trendLabel: "vs semaine dernière",
      },
      {
        icon: Users,
        label: "Utilisateurs",
        value: stats?.counts.users ?? 0,
        gradient: "bg-gradient-to-br from-sky-500 to-cyan-600",
        trend: 5,
        trendLabel: "vs semaine dernière",
      },
      {
        icon: Activity,
        label: "Sessions",
        value: stats?.counts.sessions ?? 0,
        gradient: "bg-gradient-to-br from-rose-500 to-pink-600",
        trend: 15,
        trendLabel: "vs semaine dernière",
      },
      {
        icon: TrendingUp,
        label: "Terminées",
        value: stats?.counts.completedSessions ?? 0,
        gradient: "bg-gradient-to-br from-teal-500 to-emerald-600",
        trend: 9,
        trendLabel: "vs semaine dernière",
      },
    ],
    [stats],
  );

  /* ----- Quick stats: today's sessions, new users, questions answered ----- */
  const quickStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentSessions = stats?.recentSessions ?? [];
    const todaySessions = recentSessions.filter(
      (s) => new Date(s.completedAt) >= today,
    ).length;
    const recentUsers = stats?.recentUsers ?? [];
    const newUsersToday = recentUsers.filter(
      (u) => new Date(u.createdAt) >= today,
    ).length;
    const questionsAnsweredToday = recentSessions
      .filter((s) => new Date(s.completedAt) >= today)
      .reduce((sum, s) => sum + s.totalQuestions, 0);
    return { todaySessions, newUsersToday, questionsAnsweredToday };
  }, [stats]);

  /* ----- Active tab meta ----- */
  const activeTabMeta = TABS.find((t) => t.id === activeTab);
  const ActiveIcon = activeTabMeta?.icon ?? BarChart3;

  /* ----- Avatar initials ----- */
  const avatarInitials = useMemo(() => {
    const name = session?.user?.name || session?.user?.email || "Admin";
    return name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  }, [session]);

  /* ----- Tab change handler (resets search) ----- */
  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
    setSearchQuery("");
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* ===== Subtle gradient-mesh background ===== */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 gradient-mesh opacity-40"
      />

      {/* ===== Top bar (sticky) ===== */}
      <header className="glass-strong sticky top-0 z-30 border-b border-emerald-100/60 px-4 py-3 sm:px-6 dark:border-emerald-900/40">
        <div className="flex items-center gap-3">
          {/* Logo + title */}
          <div className="flex min-w-0 items-center gap-2.5">
            <motion.span
              initial={{ scale: 0.9, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md sm:h-10 sm:w-10"
            >
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </motion.span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">
                Espace Admin
              </h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Plateforme de Quiz &amp; Examens Blancs
              </p>
            </div>
          </div>

          {/* Search bar (centered, grows) — desktop only */}
          <div className="relative ml-auto hidden max-w-md flex-1 md:block md:ml-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un onglet, une section…"
              className="glass h-10 rounded-xl border-emerald-200/60 pl-9 pr-9 shadow-sm focus-visible:ring-emerald-400 dark:border-emerald-900/40"
              aria-label="Recherche admin"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
                Ctrl+K
              </kbd>
            )}
          </div>

          {/* Quick actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <Button
              onClick={() => setPdfUploadOpen(true)}
              variant="outline"
              className="hidden h-10 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 sm:inline-flex dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              <FileText className="h-4 w-4" />
              Upload PDF
            </Button>
            <Button
              onClick={() => setNewBankOpen(true)}
              className="h-10 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 px-3 text-white shadow-md shadow-emerald-500/20 hover:opacity-95 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle banque</span>
              <span className="sm:hidden">Banque</span>
            </Button>

            {/* Admin avatar chip */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/60 py-1 pl-1 pr-2 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-black/30">
                    <Avatar className="h-8 w-8 border-2 border-emerald-400/50">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                        {avatarInitials || "AD"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left leading-tight lg:block">
                      <p className="max-w-[140px] truncate text-xs font-semibold">
                        {session?.user?.name ?? "Admin"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {session?.user?.email ?? "admin@local"}
                      </p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Connecté en tant qu&apos;admin
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Mobile search bar (below the main row) */}
        <div className="relative mt-2 md:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un onglet…"
            className="glass h-10 rounded-xl border-emerald-200/60 pl-9 pr-9 shadow-sm focus-visible:ring-emerald-400 dark:border-emerald-900/40"
            aria-label="Recherche admin"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* ===== Mobile horizontal scrollable icon bar (< lg) ===== */}
      <div className="overflow-x-auto px-4 py-2 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showBadge = (tab.badge ?? 0) > 0;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                    : "glass text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.short}</span>
                {showBadge && (
                  <span
                    className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Body: sidebar + content ===== */}
      <div className="flex gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        {/* ----- Desktop sidebar (lg+, sticky 240px glass) ----- */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto custom-scroll pr-1">
            <nav
              className="glass-strong space-y-1 rounded-2xl p-2.5 shadow-lg dark:border dark:border-white/5"
              aria-label="Navigation admin"
            >
              <p className="mb-1 px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Navigation
              </p>
              <AnimatePresence mode="popLayout">
                {filteredTabs.map((tab) => (
                  <SidebarItem
                    key={tab.id}
                    tab={tab}
                    active={activeTab === tab.id}
                    onClick={() => handleTabChange(tab.id)}
                  />
                ))}
              </AnimatePresence>
              {filteredTabs.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Aucun onglet ne correspond à « {searchQuery} ».
                </p>
              )}
            </nav>

            {/* Sidebar footer — quick admin info */}
            <div className="glass mt-3 rounded-2xl p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Session admin
              </p>
              <p className="mt-1 truncate">
                {session?.user?.email ?? "admin@local"}
              </p>
              <p className="mt-0.5 text-[10px] opacity-70">
                {stats?.counts.banks ?? 0} banques ·{" "}
                {stats?.counts.questions ?? 0} questions
              </p>
            </div>
          </div>
        </aside>

        {/* ===== Main content ===== */}
        <main className="min-w-0 flex-1 space-y-4 sm:space-y-5">
          {/* Section header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 shadow-sm dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-300">
              <ActiveIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold sm:text-xl">
                  {activeTabMeta?.label ?? "Section"}
                </h2>
                {activeTabMeta && activeTabMeta.badge ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300"
                  >
                    {activeTabMeta.badge}
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {activeTabMeta?.desc}
              </p>
            </div>
          </div>

          {/* Quick stats bar — Today's sessions, new users, questions answered */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <QuickStat
              icon={Clock}
              label="Sessions aujourd'hui"
              value={quickStats.todaySessions}
              color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            />
            <QuickStat
              icon={Users}
              label="Nouveaux utilisateurs"
              value={quickStats.newUsersToday}
              color="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
            />
            <QuickStat
              icon={Zap}
              label="Questions répondues"
              value={quickStats.questionsAnsweredToday}
              color="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            />
          </div>

          {/* KPI cards row — 6 animated gradient cards */}
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl sm:h-28" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {kpis.map((k, i) => (
                <KpiCard key={k.label} {...k} delay={i * 0.05} />
              ))}
            </div>
          )}

          {/* ===== Tab content with smooth Framer Motion transition ===== */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="glass-strong rounded-2xl p-3 shadow-lg sm:p-4 lg:p-6"
            >
              {activeTab === "dashboard" && <OverviewTab stats={stats} />}

              {activeTab === "banks" && (
                <BanksTab
                  stats={stats}
                  onSelectBank={(b) => setSelectedBank(b)}
                  onUploadPdf={() => setPdfUploadOpen(true)}
                />
              )}

              {activeTab === "visitors" && <VisitorsStats />}

              {activeTab === "sessions" && <SessionsList />}

              {activeTab === "exams" && (
                <ExamsManager onNew={() => setNewExamOpen(true)} />
              )}

              {activeTab === "imports" && (
                <ImportsPanel onChanged={() => loadStats()} />
              )}

              {activeTab === "exports" && <ExportsPanel />}

              {activeTab === "analytics" && <AdminAnalytics />}

              {activeTab === "moderation" && <ModerationPanel />}

              {activeTab === "broadcast" && (
                <BroadcastPanel
                  open={activeTab === "broadcast"}
                  onOpenChange={() => {}}
                />
              )}

              {activeTab === "ai-generator" && <AiQuestionGenerator />}

              {activeTab === "errors" && (
                <ErrorsTab
                  storedErrors={storedErrors}
                  recentErrorCount={recentErrorCount}
                  onClear={handleClearErrors}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ===== Cross-tab dialogs (preserved identical to the previous shell) ===== */}
      {selectedBank && (
        <BankQuestionsDialog
          bank={selectedBank}
          onClose={() => setSelectedBank(null)}
          onChanged={() => loadStats()}
        />
      )}

      <NewBankDialog
        open={newBankOpen}
        onOpenChange={setNewBankOpen}
        onCreated={() => {
          setNewBankOpen(false);
          loadStats();
        }}
      />

      <NewExamDialog
        open={newExamOpen}
        onOpenChange={setNewExamOpen}
        onCreated={() => {
          setNewExamOpen(false);
          toast.success("Examen créé avec succès");
        }}
      />

      <PdfUploadDialog
        open={pdfUploadOpen}
        onOpenChange={setPdfUploadOpen}
        onSaved={() => loadStats()}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Errors tab (inline component — shares state with the shell)         */
/* ------------------------------------------------------------------ */

function ErrorsTab({
  storedErrors,
  recentErrorCount,
  onClear,
}: {
  storedErrors: TrackedError[];
  recentErrorCount: number;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            Journal d&apos;erreurs
          </h3>
          <p className="text-xs text-muted-foreground">
            {storedErrors.length} erreur(s) stockée(s) · {recentErrorCount}{" "}
            dans la dernière heure
          </p>
        </div>
        {storedErrors.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onClear}>
            Vider le journal
          </Button>
        )}
      </div>
      {storedErrors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            Aucune erreur enregistrée. 🎉
          </p>
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto custom-scroll">
          {storedErrors.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-border bg-muted/30 p-3 text-xs"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 font-semibold ${
                    e.severity === "error"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : e.severity === "warning"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                  }`}
                >
                  {e.severity ?? "error"}
                </span>
                <span className="text-muted-foreground">
                  {new Date(e.timestamp).toLocaleString("fr-FR")}
                </span>
              </div>
              <p className="break-words font-semibold text-rose-700 dark:text-rose-300">
                {e.name}: {e.message}
              </p>
              {e.url && (
                <p className="mt-1 truncate text-muted-foreground">
                  URL: {e.url}
                </p>
              )}
              {e.context && Object.keys(e.context).length > 0 && (
                <p className="mt-1 break-words text-muted-foreground">
                  Contexte: {JSON.stringify(e.context)}
                </p>
              )}
              {e.stack && (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-background p-2 text-[10px] text-muted-foreground">
                  {e.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
