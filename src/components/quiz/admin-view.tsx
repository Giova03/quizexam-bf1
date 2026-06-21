"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  FileQuestion,
  BookOpen,
  Trophy,
  Activity,
  ShieldCheck,
  Database,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Download,
  Mail,
  GraduationCap,
  AlertTriangle,
  Star,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface AdminStats {
  counts: {
    banks: number;
    questions: number;
    exams: number;
    users: number;
    sessions: number;
    completedSessions: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  }>;
  recentSessions: Array<{
    id: string;
    title: string;
    score: number;
    totalQuestions: number;
    completedAt: string;
    user: { name: string | null; email: string | null } | null;
  }>;
  bankStats: Array<{
    id: string;
    title: string;
    category: string;
    subcategory: string;
    _count: { questions: number };
  }>;
}

interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswer2?: string | null;
  explanation: string;
  order: number;
}

interface BankWithCount {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  _count: { questions: number };
}

export function AdminView() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankWithCount | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [newBankOpen, setNewBankOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newExamOpen, setNewExamOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

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

  if (loading)
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

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  if (!isAdmin)
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Accès réservé à l&apos;administrateur. Connectez-vous avec le compte
          admin.
        </p>
      </Card>
    );

  const c = stats?.counts;

  return (
    <div className="space-y-6">
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
        <Button
          onClick={() => setNewBankOpen(true)}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
        >
          <Plus className="h-4 w-4" />
          Nouvelle banque
        </Button>
      </div>

      {/* Navigation par onglets - boutons simples pour fiabilité maximale */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "overview", label: "Vue d'ensemble", icon: TrendingUp },
          { id: "visitors", label: "Visiteurs", icon: Users },
          { id: "progress", label: "Progression", icon: BarChart3 },
          { id: "banks", label: "Banques & QCM", icon: Database },
          { id: "sessions", label: "Sessions", icon: Activity },
          { id: "exams", label: "Examens", icon: GraduationCap },
          { id: "exports", label: "Export", icon: Download },
          { id: "broadcast", label: "Broadcast", icon: Mail },
        ].map((tab) => {
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

      {/* === Overview Tab === */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={BookOpen} label="Banques" value={c?.banks ?? 0} color="emerald" />
            <StatCard icon={FileQuestion} label="Questions" value={c?.questions ?? 0} color="violet" />
            <StatCard icon={Trophy} label="Examens" value={c?.exams ?? 0} color="amber" />
            <StatCard icon={Users} label="Utilisateurs" value={c?.users ?? 0} color="sky" />
            <StatCard icon={Activity} label="Sessions" value={c?.sessions ?? 0} color="rose" />
            <StatCard icon={TrendingUp} label="Terminées" value={c?.completedSessions ?? 0} color="teal" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="border-b px-5 py-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-sky-600" />
                  Visiteurs récents
                </h2>
              </div>
              <div className="max-h-[300px] divide-y overflow-y-auto">
                {stats?.recentUsers.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Aucun visiteur inscrit
                  </p>
                )}
                {stats?.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                        u.role === "ADMIN"
                          ? "bg-gradient-to-br from-amber-500 to-orange-600"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600"
                      }`}
                    >
                      {(u.name ?? u.email).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    {u.role === "ADMIN" && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">
                        ADMIN
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b px-5 py-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Activity className="h-4 w-4 text-rose-600" />
                  Sessions récentes
                </h2>
              </div>
              <div className="max-h-[300px] divide-y overflow-y-auto">
                {stats?.recentSessions.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Aucune session terminée
                  </p>
                )}
                {stats?.recentSessions.map((s) => {
                  const pct = Math.round(
                    (s.score / Math.max(1, s.totalQuestions)) * 100
                  );
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.user?.name ?? s.user?.email ?? "Visiteur"}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          pct >= 50 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Top performers + alerts */}
          <TopPerformersAndAlerts />
        </div>
      )}

        {/* === Visitors Tab === */}
        {activeTab === "visitors" && (
        <div className="space-y-4">
          <VisitorsStats />
        </div>
      )}

        {/* === Progress Tab === */}
        {activeTab === "progress" && (
        <div className="space-y-4">
          <ProgressTracker />
        </div>
      )}

        {/* === Banks & QCM Tab === */}
        {activeTab === "banks" && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <Database className="h-4 w-4 text-emerald-600" />
                Banques de questions ({stats?.bankStats.length ?? 0})
              </h2>
              <p className="text-sm text-muted-foreground">
                Cliquez sur une banque pour gérer et corriger ses questions
              </p>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {stats?.bankStats.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank)}
                  className="flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-emerald-400 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{bank.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {bank.category}
                      {bank.subcategory ? ` · ${bank.subcategory}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {bank._count.questions} Q
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

        {/* === Sessions Tab === */}
        {activeTab === "sessions" && (
        <div className="space-y-4">
          <SessionsList />
        </div>
      )}

        {/* === Exams Tab === */}
        {activeTab === "exams" && (
        <div className="space-y-4">
          <ExamsManager onNew={() => setNewExamOpen(true)} />
        </div>
      )}

        {/* === Exports Tab === */}
        {activeTab === "exports" && (
        <div className="space-y-4">
          <ExportsPanel />
        </div>
      )}

        {/* === Broadcast Tab === */}
        {activeTab === "broadcast" && (
        <div className="space-y-4">
          <BroadcastPanel open={broadcastOpen} onOpenChange={setBroadcastOpen} />
        </div>
      )}
      

      {/* Bank questions management dialog */}
      {selectedBank && (
        <BankQuestionsDialog
          bank={selectedBank}
          onClose={() => setSelectedBank(null)}
          onChanged={() => loadStats()}
        />
      )}

      {/* New bank dialog */}
      <NewBankDialog
        open={newBankOpen}
        onOpenChange={setNewBankOpen}
        onCreated={() => {
          setNewBankOpen(false);
          loadStats();
        }}
      />

      {/* New exam dialog */}
      <NewExamDialog
        open={newExamOpen}
        onOpenChange={setNewExamOpen}
        onCreated={() => {
          setNewExamOpen(false);
          toast.success("Examen créé avec succès");
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    sky: "text-sky-600 bg-sky-50 dark:bg-sky-950/40",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
    teal: "text-teal-600 bg-teal-50 dark:bg-teal-950/40",
  };
  return (
    <Card className="p-4">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          colorMap[color] ?? colorMap.emerald
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

// ===== Visitors Statistics =====
function VisitorsStats() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <Skeleton className="h-64 rounded-xl" />;

  const totalUsers = users.length;
  const visitors = users.filter((u) => u.role === "VISITOR");
  const admins = users.filter((u) => u.role === "ADMIN");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <Users className="h-5 w-5 text-sky-600" />
          <p className="mt-2 text-2xl font-bold">{totalUsers}</p>
          <p className="text-xs text-muted-foreground">Total inscrits</p>
        </Card>
        <Card className="p-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-2xl font-bold">{visitors.length}</p>
          <p className="text-xs text-muted-foreground">Visiteurs</p>
        </Card>
        <Card className="p-4">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <p className="mt-2 text-2xl font-bold">{admins.length}</p>
          <p className="text-xs text-muted-foreground">Administrateurs</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-sky-600" />
            Liste des visiteurs ({users.length})
          </h2>
        </div>
        <div className="max-h-[400px] divide-y overflow-y-auto">
          {users.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Aucun visiteur inscrit pour le moment.
            </p>
          )}
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                  u.role === "ADMIN"
                    ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                }`}
              >
                {(u.name ?? u.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email}
                </p>
              </div>
              <div className="text-right">
                {u.role === "ADMIN" && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    ADMIN
                  </Badge>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {u._count?.sessions ?? 0} session(s)
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===== Sessions List =====
function SessionsList() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sessions")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card className="overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock className="h-4 w-4 text-rose-600" />
          Sessions des visiteurs ({sessions.length})
        </h2>
      </div>
      <div className="max-h-[500px] divide-y overflow-y-auto">
        {sessions.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Aucune session pour le moment.
          </p>
        )}
        {sessions.map((s) => {
          const pct = Math.round(
            (s.score / Math.max(1, s.totalQuestions)) * 100
          );
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.user?.name ?? s.user?.email ?? "Visiteur anonyme"} ·{" "}
                  {s.mode === "immediate" ? "Immédiate" : "Finale"}
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  {new Date(s.startedAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {s.completedAt
                    ? ` → terminée`
                    : " → en cours"}
                </p>
              </div>
              <div className="text-right">
                {s.completedAt ? (
                  <>
                    <p
                      className={`text-lg font-bold ${
                        pct >= 50 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {pct}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.score}/{s.totalQuestions}
                    </p>
                  </>
                ) : (
                  <Badge variant="outline" className="text-amber-600">
                    En cours
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ===== Bank Questions Management Dialog =====
function BankQuestionsDialog({
  bank,
  onClose,
  onChanged,
}: {
  bank: BankWithCount;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/banks/${bank.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [bank.id]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function deleteQuestion(id: string) {
    if (!confirm("Supprimer définitivement cette question ?")) return;
    const res = await fetch(`/api/admin/questions?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Question supprimée ✓");
      loadQuestions();
      onChanged();
    } else {
      toast.error("Échec de la suppression");
    }
  }

  // Filter questions by search
  const filteredQuestions = questions.filter((q) => {
    if (!searchQ.trim()) return true;
    const s = searchQ.toLowerCase();
    return (
      q.question.toLowerCase().includes(s) ||
      q.optionA.toLowerCase().includes(s) ||
      q.optionB.toLowerCase().includes(s) ||
      q.optionC.toLowerCase().includes(s) ||
      q.optionD.toLowerCase().includes(s)
    );
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            {bank.title}
          </DialogTitle>
          <DialogDescription>
            {questions.length} question(s) — catégorie : {bank.category}
            {bank.subcategory ? ` · ${bank.subcategory}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Search + Add button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Rechercher dans cette banque..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="h-9 sm:max-w-xs"
          />
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => setCreatingQuestion(true)}
          >
            <Plus className="h-4 w-4" />
            Ajouter un QCM
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {searchQ ? "Aucune question ne correspond à votre recherche." : "Aucune question dans cette banque."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="group rounded-lg border p-3 transition-colors hover:border-emerald-300 hover:bg-muted/40"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{q.question}</p>
                      <div className="mt-1 flex flex-col gap-1 text-xs">
                        {["A", "B", "C", "D"].map((L) => {
                          const text =
                            L === "A"
                              ? q.optionA
                              : L === "B"
                                ? q.optionB
                                : L === "C"
                                  ? q.optionC
                                  : q.optionD;
                          const isCorrect = q.correctAnswer === L;
                          const isCorrect2 = q.correctAnswer2 === L;
                          return (
                            <div
                              key={L}
                              className={`flex items-start gap-1.5 rounded px-1.5 py-0.5 ${
                                isCorrect || isCorrect2
                                  ? "bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              <span className="shrink-0 font-bold">{L})</span>
                              <span className="break-words">{text}</span>
                              {(isCorrect || isCorrect2) && (
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="mt-1 break-words rounded bg-amber-50 p-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                          <span className="font-semibold">Explication: </span>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                    {/* Always visible action buttons */}
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-emerald-100 hover:text-emerald-700"
                        onClick={() => setEditingQuestion(q)}
                        title="Modifier cette question"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-rose-100 hover:text-rose-700"
                        onClick={() => deleteQuestion(q.id)}
                        title="Supprimer cette question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with count and close */}
        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {searchQ ? `${filteredQuestions.length} sur ${questions.length} question(s)` : `${questions.length} question(s) au total`}
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
            Fermer
          </Button>
        </div>
      </DialogContent>

      {(editingQuestion || creatingQuestion) && (
        <QuestionEditor
          bankId={bank.id}
          question={editingQuestion}
          onClose={() => {
            setEditingQuestion(null);
            setCreatingQuestion(false);
          }}
          onSaved={() => {
            setEditingQuestion(null);
            setCreatingQuestion(false);
            loadQuestions();
            onChanged();
          }}
        />
      )}
    </Dialog>
  );
}

// ===== Question Editor (create/edit) =====
function QuestionEditor({
  bankId,
  question,
  onClose,
  onSaved,
}: {
  bankId: string;
  question: Question | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [q, setQ] = useState(question?.question ?? "");
  const [a, setA] = useState(question?.optionA ?? "");
  const [b, setB] = useState(question?.optionB ?? "");
  const [c, setC] = useState(question?.optionC ?? "");
  const [d, setD] = useState(question?.optionD ?? "");
  const [correct, setCorrect] = useState(question?.correctAnswer ?? "A");
  const [expl, setExpl] = useState(question?.explanation ?? "");
  const [saving, setSaving] = useState(false);

  // Validation
  const isValid = q.trim() && a.trim() && b.trim() && c.trim() && d.trim() && expl.trim();
  const hasDuplicateOptions = new Set([a.trim().toLowerCase(), b.trim().toLowerCase(), c.trim().toLowerCase(), d.trim().toLowerCase()]).size < 4;

  async function save() {
    if (!isValid) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }
    if (hasDuplicateOptions) {
      toast.error("Les 4 options doivent être différentes");
      return;
    }
    setSaving(true);
    try {
      const body = {
        bankId,
        question: q.trim(),
        optionA: a.trim(),
        optionB: b.trim(),
        optionC: c.trim(),
        optionD: d.trim(),
        correctAnswer: correct,
        explanation: expl.trim(),
      };
      const res = await fetch("/api/admin/questions", {
        method: question ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(question ? { id: question.id, ...body } : body),
      });
      if (res.ok) {
        toast.success(
          question ? "Question modifiée ✓" : "Question ajoutée ✓"
        );
        onSaved();
      } else {
        const data = await res.json();
        toast.error(data.error || "Échec de l'enregistrement");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {question ? (
              <>
                <Pencil className="h-5 w-5 text-emerald-600" />
                Modifier la question
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-emerald-600" />
                Nouveau QCM
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {question
              ? "Corrigez la question, les options ou l'explication. Cliquez sur la lettre pour définir la réponse correcte."
              : "Ajoutez une nouvelle question à cette banque."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Question */}
          <div>
            <Label className="text-sm font-semibold">Question *</Label>
            <Textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              rows={2}
              placeholder="Libellé de la question..."
              className="mt-1 resize-none"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Options de réponse *</Label>
            <p className="text-xs text-muted-foreground">
              Cliquez sur la lettre pour définir la bonne réponse
            </p>
            {[
              { L: "A", v: a, set: setA },
              { L: "B", v: b, set: setB },
              { L: "C", v: c, set: setC },
              { L: "D", v: d, set: setD },
            ].map(({ L, v, set }) => (
              <div key={L} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(L)}
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    correct === L
                      ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title="Définir comme réponse correcte"
                >
                  {correct === L ? <CheckCircle2 className="h-4 w-4" /> : L}
                </button>
                <Input
                  value={v}
                  onChange={(e) => set(e.target.value)}
                  placeholder={`Option ${L}`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          {/* Validation warnings */}
          {hasDuplicateOptions && (a || b || c || d) && (
            <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              ⚠️ Les 4 options doivent être différentes les unes des autres
            </div>
          )}

          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            ✓ Réponse correcte : <strong>{correct}</strong>
          </div>

          {/* Explanation */}
          <div>
            <Label className="text-sm font-semibold">Explication *</Label>
            <Textarea
              value={expl}
              onChange={(e) => setExpl(e.target.value)}
              rows={2}
              placeholder="Explication de la réponse correcte..."
              className="mt-1 resize-none"
            />
          </div>

          {/* Preview */}
          {isValid && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Aperçu :</p>
              <p className="text-sm font-medium">{q}</p>
              <div className="mt-2 space-y-1">
                {[
                  { L: "A", v: a },
                  { L: "B", v: b },
                  { L: "C", v: c },
                  { L: "D", v: d },
                ].map(({ L, v }) => (
                  <div
                    key={L}
                    className={`flex items-center gap-2 rounded border px-2 py-1 text-xs ${
                      correct === L
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <span className="font-bold">{L}.</span>
                    <span>{v}</span>
                    {correct === L && <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
            Annuler
          </Button>
          <Button
            onClick={save}
            disabled={saving || !isValid}
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {question ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== New Bank Dialog =====
function NewBankDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Culture Générale");
  const [subcategory, setSubcategory] = useState("");
  const [color, setColor] = useState("emerald");
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          subcategory,
          color,
          icon: "BookOpen",
          level: "TOUS",
        }),
      });
      if (res.ok) {
        toast.success("Banque créée");
        setTitle("");
        setDescription("");
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle banque de questions</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Culture Générale - Concours 2026"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Culture Générale",
                    "Psychotechnique",
                    "Secondaire",
                    "Universitaire",
                    "Concours",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Couleur</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "emerald",
                    "violet",
                    "amber",
                    "sky",
                    "rose",
                    "cyan",
                    "teal",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Sous-catégorie</Label>
            <Input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Ex: Histoire"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={create} disabled={saving || !title}>
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Progress Tracker (Admin) =====
function ProgressTracker() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sessions?details=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  // Group by user
  const userMap: Record<string, { name: string; email: string; role: string; sessions: any[] }> = {};
  for (const s of sessions) {
    const uid = s.user?.id ?? "anonymous";
    if (!userMap[uid]) {
      userMap[uid] = { name: s.user?.name ?? "Visiteur", email: s.user?.email ?? "N/A", role: s.user?.role ?? "VISITOR", sessions: [] };
    }
    userMap[uid].sessions.push(s);
  }

  const users = Object.entries(userMap).map(([id, data]) => {
    const completed = data.sessions.filter((s) => s.completedAt);
    const avgPct = completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100, 0) / completed.length)
      : 0;
    const totalQ = completed.reduce((sum, s) => sum + s.totalQuestions, 0);
    const totalCorrect = completed.reduce((sum, s) => sum + s.score, 0);
    return { id, ...data, sessionCount: completed.length, avgPct, totalQ, totalCorrect };
  }).sort((a, b) => b.sessionCount - a.sessionCount);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <Users className="h-5 w-5 text-sky-600" />
          <p className="mt-2 text-2xl font-bold">{users.length}</p>
          <p className="text-xs text-muted-foreground">Visiteurs actifs</p>
        </Card>
        <Card className="p-4">
          <Activity className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-2xl font-bold">{sessions.filter(s => s.completedAt).length}</p>
          <p className="text-xs text-muted-foreground">Sessions terminées</p>
        </Card>
        <Card className="p-4">
          <Trophy className="h-5 w-5 text-amber-600" />
          <p className="mt-2 text-2xl font-bold">
            {users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.avgPct, 0) / users.length) : 0}%
          </p>
          <p className="text-xs text-muted-foreground">Score moyen global</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-4 w-4 text-violet-600" />
            Progression par visiteur
          </h2>
          <p className="text-sm text-muted-foreground">Cliquez sur un visiteur pour voir le détail</p>
        </div>
        <div className="divide-y">
          {users.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Aucune activité pour le moment.</p>
          )}
          {users.map((u) => (
            <div key={u.id}>
              <button
                onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${u.role === "ADMIN" ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-bold">{u.sessionCount}</p>
                    <p className="text-[10px] text-muted-foreground">sessions</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${u.avgPct >= 50 ? "text-emerald-600" : "text-rose-600"}`}>{u.avgPct}%</p>
                    <p className="text-[10px] text-muted-foreground">{u.totalCorrect}/{u.totalQ} Q</p>
                  </div>
                </div>
              </button>
              {selectedUser === u.id && (
                <div className="border-t bg-muted/20 p-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Sessions de {u.name}</p>
                  <div className="max-h-[300px] space-y-2 overflow-y-auto">
                    {u.sessions.filter(s => s.completedAt).map((s) => {
                      const pct = Math.round((s.score / Math.max(1, s.totalQuestions)) * 100);
                      return (
                        <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{s.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(s.completedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                              {" • "}
                              <Badge variant="outline" className="text-[9px]">{s.mode === "immediate" ? "Immédiate" : "Finale"}</Badge>
                            </p>
                          </div>
                          <span className={`text-sm font-bold ${pct >= 50 ? "text-emerald-600" : "text-rose-600"}`}>{pct}%</span>
                        </div>
                      );
                    })}
                    {u.sessions.filter(s => s.completedAt).length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucune session terminée.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===== Exams Manager =====
function ExamsManager({ onNew }: { onNew: () => void }) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer l'examen "${title}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/exams?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Examen supprimé");
        load();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (e) {
      toast.error("Erreur");
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-4 w-4 text-violet-600" />
            Examens blancs ({exams.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Créez et gérez les examens blancs disponibles pour les visiteurs
          </p>
        </div>
        <Button onClick={onNew} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
          <Plus className="h-4 w-4" />
          Nouvel examen
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {exams.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            Aucun examen pour le moment. Cliquez sur &quot;Nouvel examen&quot; pour en créer un.
          </Card>
        )}
        {exams.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {e.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    <Clock className="mr-1 h-3 w-3" />
                    {e.durationMin} min
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {e._count?.examQuestions ?? 0} questions
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => handleDelete(e.id, e.title)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ===== New Exam Dialog =====
function NewExamDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/banks")
        .then((r) => r.json())
        .then((d) => setBanks(Array.isArray(d) ? d : []))
        .catch(() => setBanks([]));
    }
  }, [open]);

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Titre requis");
      return;
    }
    const distributions = Object.entries(selectedBanks)
      .filter(([_, count]) => count > 0)
      .map(([bankId, count]) => ({ bankId, count }));
    if (distributions.length === 0) {
      toast.error("Sélectionnez au moins une banque");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          durationMin: duration,
          distributions,
        }),
      });
      if (res.ok) {
        toast.success("Examen créé");
        setTitle("");
        setDescription("");
        setDuration(60);
        setSelectedBanks({});
        onCreated();
        onOpenChange(false);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erreur");
      }
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer un nouvel examen blanc</DialogTitle>
          <DialogDescription>
            Sélectionnez les banques et le nombre de questions à tirer de chacune
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exam-title">Titre *</Label>
            <Input
              id="exam-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Examen Blanc - Concours Administratif 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-desc">Description</Label>
            <Textarea
              id="exam-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'examen..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-duration">Durée (minutes)</Label>
            <Input
              id="exam-duration"
              type="number"
              min={10}
              max={300}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
            />
          </div>

          <div className="space-y-2">
            <Label>Banques de questions</Label>
            <p className="text-xs text-muted-foreground">
              Indiquez le nombre de questions à tirer de chaque banque (0 = ignorer)
            </p>
            <div className="max-h-[300px] space-y-1.5 overflow-y-auto rounded-lg border p-2">
              {banks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {b._count?.questions ?? 0} questions disponibles
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    defaultValue={0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setSelectedBanks((prev) => ({
                        ...prev,
                        [b.id]: v,
                      }));
                    }}
                    className="h-8 w-16"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
          >
            {creating ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Créer l&apos;examen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Exports Panel =====
function ExportsPanel() {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(type: "users" | "sessions" | "banks") {
    setExporting(type);
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Export ${type} téléchargé`);
      } else {
        toast.error("Erreur lors de l'export");
      }
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setExporting(null);
    }
  }

  const exports = [
    {
      type: "users" as const,
      title: "Utilisateurs",
      desc: "Liste complète des utilisateurs inscrits (nom, email, rôle, sessions)",
      icon: Users,
      color: "emerald",
    },
    {
      type: "sessions" as const,
      title: "Sessions",
      desc: "Toutes les sessions de quiz (utilisateur, score, mode, date)",
      icon: Activity,
      color: "rose",
    },
    {
      type: "banks" as const,
      title: "Banques",
      desc: "Liste des banques de questions avec le nombre de questions",
      icon: Database,
      color: "violet",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Download className="h-4 w-4 text-emerald-600" />
          Export de données (CSV)
        </h2>
        <p className="text-sm text-muted-foreground">
          Téléchargez les données de la plateforme au format CSV pour analyse externe
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {exports.map((e) => (
          <Card key={e.type} className="flex flex-col gap-3 p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${e.color}-50 text-${e.color}-600 dark:bg-${e.color}-950/40`}>
              <e.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{e.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{e.desc}</p>
            </div>
            <Button
              className="mt-auto gap-2"
              variant="outline"
              disabled={exporting === e.type}
              onClick={() => handleExport(e.type)}
            >
              {exporting === e.type ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Télécharger CSV
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ===== Broadcast Panel =====
function BroadcastPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Sujet et message requis");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message ?? "Message envoyé");
        setSubject("");
        setBody("");
      } else {
        toast.error("Erreur lors de l'envoi");
      }
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Mail className="h-4 w-4 text-amber-600" />
          Message broadcast
        </h2>
        <p className="text-sm text-muted-foreground">
          Envoyez un message email à tous les utilisateurs inscrits
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="broadcast-subject">Sujet *</Label>
          <Input
            id="broadcast-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Nouveaux examens disponibles !"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-body">Message *</Label>
          <Textarea
            id="broadcast-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contenu du message..."
            rows={6}
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="flex-1">
            Le message sera programmé pour tous les visiteurs inscrits.
            L&apos;envoi réel dépend de la configuration du service email.
          </p>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
        >
          {sending ? (
            <>
              <Activity className="h-4 w-4 animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Envoyer le broadcast
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}

// ===== Top Performers + Alerts (added to Overview) =====
function TopPerformersAndAlerts() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sessions?details=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  // Compute top performers
  const userMap: Record<string, { name: string; email: string; sessions: any[] }> = {};
  for (const s of sessions) {
    const uid = s.user?.id ?? "anon";
    if (!userMap[uid]) {
      userMap[uid] = { name: s.user?.name ?? "Visiteur", email: s.user?.email ?? "N/A", sessions: [] };
    }
    if (s.completedAt) userMap[uid].sessions.push(s);
  }

  const users = Object.entries(userMap).map(([id, data]) => {
    const completed = data.sessions;
    const avgPct = completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100, 0) / completed.length)
      : 0;
    return { id, ...data, sessionCount: completed.length, avgPct };
  });

  const topPerformers = [...users]
    .filter((u) => u.sessionCount >= 1)
    .sort((a, b) => b.avgPct - a.avgPct)
    .slice(0, 5);

  const lowPerformers = [...users]
    .filter((u) => u.sessionCount >= 2 && u.avgPct < 50)
    .sort((a, b) => a.avgPct - b.avgPct)
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Star className="h-4 w-4 text-amber-500" />
            Top 5 visiteurs
          </h3>
          <p className="text-xs text-muted-foreground">Meilleurs scores moyens</p>
        </div>
        <div className="divide-y">
          {topPerformers.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Pas encore de données
            </p>
          )}
          {topPerformers.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i === 0 ? "bg-amber-100 text-amber-700" :
                i === 1 ? "bg-slate-100 text-slate-700" :
                i === 2 ? "bg-orange-100 text-orange-700" :
                "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{u.avgPct}%</p>
                <p className="text-[10px] text-muted-foreground">{u.sessionCount} sess.</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Alertes performance
          </h3>
          <p className="text-xs text-muted-foreground">Visiteurs avec score moyen &lt; 50%</p>
        </div>
        <div className="divide-y">
          {lowPerformers.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucune alerte - tous les visiteurs performent bien !
            </p>
          )}
          {lowPerformers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-rose-600">{u.avgPct}%</p>
                <p className="text-[10px] text-muted-foreground">{u.sessionCount} sess.</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
