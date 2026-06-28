"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
<<<<<<< Updated upstream
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
=======
  Plus,
  BarChart3,
  Download,
  Mail,
  GraduationCap,
  FileInput,
  ShieldAlert,
  LineChart,
>>>>>>> Stashed changes
} from "lucide-react";
import { toast } from "sonner";
import { PdfUploadDialog } from "@/components/quiz/pdf-upload-dialog";
import { AdminAnalytics } from "@/components/quiz/admin-analytics";
import { AiQuestionGenerator } from "@/components/quiz/ai-question-generator";

<<<<<<< Updated upstream
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
=======
import type { AdminStats, BankWithCount } from "./admin/types";
import { AdminOverview } from "./admin/admin-overview";
import { VisitorsStats, ProgressTracker } from "./admin/admin-visitors";
import { AdminBanks, BankQuestionsDialog, NewBankDialog } from "./admin/admin-banks";
import { SessionsList } from "./admin/admin-sessions";
import { ExamsManager, NewExamDialog } from "./admin/admin-exams";
import { ExportsPanel, BroadcastPanel } from "./admin/admin-exports";
import { ImportsPanel } from "./admin/admin-import";
import { AdminAnalytics } from "./admin/admin-analytics";
import { ModerationPanel } from "./moderation-panel";

/**
 * AdminView — point d'entrée du panneau d'administration.
 *
 * Composant orchestrateur :
 *  - Charge les statistiques (GET /api/admin/stats)
 *  - Vérifie le rôle ADMIN
 *  - Affiche la barre de navigation par onglets
 *  - Délègue chaque onglet à un module dédié dans ./admin/
 *
 * Toute la logique métier a été extraite dans ces modules :
 *  - admin-overview.tsx      → Vue d'ensemble + TopPerformers/Alertes
 *  - admin-visitors.tsx      → Visiteurs + Progression
 *  - admin-banks.tsx         → Banques, BankQuestionsDialog, QuestionEditor, NewBankDialog
 *  - admin-sessions.tsx      → Liste des sessions
 *  - admin-exams.tsx         → ExamsManager + NewExamDialog
 *  - admin-exports.tsx       → Export CSV + Broadcast
 *  - admin-import.tsx        → ImportsPanel (5 méthodes d'import)
 *  - types.ts                → Interfaces partagées
>>>>>>> Stashed changes
 */
export function AdminView() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankWithCount | null>(null);
  const [newBankOpen, setNewBankOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newExamOpen, setNewExamOpen] = useState(false);
<<<<<<< Updated upstream
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [pdfUploadOpen, setPdfUploadOpen] = useState(false);
=======
>>>>>>> Stashed changes

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    fetch("/api/admin/init", { method: "POST" }).catch(() => {});
  }, [loadStats]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  if (!isAdmin) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Accès réservé à l&apos;administrateur. Connectez-vous avec le compte
          admin.
        </p>
      </Card>
    );
  }

<<<<<<< Updated upstream
  // Tab definitions — order matters (matches the visible button order).
  const TABS = [
    { id: "overview", label: "Vue d'ensemble", icon: TrendingUp },
=======
  // Configuration des onglets (label + icône)
  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: TrendingUp },
    { id: "analytics", label: "Analytics", icon: LineChart },
>>>>>>> Stashed changes
    { id: "visitors", label: "Visiteurs", icon: Users },
    { id: "progress", label: "Progression", icon: BarChart3 },
    { id: "banks", label: "Banques & QCM", icon: Database },
    { id: "sessions", label: "Sessions", icon: Activity },
    { id: "exams", label: "Examens", icon: GraduationCap },
<<<<<<< Updated upstream
    { id: "exports", label: "Export", icon: Download },
    { id: "broadcast", label: "Broadcast", icon: Mail },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "moderation", label: "Modération", icon: ShieldAlert },
    { id: "ai-generator", label: "Générateur IA", icon: Sparkles },
=======
    { id: "imports", label: "Import", icon: FileInput },
    { id: "exports", label: "Export", icon: Download },
    { id: "moderation", label: "Modération", icon: ShieldAlert },
    { id: "broadcast", label: "Broadcast", icon: Mail },
>>>>>>> Stashed changes
  ] as const;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
            Panneau d&apos;administration
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

<<<<<<< Updated upstream
      {/* Tab navigation — simple buttons for maximum reliability (NOT Radix Tabs). */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
=======
      {/* Navigation par onglets */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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

      {activeTab === "ai-generator" && <AiQuestionGenerator />}

      {/* === Cross-tab dialogs === */}
=======
      {/* Contenu de l'onglet actif */}
      {activeTab === "overview" && <AdminOverview stats={stats} />}

      {activeTab === "analytics" && <AdminAnalytics />}

      {activeTab === "visitors" && <VisitorsStats />}

      {activeTab === "progress" && <ProgressTracker />}

      {activeTab === "banks" && (
        <AdminBanks stats={stats} onSelectBank={setSelectedBank} />
      )}

      {activeTab === "sessions" && <SessionsList />}

      {activeTab === "exams" && <ExamsManager onNew={() => setNewExamOpen(true)} />}

      {activeTab === "imports" && <ImportsPanel onChanged={() => loadStats()} />}

      {activeTab === "exports" && <ExportsPanel />}

      {activeTab === "moderation" && <ModerationPanel />}

      {activeTab === "broadcast" && <BroadcastPanel />}

      {/* Dialogues globaux */}
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

      <PdfUploadDialog
        open={pdfUploadOpen}
        onOpenChange={setPdfUploadOpen}
        onSaved={() => loadStats()}
      />
    </div>
  );
}
=======
    </div>
  );
}

// Ré-export des icônes utilisées ailleurs (compatibilité)
export { Users, FileQuestion, BookOpen, Trophy, Activity, Database, TrendingUp };
>>>>>>> Stashed changes
