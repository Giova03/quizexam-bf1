"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePrefs } from "@/lib/prefs-store";
import {
  Copy,
  Share2,
  Users,
  Gift,
  Sparkles,
  Check,
  UserPlus,
  Loader2,
} from "lucide-react";

interface ReferralData {
  referralCode: string;
  referralCount: number;
  xpEarned: number;
  xpPerReferral: number;
  referredUsers: Array<{ name: string; joinedAt: string }>;
  referredBy: string | null;
  referrer: { name: string; referralCode: string } | null;
}

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptCode, setAcceptCode] = useState("");
  const [accepting, setAccepting] = useState(false);

  // Sync referral count from the server with the local prefs store.
  // When the server count exceeds the local count, the prefs store awards
  // +50 XP per new referral (see syncReferrals in prefs-store.ts).
  const syncReferrals = usePrefs((s) => s.syncReferrals);
  const localReferralCount = usePrefs((s) => s.referralsCount);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Sync local XP mirror with the server count.
        if (typeof json.referralCount === "number") {
          syncReferrals(json.referralCount);
        }
      }
    } catch (e) {
      console.error("Failed to load referral data", e);
    } finally {
      setLoading(false);
    }
  }, [syncReferrals]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyCode() {
    if (!data?.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      setCopied(true);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Échec de la copie");
    }
  }

  async function copyLink() {
    if (!data?.referralCode) return;
    const url = `${window.location.origin}/?ref=${data.referralCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien de parrainage copié !");
    } catch {
      toast.error("Échec de la copie");
    }
  }

  async function shareReferral() {
    if (!data?.referralCode) return;
    const url = `${window.location.origin}/?ref=${data.referralCode}`;
    const shareData = {
      title: "Rejoins-moi sur QuizExam BF",
      text: `Inscris-toi sur QuizExam BF avec mon code de parrainage : ${data.referralCode}`,
      url,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled — no toast.
      }
    } else {
      await copyLink();
    }
  }

  async function acceptReferral() {
    if (!acceptCode.trim()) {
      toast.error("Entrez un code de parrainage");
      return;
    }
    setAccepting(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: acceptCode.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Parrainage accepté ! Bienvenue dans la communauté.");
        setAcceptOpen(false);
        setAcceptCode("");
        load();
      } else {
        toast.error(json.error || json.message || "Échec du parrainage");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <Card className="overflow-hidden border-violet-200 dark:border-violet-800">
        <Skeleton className="h-32 rounded-none" />
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-violet-200 dark:border-violet-800">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Gift className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              Programme de parrainage
              <Badge className="border-white/30 bg-white/20 text-white">
                +{data.xpPerReferral} XP / filleul
              </Badge>
            </h3>
            <p className="text-sm text-white/90">
              Invitez vos amis et gagnez de l&apos;XP à chaque inscription !
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 p-5">
        {/* Referral code + copy */}
        <div className="space-y-2">
          <Label htmlFor="referral-code" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Votre code de parrainage
          </Label>
          <div className="flex gap-2">
            <Input
              id="referral-code"
              readOnly
              value={data.referralCode}
              className="font-mono text-lg font-bold tracking-widest"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyCode}
              aria-label="Copier le code"
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Filleuls</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-300">
              {data.referralCount}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">XP gagnés</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {data.xpEarned}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={shareReferral}
            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
          >
            <Share2 className="h-4 w-4" />
            Partager
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={copyLink}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copier le lien
          </Button>
          {!data.referredBy && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAcceptOpen(true)}
              className="gap-2 text-violet-600 hover:text-violet-700"
            >
              <UserPlus className="h-4 w-4" />
              J&apos;ai un code
            </Button>
          )}
        </div>

        {/* Referrer info (if this user was referred) */}
        {data.referredBy && data.referrer && (
          <div className="flex items-center gap-2 rounded-lg bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
            <Gift className="h-4 w-4 shrink-0" />
            <span>
              Vous avez été parrainé par{" "}
              <strong>{data.referrer.name}</strong>.
            </span>
          </div>
        )}

        {/* Recent referrals list */}
        {data.referredUsers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filleuls récents
            </p>
            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {data.referredUsers.map((u, i) => (
                <div
                  key={`${u.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {u.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.joinedAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Accept referral dialog */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-violet-600" />
              Entrer un code de parrainage
            </DialogTitle>
            <DialogDescription>
              Si un ami vous a invité, entrez son code pour le créditer. Vous
              ne pouvez le faire qu&apos;une seule fois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="accept-code">Code de parrainage</Label>
              <Input
                id="accept-code"
                value={acceptCode}
                onChange={(e) => setAcceptCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="font-mono text-lg tracking-widest"
                maxLength={8}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={acceptReferral}
              disabled={accepting || !acceptCode.trim()}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
            >
              {accepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
