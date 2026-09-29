"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScrollText,
  RefreshCw,
  Database,
  HelpCircle,
  Users,
  Flag,
  GraduationCap,
  Mail,
  History,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Journal d'audit (P4) — lecture du trail des mutations staff via
 * GET /api/audit-log (ADMIN+, VIEW_ANALYTICS). Liste newest-first avec
 * filtres entité / action, style cohérent avec les autres panels admin.
 */

interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

const ENTITY_FILTERS = [
  { value: "", label: "Tout", icon: History },
  { value: "Question", label: "Questions", icon: HelpCircle },
  { value: "QuestionBank", label: "Banques", icon: Database },
  { value: "User", label: "Utilisateurs", icon: Users },
  { value: "Report", label: "Signalements", icon: Flag },
  { value: "Exam", label: "Examens", icon: GraduationCap },
  { value: "Broadcast", label: "Broadcast", icon: Mail },
] as const;

const ACTION_LABELS: Record<string, string> = {
  "question.create": "Question créée",
  "question.update": "Question modifiée",
  "question.delete": "Question supprimée",
  "question.import": "Import en masse",
  "question.generate": "Génération IA",
  "bank.create": "Banque créée",
  "bank.update": "Banque modifiée",
  "bank.delete": "Banque supprimée",
  "user.role_change": "Changement de rôle",
  "report.status_change": "Signalement traité",
  "exam.create": "Examen créé",
  "exam.delete": "Examen supprimé",
  "broadcast.send": "Envoi en masse",
};

/** Badge color by action family (prefix before the dot). */
function actionBadgeClass(action: string): string {
  const family = action.split(".")[0];
  switch (family) {
    case "user":
      return "border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300";
    case "question":
      return "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300";
    case "bank":
      return "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300";
    case "report":
      return "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300";
    case "exam":
      return "border-indigo-300 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300";
    default:
      return "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400";
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 11)}…` : id;
}

/** Human-readable one-liner from metadata, when useful. */
function metadataSummary(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const parts: string[] = [];
  if (typeof metadata.total === "number") parts.push(`${metadata.total} au total`);
  if (typeof metadata.imported === "number") parts.push(`${metadata.imported} importées`);
  if (typeof metadata.generated === "number") parts.push(`${metadata.generated} générées`);
  if (typeof metadata.addedToBank === "number" && metadata.addedToBank > 0)
    parts.push(`${metadata.addedToBank} ajoutées à la banque`);
  if (typeof metadata.recipients === "number") parts.push(`${metadata.recipients} destinataire(s)`);
  if (typeof metadata.questionCount === "number") parts.push(`${metadata.questionCount} question(s)`);
  if (typeof metadata.targetEmail === "string" && metadata.targetEmail)
    parts.push(`cible : ${metadata.targetEmail}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [actionQuery, setActionQuery] = useState<string>("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (entityFilter) params.set("entity", entityFilter);
    if (actionQuery.trim()) params.set("action", actionQuery.trim());
    try {
      const res = await fetch(`/api/audit-log?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { entries: AuditEntry[] };
      setEntries(data.entries ?? []);
    } catch (error) {
      console.error("Failed to load audit log:", error);
      toast.error("Impossible de charger le journal d'audit");
    }
  }, [entityFilter, actionQuery]);

  // Reload when filters change (debounced for the text query).
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      await load();
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const summary = useMemo(() => {
    const byAction = new Map<string, number>();
    for (const e of entries) {
      byAction.set(e.action, (byAction.get(e.action) ?? 0) + 1);
    }
    return Array.from(byAction.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ScrollText className="h-5 w-5" />
            Journal d&apos;audit
          </h3>
          <p className="text-sm text-muted-foreground">
            Traçabilité des actions du staff — créations, modifications,
            suppressions, changements de rôle, modération.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {ENTITY_FILTERS.map((f) => {
              const Icon = f.icon;
              const active = entityFilter === f.value;
              return (
                <button
                  key={f.value || "all"}
                  type="button"
                  onClick={() => setEntityFilter(f.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>
          <Input
            placeholder="Filtrer par action (ex : question. — préfixe)"
            value={actionQuery}
            onChange={(e) => setActionQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </Card>

      {/* Top actions summary */}
      {!loading && entries.length > 0 && summary.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <UserCog className="h-3.5 w-3.5" />
          Top actions affichées :
          {summary.map(([action, count]) => (
            <Badge key={action} variant="outline" className={actionBadgeClass(action)}>
              {ACTION_LABELS[action] ?? action} · {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <ScrollText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune entrée d&apos;audit pour ces filtres. Les actions du staff
            apparaîtront ici automatiquement.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const metaSummary = metadataSummary(entry.metadata);
            return (
              <Card key={entry.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={actionBadgeClass(entry.action)}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {entry.entity}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {shortId(entry.entityId)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{entry.userEmail}</span>
                  {metaSummary && <span>· {metaSummary}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
