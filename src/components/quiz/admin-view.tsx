"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { VisitorsStats, ProgressTracker } from "@/components/quiz/admin/admin-visitors";
import { BanksTab, NewBankDialog } from "@/components/quiz/admin/admin-banks";
import { BankQuestionsDialog } from "@/components/quiz/admin/admin-bank-dialog";
import { SessionsList } from "@/components/quiz/admin/admin-sessions";
import { ExamsManager, NewExamDialog } from "@/components/quiz/admin/admin-exams";
import { ExportsPanel } from "@/components/quiz/admin/admin-exports";
import { ImportsPanel } from "@/components/quiz/admin/admin-import";
import { BroadcastPanel } from "@/components/quiz/admin/admin-broadcast";
import { ModerationPanel } from "@/components/quiz/admin/admin-moderation";

import type { AdminStats, BankWithCount } from "@/components/quiz/admin/types";

/**
 * AdminView — ultra-modern admin panel shell.
 *
 * Layout:
 *   Desktop (lg+): glassmorphism left sidebar (240px) + main content area.
 *   Mobile: sticky horizontal icon bar at the top + content below.
 *
 * Features:
 *   - Sticky, scrollable glass sidebar with icon + label buttons.
 *   - Modern KPI strip with gradient backgrounds + animated counters.
 *   - Smooth Framer Motion transitions between tabs.
 *   - Global search bar at the top (filters sidebar items).
 *   - Notification badge on "Modération" (pending reports count) and on
 *     "Erreurs" (recent tracked errors).
 *
 * All tab content components live in ./admin/*.tsx and ./admin-*.tsx; this
 * file is just the shell that houses them.
 */

/* ------------------------------------------------------------------ */
/* Animated counter                                                    */
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
    if (delta === 0) {
      // No animation needed — keep the existing display value.
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const t = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(startVal + delta * eased);
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="tabular-nums">{display.toLocaleString("fr-FR")}</span>;
}

/* ------------------------------------------------------------------ */
/* KPI card with gradient + animated counter                           */
/* ------------------------------------------------------------------ */

interface KpiProps {
  icon: LucideIcon;
  label: string;
  value: number;
  gradient: string;
  delay?: number;
}

