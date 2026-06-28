"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
<<<<<<< Updated upstream
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Trash2,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  WifiOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getOfflineBanks,
  downloadBankForOffline,
  removeOfflineBank,
  getOfflineStorageBytes,
  syncOfflineSessions,
  getPendingSessions,
  type CachedBank,
} from "@/lib/offline-manager";
import { useOfflineMode } from "@/lib/use-offline-mode";

const LS_QUOTA_BYTES = 5 * 1024 * 1024; // 5 MB soft budget (localStorage is ~5 MB)

interface BankListItem {
  id: string;
  title: string;
  category: string;
  _count?: { questions: number };
}

/**
 * OfflineManagerPanel — embedded in the SettingsPanel as a new section.
 *
 * Lets the user:
 *   - Browse all available banks
 *   - Download a bank's questions for offline use (cached in localStorage)
 *   - Remove a cached bank
 *   - See the storage usage (cached bytes vs. soft budget)
 *   - See the sync status (pending offline sessions → flushed when online)
 *   - Manually trigger a sync
 *
 * Premium users can cache unlimited banks; free users are limited to 1
 * (enforced client-side as a UX hint — the real limit lives on the server
 * via the subscription-limits module).
 */
export function OfflineManagerPanel() {
  const { isOnline } = useOfflineMode();
  const [banks, setBanks] = useState<BankListItem[]>([]);
  const [cached, setCached] = useState<CachedBank[]>([]);
  const [bytes, setBytes] = useState(0);
  const [pending, setPending] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    setCached(getOfflineBanks());
    setBytes(getOfflineStorageBytes());
    setPending(getPendingSessions().length);
  }, []);

  const loadBanks = useCallback(async () => {
    try {
      const res = await fetch("/api/banks");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBanks(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setIsPremium(Boolean(data.isPremium));
      }
    } catch {
      // ignore
=======
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Trash2,
  RefreshCw,
  CloudOff,
  HardDrive,
  CheckCircle2,
  CloudUpload,
  Loader2,
  WifiOff,
} from "lucide-react";
import {
  downloadBankForOffline,
  getOfflineBanks,
  removeOfflineBank,
  syncOfflineSessions,
  getOfflineSessions,
  getOfflineStorageSize,
  type OfflineBankSummary,
  type OfflineSession,
  type SyncResult,
} from "@/lib/offline-manager";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

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

export function OfflineManagerPanel() {
  const [banks, setBanks] = useState<OfflineBankSummary[]>([]);
  const [sessions, setSessions] = useState<OfflineSession[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bankIdInput, setBankIdInput] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s, sz] = await Promise.all([
        getOfflineBanks(),
        getOfflineSessions(),
        getOfflineStorageSize(),
      ]);
      setBanks(b);
      setSessions(s);
      setStorageBytes(sz);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
>>>>>>> Stashed changes
    }
  }, []);

  useEffect(() => {
<<<<<<< Updated upstream
    loadBanks();
    loadSubscription();
    refresh();
    // Refresh when the user comes back online.
    const onOnline = () => refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [loadBanks, loadSubscription, refresh]);

  const cachedIds = new Set(cached.map((c) => c.bank.id));
  const maxOffline = isPremium ? Infinity : 1;
  const atLimit = cached.length >= maxOffline;

  async function handleDownload(bankId: string, title: string) {
    if (atLimit && !cachedIds.has(bankId)) {
      toast.error(
        `Limite du plan gratuit atteinte (${maxOffline} banque hors ligne). Passez à Premium pour plus.`
      );
      return;
    }
    setDownloadingId(bankId);
    try {
      const result = await downloadBankForOffline(bankId);
      if (result) {
        toast.success(`« ${title} » disponible hors ligne (${result.questions.length} questions).`);
        refresh();
      } else {
        toast.error("Échec du téléchargement de la banque.");
      }
    } finally {
      setDownloadingId(null);
    }
  }

  function handleRemove(bankId: string, title: string) {
    if (removeOfflineBank(bankId)) {
      toast.success(`« ${title} » retiré du cache hors ligne.`);
      refresh();
=======
    refresh();
  }, [refresh]);

  async function handleDownload() {
    const id = bankIdInput.trim();
    if (!id) {
      toast({
        title: "ID de banque requis",
        description: "Saisissez l'identifiant de la banque à télécharger.",
        variant: "destructive",
      });
      return;
    }
    setDownloading(true);
    try {
      const bank = await downloadBankForOffline(id);
      toast({
        title: "Banque téléchargée ✓",
        description: `« ${bank.title} » — ${bank.questions.length} questions disponibles hors ligne.`,
      });
      setBankIdInput("");
      await refresh();
    } catch (e) {
      toast({
        title: "Échec du téléchargement",
        description: e instanceof Error ? e.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleRemove(bankId: string, title: string) {
    if (!confirm(`Supprimer « ${title} » du stockage hors ligne ?`)) return;
    try {
      await removeOfflineBank(bankId);
      toast({ title: "Banque supprimée du hors-ligne" });
      await refresh();
    } catch (e) {
      toast({
        title: "Échec de la suppression",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
>>>>>>> Stashed changes
    }
  }

  async function handleSync() {
<<<<<<< Updated upstream
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncOfflineSessions();
      if (result.synced > 0) {
        toast.success(`${result.synced} session(s) synchronisée(s).`);
      } else if (result.failed === 0) {
        toast.info("Aucune session en attente de synchronisation.");
      } else {
        toast.error(`${result.failed} session(s) non synchronisée(s). Réessayez plus tard.`);
      }
      refresh();
=======
    setSyncing(true);
    try {
      const result = await syncOfflineSessions();
      setLastSync(result);
      if (result.total === 0) {
        toast({
          title: "Rien à synchroniser",
          description: "Aucune session en attente.",
        });
      } else if (result.failed === 0) {
        toast({
          title: "Synchronisation terminée ✓",
          description: `${result.success} session(s) envoyée(s) au serveur.`,
        });
      } else {
        toast({
          title: "Synchronisation partielle",
          description: `${result.success} réussie(s), ${result.failed} échec(s).`,
          variant: "destructive",
        });
      }
      await refresh();
    } catch (e) {
      toast({
        title: "Échec de la synchronisation",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
>>>>>>> Stashed changes
    } finally {
      setSyncing(false);
    }
  }

<<<<<<< Updated upstream
  const usagePct = Math.min(100, Math.round((bytes / LS_QUOTA_BYTES) * 100));
  const usageKB = (bytes / 1024).toFixed(1);
  const budgetKB = (LS_QUOTA_BYTES / 1024).toFixed(0);

  return (
    <div className="space-y-3">
      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {isOnline ? (
          <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> En ligne
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
            <WifiOff className="h-3 w-3" /> Hors ligne
          </Badge>
        )}
        {pending > 0 ? (
          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
            {pending} session(s) en attente
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-700">
            0 session en attente
          </Badge>
        )}
        {isPremium === false && (
          <Badge variant="outline" className="gap-1">
            Plan gratuit · 1 banque max
          </Badge>
        )}
        {isPremium === true && (
          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
            Premium · banques illimitées
          </Badge>
        )}
      </div>

      {/* Storage usage */}
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <HardDrive className="h-3.5 w-3.5 text-sky-600" />
            Stockage hors ligne
          </span>
          <span className="text-muted-foreground">
            {usageKB} KB / {budgetKB} KB
          </span>
        </div>
        <Progress value={usagePct} className="h-1.5" />
      </Card>

      {/* Sync button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing || !isOnline || pending === 0}
        className="w-full gap-2"
      >
        {syncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Synchroniser {pending > 0 ? `(${pending})` : ""}
      </Button>

      {/* Cached banks list */}
      {cached.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Banques disponibles hors ligne
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {cached.map((c) => (
              <div
                key={c.bank.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.bank.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {c.questions.length} questions ·{" "}
                    {(c.sizeBytes / 1024).toFixed(1)} KB ·{" "}
                    {new Date(c.cachedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                  onClick={() => handleRemove(c.bank.id, c.bank.title)}
                  aria-label={`Retirer ${c.bank.title} du cache hors ligne`}
=======
  const pendingCount = sessions.filter((s) => !s.synced).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CloudOff className="h-4 w-4 text-sky-600" />
        Mode hors ligne
      </div>

      {/* Storage summary */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-500 to-cyan-600 p-4 text-white shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {banks.length} banque(s) · {sessions.length} session(s)
              </p>
              <p className="text-xs text-white/80">
                {formatBytes(storageBytes)} utilisés · {pendingCount} en attente de synchro
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={handleSync}
            disabled={syncing || pendingCount === 0}
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudUpload className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Synchroniser</span>
          </Button>
        </div>
      </Card>

      {/* Download new bank */}
      <Card className="p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Télécharger une banque pour usage hors ligne
        </p>
        <div className="flex gap-2">
          <Input
            value={bankIdInput}
            onChange={(e) => setBankIdInput(e.target.value)}
            placeholder="ID de la banque (ex: ckxxxx…)"
            disabled={downloading}
            className="text-xs"
            aria-label="ID de la banque à télécharger"
          />
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={downloading || !bankIdInput.trim()}
            className="gap-1.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Télécharger</span>
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Astuce : ouvrez une banque depuis l&apos;accueil, puis copiez son ID depuis l&apos;URL.
        </p>
      </Card>

      {/* Last sync result */}
      {lastSync && lastSync.total > 0 && (
        <Card className="p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
            <CloudUpload className="h-3.5 w-3.5 text-emerald-600" />
            Dernière synchronisation
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded border bg-muted/30 p-1.5">
              <p className="text-base font-bold text-sky-600">{lastSync.total}</p>
              <p className="text-[10px] text-muted-foreground">total</p>
            </div>
            <div className="rounded border bg-muted/30 p-1.5">
              <p className="text-base font-bold text-emerald-600">{lastSync.success}</p>
              <p className="text-[10px] text-muted-foreground">réussies</p>
            </div>
            <div className="rounded border bg-muted/30 p-1.5">
              <p className="text-base font-bold text-rose-600">{lastSync.failed}</p>
              <p className="text-[10px] text-muted-foreground">échouées</p>
            </div>
          </div>
        </Card>
      )}

      {/* Offline banks list */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium">Banques téléchargées</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={refresh}
            aria-label="Actualiser"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : banks.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 p-6 text-center text-xs text-muted-foreground">
            <WifiOff className="h-6 w-6 text-muted-foreground/60" />
            Aucune banque téléchargée.
            <span className="text-[10px]">
              Téléchargez une banque ci-dessus pour étudier sans connexion.
            </span>
          </div>
        ) : (
          <div className="max-h-72 divide-y overflow-y-auto">
            {banks.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{b.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.category} · {b.questionCount} Q · {formatBytes(b.sizeBytes)} ·{" "}
                    {formatDate(b.downloadedAt)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                  onClick={() => handleRemove(b.id, b.title)}
                  aria-label={`Supprimer ${b.title}`}
>>>>>>> Stashed changes
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
<<<<<<< Updated upstream
        </div>
      )}

      {/* All banks download list */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Télécharger une banque
        </p>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {banks.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Chargement…
            </p>
          )}
          {banks.map((b) => {
            const isCached = cachedIds.has(b.id);
            const isDownloading = downloadingId === b.id;
            return (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.category} · {b._count?.questions ?? "?"} questions
                  </p>
                </div>
                {isCached ? (
                  <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Hors ligne
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={isDownloading || (atLimit && !isCached)}
                    onClick={() => handleDownload(b.id, b.title)}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    Télécharger
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
=======
        )}
      </Card>

      {/* Pending sessions */}
      {sessions.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium">Sessions locales</span>
            <Badge variant="secondary" className="text-[10px]">
              {pendingCount} en attente
            </Badge>
          </div>
          <div className="max-h-48 divide-y overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.answers.length} réponses · {formatDate(s.completedAt)}
                  </p>
                </div>
                {s.synced ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Synchronisée
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    <CloudUpload className="mr-1 h-3 w-3" />
                    En attente
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
>>>>>>> Stashed changes
  );
}
