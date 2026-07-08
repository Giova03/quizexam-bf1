"use client";

/**
 * AdminView — Ultra-modern command center.
 *
 * Design: Bento grid dashboard with segmented control navigation.
 * No sidebar, no dropdown — everything visible on one screen.
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

/* ===== Types ===== */
interface TabDef {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
  desc: string;
  badge?: number;
}

interface KpiProps {
  icon: LucideIcon;
  label: string;
  value: number;
  gradient: string;
  trend?: number;
  trendLabel?: string;
}

/* ===== Animated counter ===== */
function AnimatedCounter({ value, duration = 0.8 }: { value: number; duration?: number }) {
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

  return <>{display.toLocaleString("fr-FR")}</>;
}

/* ===== KPI Card ===== */
function KpiCard({ icon: Icon, label, value, gradient, trend, trendLabel }: KpiProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={`relative overflow-hidden rounded-2xl ${gradient} p-4 text-white shadow-lg sm:p-5`}
    >
      <div className="absolute -right-3 -top-3 opacity-15">
        <Icon className="h-16 w-16" />
      </div>
      <div className="relative z-10">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/80">{label}</p>
        <p className="mt-1 text-2xl font-bold sm:text-3xl">
          <AnimatedCounter value={value} />
        </p>
        {trend !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-white/70">
            <TrendingUp className="h-3 w-3" />
            <span>+{trend}%</span>
            {trendLabel && <span className="hidden sm:inline">· {trendLabel}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ===== Quick stat pill ===== */
function QuickStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-3 py-2 backdrop-blur">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

/* ===== Main AdminView ===== */
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

  /* Fetch admin stats */
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

  useEffect(() => {
    loadStats();
    fetch("/api/admin/init", { method: "POST" }).catch(() => {});
  }, [loadStats]);

  /* Pending reports */
  const loadPendingReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports?status=pending", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPendingReports(Array.isArray(data) ? data.length : 0);
    } catch {}
  }, []);

  useEffect(() => {
    loadPendingReports();
    const id = setInterval(loadPendingReports, 60_000);
    return () => clearInterval(id);
  }, [loadPendingReports]);

  /* Error tracking */
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

  /* Tab definitions */
  const TABS: TabDef[] = useMemo(
    () => [
      { id: "dashboard", label: "Vue d'ensemble", short: "Vue", icon: BarChart3, desc: "Tableau de bord principal" },
      { id: "banks", label: "Banques", short: "Banques", icon: Database, desc: "Banques de questions" },
      { id: "visitors", label: "Visiteurs", short: "Visit.", icon: Users, desc: "Utilisateurs inscrits" },
      { id: "sessions", label: "Sessions", short: "Sess.", icon: Activity, desc: "Sessions récentes" },
      { id: "exams", label: "Examens", short: "Exam.", icon: GraduationCap, desc: "Examens blancs" },
      { id: "imports", label: "Import", short: "Import", icon: Upload, desc: "Import de contenu" },
      { id: "exports", label: "Export", short: "Export", icon: Download, desc: "Export CSV" },
      { id: "analytics", label: "Analytics", short: "Analy.", icon: LineChart, desc: "Statistiques avancées" },
      { id: "moderation", label: "Modération", short: "Mod.", icon: ShieldAlert, badge: pendingReports, desc: "Signalements" },
      { id: "broadcast", label: "Broadcast", short: "Mail", icon: Mail, desc: "Email de masse" },
      { id: "ai-generator", label: "Générateur IA", short: "IA", icon: Bot, desc: "Générer des QCM" },
      { id: "errors", label: "Erreurs", short: "Err.", icon: AlertTriangle, badge: recentErrorCount, desc: "Journal d'erreurs" },
    ],
    [pendingReports, recentErrorCount],
  );

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

  /* KPI data */
  const kpis: KpiProps[] = useMemo(
    () => [
      { icon: BookOpen, label: "Banques", value: stats?.counts.banks ?? 0, gradient: "bg-gradient-to-br from-emerald-500 to-teal-600", trend: 8 },
      { icon: FileQuestion, label: "Questions", value: stats?.counts.questions ?? 0, gradient: "bg-gradient-to-br from-violet-500 to-purple-600", trend: 12 },
      { icon: Trophy, label: "Examens", value: stats?.counts.exams ?? 0, gradient: "bg-gradient-to-br from-amber-500 to-orange-600", trend: 3 },
      { icon: Users, label: "Utilisateurs", value: stats?.counts.users ?? 0, gradient: "bg-gradient-to-br from-sky-500 to-cyan-600", trend: 5 },
      { icon: Activity, label: "Sessions", value: stats?.counts.sessions ?? 0, gradient: "bg-gradient-to-br from-rose-500 to-pink-600", trend: 15 },
      { icon: TrendingUp, label: "Terminées", value: stats?.counts.completedSessions ?? 0, gradient: "bg-gradient-to-br from-teal-500 to-emerald-600", trend: 9 },
    ],
    [stats],
  );

  /* Quick stats */
  const quickStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentSessions = stats?.recentSessions ?? [];
    const todaySessions = recentSessions.filter((s) => new Date(s.completedAt) >= today).length;
    const recentUsers = stats?.recentUsers ?? [];
    const newUsersToday = recentUsers.filter((u) => new Date(u.createdAt) >= today).length;
    const questionsAnsweredToday = recentSessions
      .filter((s) => new Date(s.completedAt) >= today)
      .reduce((sum, s) => sum + s.totalQuestions, 0);
    return { todaySessions, newUsersToday, questionsAnsweredToday };
  }, [stats]);

  const activeTabMeta = TABS.find((t) => t.id === activeTab);
  const ActiveIcon = activeTabMeta?.icon ?? BarChart3;

  const avatarInitials = useMemo(() => {
    const name = session?.user?.name || session?.user?.email || "Admin";
    return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  }, [session]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
    setSearchQuery("");
  }, []);

  /* ===== Render ===== */
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 gradient-mesh opacity-30" />

      {/* ===== Header ===== */}
      <header className="glass-strong sticky top-0 z-30 border-b border-emerald-100/60 px-4 py-3 dark:border-emerald-900/40">
        <div className="flex flex-wrap items-center gap-3">
          {/* Logo */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">Espace Admin</h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                {stats?.counts.banks ?? 0} banques · {stats?.counts.questions ?? 0} questions
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher…"
              className="glass h-10 rounded-xl pl-9 pr-9"
              aria-label="Recherche admin"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => setPdfUploadOpen(true)}
              variant="outline"
              className="hidden h-10 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 sm:inline-flex dark:border-emerald-800 dark:text-emerald-300"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden lg:inline">Upload PDF</span>
            </Button>
            <Button
              onClick={() => setNewBankOpen(true)}
              className="h-10 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 px-3 text-white shadow-md hover:opacity-95 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle banque</span>
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/60 py-1 pl-1 pr-2 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-black/30">
              <Avatar className="h-8 w-8 border-2 border-emerald-400/50">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                  {avatarInitials || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight lg:block">
                <p className="max-w-[120px] truncate text-xs font-semibold">{session?.user?.name ?? "Admin"}</p>
                <p className="text-[10px] text-muted-foreground">{session?.user?.email ?? ""}</p>
              </div>
            </div>
          </div>

          {/* Mobile search */}
          <div className="relative w-full md:hidden">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un onglet…"
              className="glass h-10 rounded-xl pl-9 pr-9"
            />
          </div>
        </div>
      </header>

      {/* ===== KPI Cards (only on dashboard tab) ===== */}
      {activeTab === "dashboard" && (
        <div className="px-4 pt-4 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
              ))}
            </div>
          )}

          {/* Quick stats */}
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickStat icon={Activity} label="Sessions aujourd'hui" value={quickStats.todaySessions} />
            <QuickStat icon={Users} label="Nouveaux utilisateurs" value={quickStats.newUsersToday} />
            <QuickStat icon={FileQuestion} label="Questions répondues" value={quickStats.questionsAnsweredToday} />
          </div>
        </div>
      )}

      {/* ===== Segmented control tab bar ===== */}
      <div className="sticky top-[73px] z-20 px-4 py-3 sm:px-6">
        <div className="glass-strong flex items-center gap-1 overflow-x-auto rounded-2xl p-2 shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showBadge = (tab.badge ?? 0) > 0;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {showBadge && (
                  <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${isActive ? "bg-white/25 text-white" : "bg-rose-500 text-white"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
          {filteredTabs.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Aucun résultat.</p>
          )}
        </div>
      </div>

      {/* ===== Content ===== */}
      <div className="px-4 pb-8 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 shadow-sm dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-300">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold sm:text-xl">
                  {activeTabMeta?.label ?? "Section"}
                </h2>
                <p className="truncate text-sm text-muted-foreground">
                  {activeTabMeta?.desc ?? ""}
                </p>
              </div>
            </div>

            {/* Tab content */}
            {loading && activeTab === "dashboard" ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
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
                {activeTab === "exams" && <ExamsManager onNew={() => setNewExamOpen(true)} />}
                {activeTab === "imports" && <ImportsPanel onChanged={() => loadStats()} />}
                {activeTab === "exports" && <ExportsPanel />}
                {activeTab === "analytics" && <AdminAnalytics />}
                {activeTab === "moderation" && <ModerationPanel />}
                {activeTab === "broadcast" && <BroadcastPanel open={true} onOpenChange={() => {}} />}
                {activeTab === "ai-generator" && <AiQuestionGenerator />}
                {activeTab === "errors" && (
                  <ErrorsTab
                    storedErrors={storedErrors}
                    recentErrorCount={recentErrorCount}
                    onClear={handleClearErrors}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ===== Dialogs ===== */}
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

/* ===== Errors Tab ===== */
function ErrorsTab({
  storedErrors,
  recentErrorCount,
  onClear,
}: {
  storedErrors: TrackedError[];
  recentErrorCount: number;
  onClear: () => void;
}) {
  if (storedErrors.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucune erreur tracked. La plateforme fonctionne correctement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="gap-1.5 border-rose-300 text-rose-700">
          <AlertTriangle className="h-3 w-3" />
          {recentErrorCount} erreurs récentes
        </Badge>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
          Effacer
        </Button>
      </div>
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">
        {storedErrors.map((err, i) => (
          <div key={i} className="glass rounded-xl p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="break-words font-medium text-rose-700 dark:text-rose-300">
                {err.name}: {err.message}
              </p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {new Date(err.timestamp).toLocaleTimeString("fr-FR")}
              </span>
            </div>
            {err.stack && (
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
                {err.stack.slice(0, 500)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
