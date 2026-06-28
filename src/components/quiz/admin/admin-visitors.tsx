"use client";

<<<<<<< Updated upstream
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Activity, BarChart3, Trophy } from "lucide-react";
import { toast } from "sonner";

// ===== Role constants (5 roles supported by /api/admin/users/role) =====

export const ROLE_OPTIONS = [
  { value: "VISITOR", label: "Visiteur" },
  { value: "CONTRIBUTOR", label: "Contributeur" },
  { value: "MODERATOR", label: "Modérateur" },
  { value: "EXAMINER", label: "Examinateur" },
  { value: "ADMIN", label: "Administrateur" },
] as const;

export const ROLE_BADGE_STYLES: Record<string, string> = {
  VISITOR:
    "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
  CONTRIBUTOR:
    "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300",
  MODERATOR:
    "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300",
  EXAMINER:
    "border-teal-300 text-teal-700 dark:border-teal-800 dark:text-teal-300",
  ADMIN: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
};

export const ROLE_AVATAR_STYLES: Record<string, string> = {
  VISITOR: "bg-gradient-to-br from-emerald-500 to-teal-600",
  CONTRIBUTOR: "bg-gradient-to-br from-sky-500 to-blue-600",
  MODERATOR: "bg-gradient-to-br from-violet-500 to-purple-600",
  EXAMINER: "bg-gradient-to-br from-teal-500 to-cyan-600",
  ADMIN: "bg-gradient-to-br from-amber-500 to-orange-600",
};

export const ROLE_LABELS_FR: Record<string, string> = {
  VISITOR: "Visiteur",
  CONTRIBUTOR: "Contributeur",
  MODERATOR: "Modérateur",
  EXAMINER: "Examinateur",
  ADMIN: "Administrateur",
};

/**
 * VisitorsStats — top stats (total + role distribution) + the full user list
 * with per-user role-change dropdown.
=======
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ShieldCheck, Activity, Trophy, BarChart3 } from "lucide-react";

/**
 * VisitorsStats — onglet "Visiteurs".
 * Affiche les compteurs (total/visiteurs/admins) + la liste paginée
 * des utilisateurs inscrits avec leur nombre de sessions.
>>>>>>> Stashed changes
 */
export function VisitorsStats() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
<<<<<<< Updated upstream
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
=======

  useEffect(() => {
>>>>>>> Stashed changes
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

<<<<<<< Updated upstream
  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la mise à jour");
      }
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      );
      toast.success(`Rôle mis à jour : ${ROLE_LABELS_FR[updated.role] ?? updated.role}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading)
    return <Skeleton className="h-64 rounded-xl" />;

  const totalUsers = users.length;
  // Role distribution
  const roleCounts: Record<string, number> = {
    VISITOR: 0,
    CONTRIBUTOR: 0,
    MODERATOR: 0,
    EXAMINER: 0,
    ADMIN: 0,
  };
  for (const u of users) {
    const r = u.role ?? "VISITOR";
    roleCounts[r] = (roleCounts[r] ?? 0) + 1;
  }

  return (
    <div className="space-y-4">
      {/* Top stats: total + role distribution */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
=======
  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  const totalUsers = users.length;
  const visitors = users.filter((u) => u.role === "VISITOR");
  const admins = users.filter((u) => u.role === "ADMIN");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
>>>>>>> Stashed changes
        <Card className="p-4">
          <Users className="h-5 w-5 text-sky-600" />
          <p className="mt-2 text-2xl font-bold">{totalUsers}</p>
          <p className="text-xs text-muted-foreground">Total inscrits</p>
        </Card>
<<<<<<< Updated upstream
        <Card className="p-4 sm:col-span-1 lg:col-span-2">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Distribution des rôles
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ROLE_OPTIONS.map((r) => (
              <div
                key={r.value}
                className="flex flex-col items-center rounded-lg border bg-card/50 p-2 text-center"
              >
                <span className="text-lg font-bold">
                  {roleCounts[r.value] ?? 0}
                </span>
                <Badge
                  variant="outline"
                  className={`mt-1 text-[10px] ${ROLE_BADGE_STYLES[r.value] ?? ""}`}
                >
                  {r.label}
                </Badge>
              </div>
            ))}
          </div>
=======
        <Card className="p-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-2xl font-bold">{visitors.length}</p>
          <p className="text-xs text-muted-foreground">Visiteurs</p>
        </Card>
        <Card className="p-4">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <p className="mt-2 text-2xl font-bold">{admins.length}</p>
          <p className="text-xs text-muted-foreground">Administrateurs</p>
>>>>>>> Stashed changes
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-sky-600" />
<<<<<<< Updated upstream
            Liste des utilisateurs ({users.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Changez le rôle de chaque utilisateur avec le menu déroulant.
          </p>
        </div>
        <div className="max-h-[500px] divide-y overflow-y-auto">
          {users.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Aucun utilisateur inscrit pour le moment.
            </p>
          )}
          {users.map((u) => {
            const role = u.role ?? "VISITOR";
            const isUpdating = updatingId === u.id;
            return (
              <div
                key={u.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    ROLE_AVATAR_STYLES[role] ?? ROLE_AVATAR_STYLES.VISITOR
                  }`}
                >
                  {(u.name ?? u.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 sm:hidden">
                    {u._count?.sessions ?? 0} session(s) ·{" "}
                    {new Date(u.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-muted-foreground">
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
                {/* Role badge + change dropdown */}
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`hidden md:inline-flex ${ROLE_BADGE_STYLES[role] ?? ""}`}
                  >
                    {ROLE_LABELS_FR[role] ?? role}
                  </Badge>
                  <select
                    value={role}
                    disabled={isUpdating}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    aria-label={`Changer le rôle de ${u.name ?? u.email}`}
                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
=======
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
>>>>>>> Stashed changes
        </div>
      </Card>
    </div>
  );
}

/**
<<<<<<< Updated upstream
 * ProgressTracker — "Progression" tab. Groups sessions by user and shows
 * per-user averages with expandable session detail.
 *
 * (Kept in this file because it's conceptually about visitor progress; the
 * task split only mentions VisitorsStats, but ProgressTracker was already in
 * admin-view.tsx and belongs with the other visitor analytics.)
=======
 * ProgressTracker — onglet "Progression".
 * Liste les visiteurs actifs avec leur score moyen et le détail de leurs sessions.
>>>>>>> Stashed changes
 */
export function ProgressTracker() {
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

<<<<<<< Updated upstream
  // Group by user
=======
  // Grouper par utilisateur
>>>>>>> Stashed changes
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
