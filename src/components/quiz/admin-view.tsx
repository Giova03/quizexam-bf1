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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Vue d&apos;ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="visitors" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Visiteurs</span>
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-1.5">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Banques & QCM</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
        </TabsList>

        {/* === Overview Tab === */}
        <TabsContent value="overview" className="space-y-4">
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
        </TabsContent>

        {/* === Visitors Tab === */}
        <TabsContent value="visitors" className="space-y-4">
          <VisitorsStats />
        </TabsContent>

        {/* === Banks & QCM Tab === */}
        <TabsContent value="banks" className="space-y-4">
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
        </TabsContent>

        {/* === Sessions Tab === */}
        <TabsContent value="sessions" className="space-y-4">
          <SessionsList />
        </TabsContent>
      </Tabs>

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
    if (!confirm("Supprimer cette question ?")) return;
    const res = await fetch(`/api/admin/questions?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Question supprimée");
      loadQuestions();
      onChanged();
    }
  }

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

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Cliquez sur le crayon pour corriger une question ou sa réponse
          </p>
          <Button
            size="sm"
            className="gap-1.5"
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
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="group rounded-lg border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
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
                            <span
                              key={L}
                              className={`rounded px-1.5 py-0.5 ${
                                isCorrect || isCorrect2
                                  ? "bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {L}) {text}
                            </span>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {q.explanation}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingQuestion(q)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-600"
                        onClick={() => deleteQuestion(q.id)}
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

  async function save() {
    setSaving(true);
    try {
      const body = {
        bankId,
        question: q,
        optionA: a,
        optionB: b,
        optionC: c,
        optionD: d,
        correctAnswer: correct,
        explanation: expl,
      };
      const res = await fetch("/api/admin/questions", {
        method: question ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(question ? { id: question.id, ...body } : body),
      });
      if (res.ok) {
        toast.success(
          question ? "Question corrigée ✓" : "Question ajoutée ✓"
        );
        onSaved();
      } else {
        const data = await res.json();
        toast.error(data.error || "Échec");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {question ? "Corriger la question" : "Nouveau QCM"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Question</Label>
            <Textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              rows={2}
              placeholder="Libellé de la question"
            />
          </div>
          {[
            { L: "A", v: a, set: setA },
            { L: "B", v: b, set: setB },
            { L: "C", v: c, set: setC },
            { L: "D", v: d, set: setD },
          ].map(({ L, v, set }) => (
            <div key={L} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrect(L)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                  correct === L
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
                title="Définir comme réponse correcte"
              >
                {L}
              </button>
              <Input
                value={v}
                onChange={(e) => set(e.target.value)}
                placeholder={`Option ${L}`}
              />
            </div>
          ))}
          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            Réponse correcte : <strong>{correct}</strong> — cliquez sur la
            lettre pour changer
          </div>
          <div>
            <Label>Explication</Label>
            <Textarea
              value={expl}
              onChange={(e) => setExpl(e.target.value)}
              rows={2}
              placeholder="Explication de la réponse correcte"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
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
