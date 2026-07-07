"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  Database,
  Activity,
  GraduationCap,
  Download,
  Mail,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Plus,
  FileText,
  Sparkles,
  AlertTriangle,
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
import { BroadcastPanel } from "@/components/quiz/admin/admin-broadcast";
import { ModerationPanel } from "@/components/quiz/admin/admin-moderation";

import type { AdminStats, BankWithCount } from "@/components/quiz/admin/types";

/**
 * AdminView — top-level admin panel container.
 *
 * Responsibilities (kept intentionally narrow):
 *   - Fetch admin stats on mount (+ call /api/admin/init to ensure the
 *     admin account exists).
 *   - Render the sticky header (title + Upload PDF / Nouvelle banque buttons).
 *   - Render the button-based tab navigation (NOT Radix Tabs — buttons give
 *     maximum reliability and avoid state-sync issues with HMR).
 *   - Render the active tab's content by delegating to the relevant
 *     sub-component in ./admin/*.
 *   - Manage the few pieces of dialog state that span multiple tabs
 *     (selected bank, new bank, new exam, broadcast, pdf upload).
 *
 * All tab content components live in ./admin/*.tsx; this file is just the
 * shell.
 */
export function AdminView() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankWithCount | null>(null);
  const [newBankOpen, setNewBankOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newExamOpen, setNewExamOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [pdfUploadOpen, setPdfUploadOpen] = useState(false);

  // Fetch admin stats from /api/admin/stats.
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

  // Initial load — also ensure the admin account exists.
  useEffect(() => {
    loadStats();
    fetch("/api/admin/init", { method: "POST" }).catch((e) =>
      console.error("Admin init failed", e)
    );
  }, [loadStats]);

  // Tab definitions — order matters (matches the visible button order).
  const TABS = [
    { id: "overview", label: "Vue d'ensemble", icon: TrendingUp },
    { id: "visitors", label: "Visiteurs", icon: Users },
    { id: "progress", label: "Progression", icon: BarChart3 },
    { id: "banks", label: "Banques & QCM", icon: Database },
    { id: "sessions", label: "Sessions", icon: Activity },
    { id: "exams", label: "Examens", icon: GraduationCap },
    { id: "exports", label: "Export", icon: Download },
    { id: "broadcast", label: "Broadcast", icon: Mail },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "moderation", label: "Modération", icon: ShieldAlert },
    { id: "errors", label: "Erreurs", icon: AlertTriangle },
    { id: "ai-generator", label: "Générateur IA", icon: Sparkles },
  ] as const;

  // E6.6 — error-tracking badge (recent errors in the last 60 min).
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

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
            Panneau d&apos;administration
            {recentErrorCount > 0 && (
              <Badge
                className="cursor-pointer gap-1 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                onClick={() => setActiveTab("errors")}
                title={`${recentErrorCount} erreur(s) dans la dernière heure`}
              >
                <AlertTriangle className="h-3 w-3" />
                {recentErrorCount} erreur(s)
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Gérez les banques, questions, utilisateurs et statistiques
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPdfUploadOpen(true)}
            variant="outline"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <FileText className="h-4 w-4" />
            Upload PDF
          </Button>
          <Button
            onClick={() => setNewBankOpen(true)}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            <Plus className="h-4 w-4" />
            Nouvelle banque
          </Button>
        </div>
      </div>

      {/* Tab navigation — simple buttons for maximum reliability (NOT Radix Tabs). */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-border bg-card text-muted-foreground hover:border-emerald-300 hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* === Tab content === */}
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

      {activeTab === "exams" && <ExamsManager onNew={() => setNewExamOpen(true)} />}

      {activeTab === "exports" && <ExportsPanel />}

      {activeTab === "broadcast" && (
        <BroadcastPanel open={broadcastOpen} onOpenChange={setBroadcastOpen} />
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
                {storedErrors.length} erreur(s) stockée(s) · {recentErrorCount}{" "}
                dans la dernière heure
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
                  <p className="font-semibold text-rose-700 dark:text-rose-300">
                    {e.name}: {e.message}
                  </p>
                  {e.url && (
                    <p className="mt-1 truncate text-muted-foreground">
                      URL: {e.url}
                    </p>
                  )}
                  {e.context && Object.keys(e.context).length > 0 && (
                    <p className="mt-1 text-muted-foreground">
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

      {/* === Cross-tab dialogs === */}
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
