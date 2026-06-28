"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
<<<<<<< Updated upstream
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionState {
  tier: "free" | "premium" | "admin";
  isPremium: boolean;
  usedToday: number;
  remaining: number | null;
  limit: number | null;
  canStartMore: boolean;
  planFeatures: string[];
=======
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlanInfo {
  name: string;
  price: number;
  dailyQuestionLimit: number;
  features: string[];
}

interface SubscriptionData {
  current: {
    plan: "free" | "premium";
    isPremium: boolean;
    subscriptionUntil: string | null;
    dailyQuestionLimit: number;
  };
  plans: {
    free: PlanInfo;
    premium: PlanInfo;
  };
>>>>>>> Stashed changes
}

interface PricingModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
<<<<<<< Updated upstream
  /** Optional callback fired after a successful upgrade. */
  onUpgraded?: () => void;
}

/**
 * PricingModal — shows a free-vs-premium comparison and a mock "Passer à
 * Premium" button. The button POSTs /api/subscription which just flips
 * the user's `subscription` column to "premium" (no real payment). When
 * the user is already premium, the button is replaced by an "Active"
 * badge and a "Revenir en Free" link.
 *
 * Also surfaces the user's current daily-questions quota usage so they
 * can see how close they are to the limit.
 */
export function PricingModal({ open, onOpenChange, onUpgraded }: PricingModalProps) {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setState(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function upgrade() {
    setUpgrading(true);
=======
  onUpgraded?: () => void;
}

export function PricingModal({ open, onOpenChange, onUpgraded }: PricingModalProps) {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<"free" | "premium" | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function switchPlan(plan: "free" | "premium") {
    setSwitching(plan);
>>>>>>> Stashed changes
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
<<<<<<< Updated upstream
        body: JSON.stringify({ tier: "premium" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Premium activé ! Profitez de toutes les fonctionnalités. 🎉");
        // Refetch to update UI
        const fresh = await fetch("/api/subscription").then((r) => r.json());
        setState(fresh);
        onUpgraded?.();
      } else {
        toast.error(data?.error ?? "Échec de la mise à niveau");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUpgrading(false);
    }
  }

  async function downgrade() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "free" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Retour au plan gratuit.");
        const fresh = await fetch("/api/subscription").then((r) => r.json());
        setState(fresh);
      } else {
        toast.error(data?.error ?? "Échec");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUpgrading(false);
    }
  }

  const isPremium = state?.isPremium ?? false;
  const usedToday = state?.usedToday ?? 0;
  const limit = state?.limit ?? 50;
  const remaining = state?.remaining ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((usedToday / limit) * 100)) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Passer à Premium</DialogTitle>
              <DialogDescription>
                Débloquez tout le potentiel de QuizExam BF
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Current quota (free users only) */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {!isPremium && (
              <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-amber-900 dark:text-amber-200">
                    Quota du jour (plan gratuit)
                  </span>
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    {usedToday} / {limit}
                  </span>
                </div>
                <Progress value={pct} className="h-2 bg-amber-200 dark:bg-amber-900" />
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  {remaining > 0
                    ? `Il vous reste ${remaining} questions aujourd'hui.`
                    : "Limite quotidienne atteinte — passez à Premium pour continuer."}
                </p>
              </Card>
            )}

            {isPremium && (
              <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  <Sparkles className="h-4 w-4" />
                  Vous êtes déjà Premium — merci pour votre soutien !
                </div>
              </Card>
            )}

            {/* Comparison grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Free plan */}
              <Card
                className={`flex flex-col p-5 ${
                  !isPremium ? "border-2 border-emerald-400" : ""
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold">Gratuit</h3>
                  </div>
                  {!isPremium && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Plan actuel
                    </Badge>
                  )}
                </div>
                <p className="mb-3 text-3xl font-extrabold">0 FCFA</p>
                <ul className="space-y-2 text-sm">
                  {(state?.planFeatures ?? []).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Premium plan */}
              <Card
                className={`flex flex-col p-5 ${
                  isPremium
                    ? "border-2 border-amber-400"
                    : "border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <h3 className="font-bold">Premium</h3>
                  </div>
                  {isPremium && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Actif
                    </Badge>
                  )}
                </div>
                <p className="mb-3 text-3xl font-extrabold">
                  2 000 FCFA
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / mois
                  </span>
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Questions illimitées</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Téléversement PDF → QCM</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Tuteur IA personnalisé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Certificats de réussite</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Mode hors ligne illimité</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Support prioritaire</span>
                  </li>
                </ul>
              </Card>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mode démo — aucun paiement réel n&apos;est effectué.
              </p>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Button
                    variant="outline"
                    onClick={downgrade}
                    disabled={upgrading}
                    className="gap-2"
                  >
                    {upgrading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Revenir en Free
                  </Button>
                ) : (
                  <Button
                    onClick={upgrade}
                    disabled={upgrading}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
                  >
                    {upgrading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4" />
                    )}
                    Passer à Premium
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
=======
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: "Erreur",
          description: json?.error || "Échec du changement d'abonnement",
          variant: "destructive",
        });
      } else {
        toast({
          title:
            plan === "premium"
              ? "Bienvenue dans Premium ! 👑"
              : "Abonnement gratuit activé",
          description:
            plan === "premium"
              ? "30 jours d'accès premium activés."
              : "Vous êtes maintenant sur le plan gratuit.",
        });
        await load();
        onUpgraded?.();
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setSwitching(null);
    }
  }

  const isPremium = data?.current.isPremium ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Choisissez votre plan
          </DialogTitle>
          <DialogDescription>
            QuizExam BF est gratuit pour l&apos;essentiel. Passez Premium pour
            débloquer le tuteur IA, les certificats et les questions illimitées.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Free plan */}
            <Card
              className={`relative flex flex-col p-5 ${
                !isPremium ? "border-emerald-400 ring-2 ring-emerald-200" : ""
              }`}
            >
              {!isPremium && (
                <Badge className="absolute -top-2 right-4 bg-emerald-500 text-white">
                  Plan actuel
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-bold">Gratuit</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">
                0 FCFA<span className="text-sm font-normal text-muted-foreground">/mois</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                50 questions par jour
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-xs">
                {data?.plans.free.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={isPremium ? "outline" : "secondary"}
                className="mt-4"
                disabled={!isPremium || switching === "free"}
                onClick={() => switchPlan("free")}
              >
                {switching === "free" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPremium ? (
                  "Revenir au gratuit"
                ) : (
                  "Plan actuel"
                )}
              </Button>
            </Card>

            {/* Premium plan */}
            <Card
              className={`relative flex flex-col overflow-hidden p-5 ${
                isPremium
                  ? "border-amber-400 ring-2 ring-amber-200"
                  : "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20"
              }`}
            >
              {!isPremium && (
                <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  Recommandé
                </Badge>
              )}
              {isPremium && (
                <Badge className="absolute -top-2 right-4 bg-amber-500 text-white">
                  Plan actuel
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40">
                  <Crown className="h-5 w-5" />
                </div>
                <h3 className="font-bold">Premium</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">
                2 000 FCFA<span className="text-sm font-normal text-muted-foreground">/mois</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Questions illimitées · 30 jours
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-xs">
                {data?.plans.premium.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                disabled={isPremium || switching === "premium"}
                onClick={() => switchPlan("premium")}
              >
                {switching === "premium" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    Passer Premium
                  </>
                )}
              </Button>
            </Card>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Paiement à l&apos;activation (démo). Aucune carte requise. Vous pouvez
          annuler à tout moment.
        </p>
>>>>>>> Stashed changes
      </DialogContent>
    </Dialog>
  );
}
