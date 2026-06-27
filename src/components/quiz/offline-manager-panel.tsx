"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    }
  }, []);

  useEffect(() => {
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
    }
  }

  async function handleSync() {
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
    } finally {
      setSyncing(false);
    }
  }

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
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
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
  );
}
