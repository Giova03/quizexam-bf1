"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Code2,
  Copy,
  Key,
  Globe,
  Shield,
  Server,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ApiEndpoint {
  path: string;
  method: string;
  auth: string;
  description: string;
  params?: Array<{ name: string; type: string; required?: boolean; description?: string }>;
  body?: Record<string, unknown>;
  example?: { request?: string; response?: Record<string, unknown> };
}

interface ApiDocs {
  name: string;
  version: string;
  baseUrl: string;
  authentication: string;
  rateLimit: { public: string; window: string; enforcedBy: string };
  apiKey: { note: string; demoKey: string };
  endpoints: ApiEndpoint[];
}

interface ApiDocsViewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * ApiDocsView — Dialog-based API documentation viewer.
 *
 * Fetches /api/docs on open and renders the full endpoint list with
 * examples, the rate-limit policy, and the mock API key. Renders
 * inside a Dialog so the user can open it from the footer without
 * leaving the current page.
 */
export function ApiDocsView({ open, onOpenChange }: ApiDocsViewProps) {
  const [docs, setDocs] = useState<ApiDocs | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Defer the synchronous setLoading(true) so we don't trigger a
    // cascading render inside the effect body (react-hooks rule).
    const timer = setTimeout(() => {
      setLoading(true);
      fetch("/api/docs")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d) setDocs(d);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Documentation API</DialogTitle>
              <DialogDescription>
                Intégrez QuizExam BF à vos applications
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-6">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!loading && docs && (
          <div className="space-y-5">
            {/* Meta */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                  Base URL
                </div>
                <code className="text-sm font-mono">{docs.baseUrl}</code>
              </Card>
              <Card className="p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  Version
                </div>
                <span className="text-sm">{docs.version}</span>
              </Card>
            </div>

            {/* Authentication */}
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Shield className="h-4 w-4 text-emerald-600" />
                Authentification
              </div>
              <p className="text-xs text-muted-foreground">{docs.authentication}</p>
            </Card>

            {/* Rate limit */}
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-4 w-4 text-sky-600" />
                Limites de taux (rate limiting)
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  <strong>Endpoints publics :</strong> {docs.rateLimit.public}
                </li>
                <li>
                  <strong>Fenêtre :</strong> {docs.rateLimit.window}
                </li>
                <li>
                  <strong>Implémentation :</strong> {docs.rateLimit.enforcedBy}
                </li>
              </ul>
            </Card>

            {/* API key */}
            <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                <Key className="h-4 w-4" />
                Clé API (démo)
              </div>
              <p className="mb-2 text-xs text-amber-800 dark:text-amber-300">
                {docs.apiKey.note}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-amber-100 px-3 py-2 font-mono text-sm text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                  {docs.apiKey.demoKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-amber-300"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(docs.apiKey.demoKey)
                      .then(() => toast.success("Clé API copiée."))
                      .catch(() => toast.error("Copie impossible."));
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>

            {/* Endpoints */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Code2 className="h-4 w-4 text-violet-600" />
                Endpoints ({docs.endpoints.length})
              </h3>
              <div className="space-y-3">
                {docs.endpoints.map((ep, i) => (
                  <EndpointCard key={`${ep.path}-${i}`} ep={ep} />
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Chargement de la documentation…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EndpointCard({ ep }: { ep: ApiEndpoint }) {
  const methodColor =
    ep.method === "GET"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : ep.method === "POST"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`font-mono text-xs ${methodColor}`} variant="secondary">
            {ep.method}
          </Badge>
          <code className="font-mono text-sm font-medium">{ep.path}</code>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {ep.auth}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{ep.description}</p>
      </div>
      {ep.params && ep.params.length > 0 && (
        <div className="border-b p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Paramètres
          </p>
          <ul className="space-y-1">
            {ep.params.map((p) => (
              <li key={p.name} className="text-xs">
                <code className="font-mono text-violet-600 dark:text-violet-400">
                  {p.name}
                </code>
                {p.required && (
                  <Badge variant="outline" className="ml-1 text-[9px]">
                    requis
                  </Badge>
                )}{" "}
                <span className="text-muted-foreground">({p.type})</span>
                {p.description && (
                  <span className="text-muted-foreground"> — {p.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ep.example && (
        <div className="p-3">
          {ep.example.request && (
            <div className="mb-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Exemple de requête
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-2 text-[11px] font-mono">
                {ep.example.request}
              </pre>
            </div>
          )}
          {ep.example.response && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Exemple de réponse
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-2 text-[11px] font-mono">
                {JSON.stringify(ep.example.response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
