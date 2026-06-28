"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Sparkles, RefreshCw } from "lucide-react";
import { PricingModal } from "./pricing-modal";

interface SubscriptionInfo {
  plan: "free" | "premium";
  isPremium: boolean;
  subscriptionUntil: string | null;
  dailyQuestionLimit: number;
}

/**
 * Small dashboard widget that shows the current subscription tier and
 * today's usage. For free users, displays progress toward the 50 Q/day limit.
 */
export function SubscriptionLimits() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [usedToday, setUsedToday] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pricingOpen, setPricingOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [subRes, sessRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/sessions"),
      ]);
      if (subRes.ok) {
        const json = await subRes.json();
        setInfo(json.current);
      }
      if (sessRes.ok) {
        const sessions = await sessRes.json();
        // Count today's answers from sessions
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const count = (sessions as any[]).reduce(
          (sum, s) =>
            sum +
            ((s.answers ?? []) as any[]).filter(
              (a) =>
                a.answeredAt &&
                new Date(a.answeredAt).getTime() >= start.getTime()
            ).length,
          0
        );
        setUsedToday(count);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !info) return null;

  const isPremium = info.isPremium;
  const limit = info.dailyQuestionLimit;
  const remaining = Math.max(0, limit - usedToday);
  const pct = isPremium ? 0 : Math.min(100, Math.round((usedToday / limit) * 100));

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isPremium
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
              }`}
            >
              {isPremium ? (
                <Crown className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">
                {isPremium ? "Premium" : "Plan Gratuit"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isPremium
                  ? info.subscriptionUntil
                    ? `Jusqu'au ${new Date(info.subscriptionUntil).toLocaleDateString("fr-FR")}`
                    : "Actif"
                  : `${remaining} / ${limit} questions restantes aujourd'hui`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={load}
              aria-label="Actualiser"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {!isPremium && (
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                onClick={() => setPricingOpen(true)}
              >
                <Crown className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
        {!isPremium && (
          <div className="mt-3 space-y-1.5">
            <Progress value={pct} className="h-1.5" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{usedToday} aujourd'hui</span>
              <span>limite: {limit}</span>
            </div>
            {pct >= 80 && (
              <Badge variant="destructive" className="text-[10px]">
                Limite bientôt atteinte — passez Premium
              </Badge>
            )}
          </div>
        )}
      </Card>
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} onUpgraded={load} />
    </>
  );
}