function KpiCard({ icon: Icon, label, value, gradient, delay = 0 }: KpiProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={`glass relative overflow-hidden rounded-xl p-3 text-white shadow-md sm:p-4 ${gradient}`}
    >
      {/* Decorative watermark icon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-3 opacity-20"
      >
        <Icon className="h-14 w-14 sm:h-16 sm:w-16" />
      </div>
      <div className="relative z-10">
        <Icon className="h-4 w-4 opacity-90 sm:h-5 sm:w-5" />
        <p className="mt-1.5 text-xl font-bold sm:text-2xl">
          <AnimatedCounter value={value} />
        </p>
        <p className="text-[10px] font-medium opacity-90 sm:text-xs">{label}</p>
      </div>
    </motion.div>
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
  /** Optional badge count (e.g. pending reports). */
  badge?: number;
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
  const [activeTab, setActiveTab] = useState("overview");
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
      } else {
        console.error("Failed to load admin stats", await res.text());
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

  /* ----- Pending reports count (for moderation badge) ----- */
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

  /* ----- Tab list (order matches the spec) ----- */
  const TABS: TabDef[] = useMemo(
    () => [
      { id: "overview", label: "Vue d'ensemble", short: "Vue", icon: BarChart3 },
      { id: "visitors", label: "Visiteurs", short: "Visit.", icon: Users },
      { id: "progress", label: "Progression", short: "Progr.", icon: TrendingUp },
      { id: "banks", label: "Banques & QCM", short: "Banques", icon: Database },
      { id: "sessions", label: "Sessions", short: "Sess.", icon: Activity },
      { id: "exams", label: "Examens", short: "Exam.", icon: GraduationCap },
      { id: "imports", label: "Import", short: "Import", icon: Upload },
      { id: "exports", label: "Export", short: "Export", icon: Download },
      { id: "broadcast", label: "Broadcast", short: "Mail", icon: Mail },
      { id: "analytics", label: "Analytics", short: "Analy.", icon: LineChart },
      {
        id: "moderation",
        label: "Modération",
        short: "Mod.",
        icon: ShieldAlert,
        badge: pendingReports,
      },
      { id: "ai-generator", label: "Générateur IA", short: "IA", icon: Bot },
      {
        id: "errors",
        label: "Erreurs",
        short: "Err.",
        icon: AlertTriangle,
        badge: recentErrorCount,
      },
    ],
    [pendingReports, recentErrorCount],
  );

  /* ----- Filter tabs by search query (sidebar only — mobile bar always shows all) ----- */
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
      },
      {
        icon: FileQuestion,
        label: "Questions",
        value: stats?.counts.questions ?? 0,
        gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
      },
      {
        icon: Trophy,
        label: "Examens",
        value: stats?.counts.exams ?? 0,
        gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
      },
      {
        icon: Users,
        label: "Utilisateurs",
        value: stats?.counts.users ?? 0,
        gradient: "bg-gradient-to-br from-sky-500 to-cyan-600",
      },
      {
        icon: Activity,
        label: "Sessions",
        value: stats?.counts.sessions ?? 0,
        gradient: "bg-gradient-to-br from-rose-500 to-pink-600",
      },
      {
        icon: TrendingUp,
        label: "Terminées",
        value: stats?.counts.completedSessions ?? 0,
        gradient: "bg-gradient-to-br from-teal-500 to-emerald-600",
      },
    ],
    [stats],
  );

  /* ----- Active tab meta (for the title in the content header) ----- */
  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold sm:text-2xl">
            <motion.span
              initial={{ scale: 0.9, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md"
            >
              <ShieldCheck className="h-5 w-5" />
            </motion.span>
            <span className="min-w-0">Panneau d&apos;administration</span>
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Gérez les banques, questions, utilisateurs et statistiques
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPdfUploadOpen(true)}
            variant="outline"
            className="h-11 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 sm:h-9 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <FileText className="h-4 w-4" />
            Upload PDF
          </Button>
          <Button
            onClick={() => setNewBankOpen(true)}
            className="h-11 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 sm:h-9"
          >
            <Plus className="h-4 w-4" />
            Nouvelle banque
          </Button>
        </div>
      </div>

      {/* ===== Global search bar ===== */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher dans le panneau admin (onglets, sections…)"
          className="glass h-11 rounded-xl border-emerald-200/60 pl-9 pr-4 shadow-sm focus-visible:ring-emerald-400 sm:h-10 dark:border-emerald-900/40"
          aria-label="Recherche admin"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            aria-label="Effacer la recherche"
          >
            ✕
          </button>
        )}
      </div>

      {/* ===== Main layout: sidebar + content ===== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* ----- Desktop sidebar (lg+, 240px sticky glass) ----- */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scroll pr-1">
            <nav
              className="glass-strong space-y-1 rounded-2xl p-2 shadow-lg dark:border dark:border-white/5"
              aria-label="Navigation admin"
            >
              <AnimatePresence mode="popLayout">
                {filteredTabs.map((tab, i) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const showBadge = (tab.badge ?? 0) > 0;
                  return (
                    <motion.button
                      key={tab.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18, delay: i * 0.015 }}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery("");
                      }}
                      className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                          : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? "text-white" : ""
                        }`}
                      />
                      <span className="flex-1 truncate text-left">
                        {tab.label}
                      </span>
                      {showBadge && (
                        <span
                          className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                            isActive
                              ? "bg-white/25 text-white"
                              : "bg-rose-500 text-white"
                          }`}
                          title={`${tab.badge} en attente`}
                        >
                          {tab.badge}
                        </span>
                      )}
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.span
                          layoutId="admin-active-bar"
                          className="absolute inset-y-1 left-0 w-1 rounded-full bg-white/80"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
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
                <ShieldCheck className="h-3.5 w-3.5" />
                Session admin
              </p>
              <p className="mt-1 truncate">
                {session?.user?.email ?? "admin@local"}
              </p>
              <p className="mt-0.5 text-[10px] opacity-70">
                {stats?.counts.banks ?? 0} banques · {stats?.counts.questions ?? 0}{" "}
                questions
              </p>
            </div>
          </div>
        </aside>

        {/* ----- Mobile horizontal scrollable icon bar ----- */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = (tab.badge ?? 0) > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
                        isActive ? "bg-white/25 text-white" : "bg-rose-500 text-white"
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

        {/* ===== Main content ===== */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Active tab title (hidden on mobile — the icon bar serves the same role) */}
          <div className="hidden items-center gap-2 lg:flex">
            {activeTabMeta && (
              <>
                <activeTabMeta.icon className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold">{activeTabMeta.label}</h2>
                {activeTabMeta.badge ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300"
                  >
                    {activeTabMeta.badge}
                  </Badge>
                ) : null}
              </>
            )}
          </div>

          {/* KPI strip — always visible (gradient cards with animated counters) */}
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl sm:h-24" />
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {activeTab === "overview" && <OverviewTab stats={stats} />}

              {activeTab === "visitors" && <VisitorsStats />}

              {activeTab === "progress" && <ProgressTracker />}

              {activeTab === "banks" && (
                <BanksTab
                  stats={stats}
                  onSelectBank={(b) => setSelectedBank(b)}
                  onUploadPdf={() => setPdfUploadOpen(true)}
                />
              )}

              {activeTab === "sessions" && <SessionsList />}

              {activeTab === "exams" && (
                <ExamsManager onNew={() => setNewExamOpen(true)} />
              )}

              {activeTab === "imports" && (
                <ImportsPanel onChanged={() => loadStats()} />
              )}

              {activeTab === "exports" && <ExportsPanel />}

              {activeTab === "broadcast" && (
                <BroadcastPanel
                  open={activeTab === "broadcast"}
                  onOpenChange={() => {}}
                />
              )}

              {activeTab === "analytics" && <AdminAnalytics />}

              {activeTab === "moderation" && <ModerationPanel />}

              {activeTab === "errors" && (
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                        Journal d&apos;erreurs
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {storedErrors.length} erreur(s) stockée(s) ·{" "}
                        {recentErrorCount} dans la dernière heure
                      </p>
                    </div>
                    {storedErrors.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleClearErrors}
                      >
                        Vider le journal
                      </Button>
                    )}
                  </div>
                  {storedErrors.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Aucune erreur enregistrée. 🎉
                    </p>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto custom-scroll">
                      {storedErrors.map((e) => (
                        <div
                          key={e.id}
                          className="rounded-lg border border-border bg-muted/30 p-3 text-xs"
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
                </Card>
              )}

              {activeTab === "ai-generator" && <AiQuestionGenerator />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ===== Cross-tab dialogs (kept identical to the previous shell) ===== */}
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
