"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  syncOfflineSessions,
  getPendingSessions,
} from "@/lib/offline-manager";

/**
 * Offline mode hook.
 *
 * v19 — now also owns the AUTOMATIC background sync: whenever the device
 * comes back online (or the app boots while online with a non-empty queue),
 * every pending offline quiz session is replayed against the server
 * (POST /api/sessions → PATCH answers → POST complete) and a toast reports
 * the outcome. The manual sync button in the offline manager panel reuses
 * the exact same routine.
 */
export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistered, setSwRegistered] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(() => {
    setPendingCount(getPendingSessions().length);
  }, []);

  const runSync = useCallback(
    async (silent: boolean) => {
      if (typeof window === "undefined" || !navigator.onLine) return;
      const pending = getPendingSessions();
      setPendingCount(pending.length);
      if (pending.length === 0) return;
      setSyncing(true);
      try {
        const { synced, failed } = await syncOfflineSessions();
        refreshPending();
        if (synced > 0) {
          toast.success(
            synced === 1
              ? "1 quiz passé hors ligne a été synchronisé."
              : `${synced} quiz passés hors ligne ont été synchronisés.`
          );
        }
        if (failed > 0 && !silent) {
          toast.warning(
            `${failed} session(s) n'ont pas pu être synchronisées — nouvelle tentative au prochain retour du réseau.`
          );
        }
      } catch {
        // network flapped again mid-sync — queue untouched, retried later
      } finally {
        setSyncing(false);
      }
    },
    [refreshPending]
  );

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => setSwRegistered(true))
        .catch(() => {});
    }

    // Online/offline detection
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      // Device just came back: flush the offline quiz queue automatically.
      if (online) {
        void runSync(true);
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    setIsOnline(navigator.onLine);

    // Boot-time sync (app opened while online with a queued session from a
    // previous offline run).
    refreshPending();
    void runSync(true);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, swRegistered, pendingCount, syncing, runSync, refreshPending };
}
