"use client";

<<<<<<< Updated upstream
import { useState, useEffect } from "react";
=======
import { useEffect, useState } from "react";
>>>>>>> Stashed changes
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

/**
<<<<<<< Updated upstream
 * SessionsList — "Sessions" tab. Fetches all sessions and renders them in a
 * scrollable list with score, mode, started/completed timestamps.
=======
 * SessionsList — onglet "Sessions" du panneau admin.
 * Liste toutes les sessions (terminées et en cours) avec leur score.
>>>>>>> Stashed changes
 */
export function SessionsList() {
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
