"use client";

/**
 * /setup — Centre de diagnostic & réparation de la base de données.
 *
 * Pourquoi cette page existe : sur Vercel, la variable DATABASE_URL peut être
 * absente d'un projet (déploiement fantôme, variables "Runtime only"…) et la
 * base peut manquer de colonnes récentes. Cette page rend la panne évidente et
 * la réparation accessible en un clic, sans dashboard Supabase.
 *
 * - État temps réel : variable DB, connexion, schéma (colonnes User + AuditLog)
 * - Bouton « Réparer » : GET /api/admin/db-migrate?action=migrate
 *   (DDL 100% idempotent additif — aucune donnée lue ni modifiée)
 * - Guide pas-à-pas Vercel quand la variable est manquante.
 *
 * Page publique : elle n'expose AUCUNE donnée utilisateur, uniquement des
 * booléens d'état technique.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  CheckCircle2,
  XCircle,
  Wrench,
  RefreshCw,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";

type HealthResponse = { ok: boolean; db: "up" | "down" | "unconfigured"; uptimeSec: number };
type StatusResponse = {
  database: "connected" | "unreachable";
  userColumns: Record<string, boolean>;
  auditLogTable: boolean;
};
type MigrateResponse = {
  ok?: boolean;
  applied?: string[];
  failed?: number;
  status?: StatusResponse;
};

const VERCEL_STEPS: { title: string; detail: string }[] = [
  {
    title: "Ouvrez le dashboard Vercel",
    detail: "vercel.com → connectez-vous → sélectionnez le projet concerné (celui du domaine que vous visitez).",
  },
  {
    title: "Settings → Environment Variables",
    detail: "Ajoutez DATABASE_URL avec l'URL Postgres de votre projet Supabase (Project Settings → Database → Connection string → URI, port direct 5432).",
  },
  {
    title: "Redéployez",
    detail: "Onglet Deployments → ⋯ → Redeploy (la variable s'applique au nouveau déploiement).",
  },
  {
    title: "Revenez ici",
    detail: "Relancez le diagnostic : la connexion doit passer à « Connectée », puis cliquez sur « Réparer la base ».",
  },
];

export default function SetupPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [migrate, setMigrate] = useState<MigrateResponse | null>(null);
  const [busy, setBusy] = useState<"check" | "repair" | null>("check");

  const runCheck = useCallback(async () => {
    setBusy("check");
    setMigrate(null);
    try {
      const [h, s] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/db-migrate?action=status", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setHealth(h);
      setStatus(s);
    } catch {
      setHealth({ ok: false, db: "down", uptimeSec: 0 });
      setStatus(null);
    } finally {
      setBusy(null);
    }
  }, []);

  const runRepair = useCallback(async () => {
    setBusy("repair");
    try {
      const res = await fetch("/api/admin/db-migrate?action=migrate", { cache: "no-store" });
      const data: MigrateResponse = await res.json();
      setMigrate(data);
      const s = await fetch("/api/admin/db-migrate?action=status", { cache: "no-store" }).then((r) => r.json());
      setStatus(s);
    } catch {
      setMigrate({ ok: false, failed: -1 });
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const dbConfigured = health?.db !== "unconfigured";
  const dbConnected = status?.database === "connected";
  const columns = status?.userColumns ?? {};
  const schemaOk =
    dbConnected && columns.googleId && columns.educationLevel && columns.onboardingDone && status?.auditLogTable;

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-50/60 via-background to-background px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* En-tête */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg shadow-blue-500/25">
            <Database className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Diagnostic &amp; réparation de la base
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            QuizExam BF — vérifie la configuration et répare le schéma en un clic, sans toucher aux données.
          </p>
        </div>

        {/* Cartes d'état */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StateCard
            label="Variable DATABASE_URL"
            ok={!!dbConfigured}
            unknown={!health}
            okText="Configurée"
            koText="Manquante sur ce projet Vercel"
          />
          <StateCard
            label="Connexion base"
            ok={dbConnected}
            unknown={!status}
            okText="Connectée"
            koText="Injoignable"
          />
          <StateCard
            label="Schéma à jour"
            ok={!!schemaOk}
            unknown={!status}
            okText="À jour"
            koText="Colonnes manquantes"
          />
        </div>

        {/* Alertes + actions */}
        <div className="mt-6 space-y-4">
          {health && !dbConfigured && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-900">
                    Ce projet Vercel n&apos;a pas de variable DATABASE_URL
                  </p>
                  <p className="mt-1 text-sm text-orange-800">
                    C&apos;est la cause de toutes les erreurs d&apos;authentification sur ce domaine :
                    connexion, inscription et administrateur sont impossibles tant que la variable
                    n&apos;est pas ajoutée. Suivez les étapes ci-dessous (5 minutes), puis redéployez.
                  </p>
                </div>
              </div>
              <ol className="mt-4 space-y-3">
                {VERCEL_STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-orange-900">{step.title}</p>
                      <p className="text-sm text-orange-800">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs text-orange-900">
                💡 Astuce : le projet <strong>quizexam-bf1-5tlh</strong> possède déjà une base configurée et
                fonctionnelle — vous pouvez aussi simplement utiliser son domaine
                <Copyable url="https://quizexam-bf1-5tlh.vercel.app" /> en attendant.
              </p>
            </div>
          )}

          {health && dbConfigured && !dbConnected && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Base de données injoignable</p>
                  <p className="mt-1 text-sm text-red-800">
                    La variable existe mais la connexion échoue. Vérifiez l&apos;URL Supabase
                    (port direct <strong>5432</strong>, pas le pooler 6543), les credentials et que le
                    projet Supabase n&apos;est pas en pause.
                  </p>
                </div>
              </div>
            </div>
          )}

          {dbConnected && !schemaOk && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">Schéma à synchroniser</p>
                  <p className="mt-1 text-sm text-blue-800">
                    Des colonnes manquent (c&apos;est ce qui provoquait l&apos;erreur
                    « User.googleId does not exist »). La réparation ci-dessous est idempotente et
                    n&apos;efface rien.
                  </p>
                </div>
              </div>
            </div>
          )}

          {migrate && (
            <div
              className={`rounded-2xl border p-5 ${
                migrate.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
              }`}
            >
              <p className={`font-semibold ${migrate.ok ? "text-emerald-900" : "text-red-900"}`}>
                {migrate.ok ? "✓ Réparation terminée" : "✗ Réparation échouée"}
              </p>
              {migrate.applied && migrate.applied.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {migrate.applied.map((stmt, i) => (
                    <li key={i} className="font-mono">
                      • {stmt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Boutons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={runRepair}
              disabled={busy !== null || !dbConnected}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "repair" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              Réparer la base
            </button>
            <button
              onClick={runCheck}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              {busy === "check" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Relancer le diagnostic
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-blue-600 hover:underline"
            >
              Retour au site <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Cette page n&apos;expose aucune donnée utilisateur — uniquement des états techniques (booléens).
          </p>
        </div>
      </div>
    </main>
  );
}

function StateCard({
  label,
  ok,
  unknown,
  okText,
  koText,
}: {
  label: string;
  ok: boolean;
  unknown?: boolean;
  okText: string;
  koText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {unknown ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <span
          className={`text-sm font-semibold ${unknown ? "text-slate-400" : ok ? "text-emerald-700" : "text-red-600"}`}
        >
          {unknown ? "Vérification…" : ok ? okText : koText}
        </span>
      </div>
    </div>
  );
}

function Copyable({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mx-1 inline-flex items-center gap-1 rounded-lg bg-orange-600/10 px-2 py-0.5 font-mono text-xs font-semibold text-orange-700 hover:bg-orange-600/20"
    >
      {url}
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
