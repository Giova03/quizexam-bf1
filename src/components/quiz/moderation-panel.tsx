"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
<<<<<<< Updated upstream
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  Check,
  X,
  Filter,
  RefreshCw,
  Flag,
  User,
  MessageSquare,
  FileText,
  HelpCircle,
  Inbox,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Report {
=======
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Flag,
  RefreshCw,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface ReportItem {
>>>>>>> Stashed changes
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
<<<<<<< Updated upstream
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
  reporter: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
}

type StatusFilter = "all" | "pending" | "resolved" | "dismissed";

const STATUS_LABELS: Record<Report["status"], string> = {
  pending: "En attente",
  resolved: "Résolu",
  dismissed: "Ignoré",
};

const STATUS_STYLES: Record<Report["status"], string> = {
  pending: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
  resolved: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
  dismissed: "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
};

function getTargetIcon(targetType: string) {
  switch (targetType) {
    case "forum_topic":
      return MessageSquare;
    case "forum_reply":
      return MessageSquare;
    case "post":
      return MessageSquare;
    case "comment":
      return MessageSquare;
    case "user":
      return User;
    case "question":
      return HelpCircle;
    case "session":
      return FileText;
    default:
      return Flag;
  }
}

function getTargetLabel(targetType: string): string {
  const map: Record<string, string> = {
    forum_topic: "Sujet de forum",
    forum_reply: "Réponse de forum",
    post: "Publication",
    comment: "Commentaire",
    user: "Utilisateur",
    question: "Question",
    session: "Session",
    other: "Autre",
  };
  return map[targetType] ?? targetType;
}

export function ModerationPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [seedingForum, setSeedingForum] = useState(false);

  const load = useCallback(async () => {
    try {
      const url =
        statusFilter === "all"
          ? "/api/reports"
          : `/api/reports?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setReports(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les signalements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  /**
   * Initialise the forum with default topics via /api/forum/seed.
   * Idempotent — existing topics are skipped server-side.
   */
  const handleSeedForum = async () => {
    if (
      !confirm(
        "Initialiser le forum avec les sujets par défaut ?\n\nLes sujets déjà existants ne seront pas dupliqués."
      )
    )
      return;
    setSeedingForum(true);
    try {
      const res = await fetch("/api/forum/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        toast.success(data.message ?? "Forum initialisé");
      } else {
        toast.error(data.error ?? "Échec de l'initialisation du forum");
      }
    } catch (e) {
      console.error("Forum seed failed", e);
      toast.error("Erreur lors de l'initialisation du forum");
    } finally {
      setSeedingForum(false);
    }
  };

  const updateStatus = async (id: string, status: Report["status"]) => {
    setUpdatingId(id);
=======
  category: string;
  status: string;
  resolution: string;
  createdAt: string;
  resolvedAt: string | null;
  reporter?: { id: string; name: string } | null;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  spam: { label: "Spam", color: "text-amber-600" },
  harcèlement: { label: "Harcèlement", color: "text-rose-600" },
  contenu_inapproprié: { label: "Contenu inapproprié", color: "text-rose-600" },
  hors_sujet: { label: "Hors sujet", color: "text-sky-600" },
  autre: { label: "Autre", color: "text-muted-foreground" },
};

const TARGET_LABELS: Record<string, string> = {
  post: "Publication",
  comment: "Commentaire",
  "forum-topic": "Sujet forum",
  "forum-reply": "Réponse forum",
  user: "Utilisateur",
  article: "Article",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * ModerationPanel — admin view of pending reports.
 * Resolve (action taken) or dismiss (no action needed).
 */
export function ModerationPanel() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all">("pending");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?status=${filter}`);
      if (res.ok) setReports(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleResolve(id: string, status: "resolved" | "dismissed") {
    setResolvingId(id);
>>>>>>> Stashed changes
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
<<<<<<< Updated upstream
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la mise à jour");
      }
      // Update the local state
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      toast.success(
        status === "resolved"
          ? "Signalement résolu"
          : status === "dismissed"
          ? "Signalement ignoré"
          : "Signalement rouvert"
      );
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdatingId(null);
    }
  };

  // Count by status for the filter tabs
  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  return (
    <div className="space-y-6">
=======
        body: JSON.stringify({ status, resolution: resolution.trim() }),
      });
      if (!res.ok) {
        toast.error("Erreur lors du traitement");
        return;
      }
      toast.success(status === "resolved" ? "Signalement résolu" : "Signalement ignoré");
      setResolution("");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-4">
>>>>>>> Stashed changes
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
<<<<<<< Updated upstream
            Modération des signalements
          </h2>
          <p className="text-sm text-muted-foreground">
            Examinez et résolvez les signalements faits par les utilisateurs.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "pending", "resolved", "dismissed"] as StatusFilter[]).map((s) => {
          const isActive = statusFilter === s;
          const label =
            s === "all"
              ? `Tous (${counts.all})`
              : `${STATUS_LABELS[s]} (${counts[s]})`;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-border bg-card text-muted-foreground hover:border-emerald-300 hover:bg-muted/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Forum initialization card */}
      <Card className="border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                Initialiser le forum
                <Badge variant="outline" className="border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300">
                  Admin
                </Badge>
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Crée 8 sujets par défaut (Culture Générale, Droit, Sciences, Littérature,
                Sciences Éco, Psychotechnique, Conseils, Annonces). Les sujets déjà
                existants ne sont pas dupliqués.
              </p>
            </div>
          </div>
          <Button
            onClick={handleSeedForum}
            disabled={seedingForum}
            className="shrink-0 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
            size="sm"
          >
            {seedingForum ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Initialisation…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Initialiser le forum
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Reports list */}
      {loading ? (
        <div className="space-y-3">
=======
            Modération
          </h2>
          <p className="text-sm text-muted-foreground">
            Traitez les signalements de la communauté.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["pending", "resolved", "dismissed", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-rose-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f === "pending"
                ? "En attente"
                : f === "resolved"
                ? "Résolus"
                : f === "dismissed"
                ? "Ignorés"
                : "Tous"}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={load}
            aria-label="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
>>>>>>> Stashed changes
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
<<<<<<< Updated upstream
          <Inbox className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium">Aucun signalement à afficher</p>
          <p className="text-xs text-muted-foreground">
            {statusFilter === "all"
              ? "Aucun signalement n'a été fait pour le moment."
              : `Aucun signalement avec le statut "${STATUS_LABELS[statusFilter as Report["status"]] ?? statusFilter}".`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const TargetIcon = getTargetIcon(r.targetType);
            const isUpdating = updatingId === r.id;
            return (
              <Card key={r.id} className="overflow-hidden">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
                  {/* Icon + target type */}
                  <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                      <TargetIcon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {getTargetLabel(r.targetType)}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="sm:hidden">
                        {getTargetLabel(r.targetType)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={STATUS_STYLES[r.status]}
                      >
                        {STATUS_LABELS[r.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{r.reason}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[10px] bg-muted/60 rounded px-1.5 py-0.5">
                        ID: {r.targetId.slice(0, 12)}
                        {r.targetId.length > 12 ? "…" : ""}
                      </span>
                      {r.reporter ? (
                        <span>
                          Signalé par{" "}
                          <span className="font-medium">
                            {r.reporter.name ?? r.reporter.email}
                          </span>
                        </span>
                      ) : (
                        <span>Signalé par un utilisateur supprimé</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    {r.status !== "resolved" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(r.id, "resolved")}
                        disabled={isUpdating}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Résoudre
                      </Button>
                    )}
                    {r.status !== "dismissed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(r.id, "dismissed")}
                        disabled={isUpdating}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        Ignorer
                      </Button>
                    )}
                    {r.status !== "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(r.id, "pending")}
                        disabled={isUpdating}
                        className="gap-1.5"
                      >
                        Rouvrir
                      </Button>
                    )}
                  </div>
                </div>
=======
          <CheckCircle2 className="h-12 w-12 text-emerald-500/60" />
          <p className="text-sm text-muted-foreground">
            {filter === "pending"
              ? "Aucun signalement en attente. Tout est sous contrôle !"
              : "Aucun signalement dans cette catégorie."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const cat = CATEGORIES[r.category] ?? CATEGORIES.autre;
            const targetLabel = TARGET_LABELS[r.targetType] ?? r.targetType;
            const isPending = r.status === "pending";
            return (
              <Card key={r.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Flag className={`h-3 w-3 ${cat.color}`} />
                        {cat.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {targetLabel}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </span>
                      {r.reporter && (
                        <span className="text-[10px] text-muted-foreground">
                          par {r.reporter.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="font-medium text-muted-foreground">Cible:</span>{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        {r.targetId}
                      </code>
                    </p>
                    {r.reason && (
                      <p className="rounded-md bg-muted/50 p-2 text-xs">
                        <span className="font-medium">Motif:</span> {r.reason}
                      </p>
                    )}
                    {!isPending && r.resolution && (
                      <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <span className="font-medium">
                          {r.status === "resolved" ? "Résolution:" : "Note:"}
                        </span>{" "}
                        {r.resolution}
                        {r.resolvedAt && ` · ${formatDate(r.resolvedAt)}`}
                      </p>
                    )}
                  </div>
                  {isPending && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={resolvingId === r.id}
                        onClick={() => handleResolve(r.id, "resolved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Résoudre
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={resolvingId === r.id}
                        onClick={() => handleResolve(r.id, "dismissed")}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Ignorer
                      </Button>
                    </div>
                  )}
                </div>
                {isPending && (
                  <div className="mt-3 border-t pt-3">
                    <Textarea
                      value={resolvingId === r.id ? resolution : ""}
                      onChange={(e) => {
                        setResolvingId(r.id);
                        setResolution(e.target.value);
                      }}
                      placeholder="Note de résolution (optionnel)..."
                      rows={2}
                      maxLength={500}
                      className="text-xs"
                    />
                  </div>
                )}
>>>>>>> Stashed changes
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
