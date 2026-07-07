"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrefs } from "@/lib/prefs-store";
import { useQuizStore } from "@/lib/quiz-store";
import { toast } from "sonner";
import {
  Coins,
  Palette,
  User,
  Zap,
  Snowflake,
  Crown,
  Award,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Lock,
  Hourglass,
  ShieldCheck,
  Star,
} from "lucide-react";

/**
 * ShopView — buy cosmetic + booster items with QuizCoins.
 *
 * Items are grouped into 5 categories:
 *   • Themes        — accent color themes (5 options, 100 coins each)
 *   • Avatars       — avatar presets (50 coins each)
 *   • Boosters      — XP boost (2× for 1h), Streak freeze (150 coins)
 *   • Premium       — 24h premium preview (500 coins)
 *   • Badges        — custom profile badge (300 coins)
 *
 * All purchases update the prefs store. Themes can be activated/deactivated;
 * boosters apply immediately on purchase.
 */

interface ShopTheme {
  id: string;
  label: string;
  description: string;
  price: number;
  emoji: string;
  /** Tailwind gradient for the preview swatch. */
  gradient: string;
  /** Tailwind ring/border color for the preview swatch. */
  ring: string;
}

const THEMES: ShopTheme[] = [
  {
    id: "emerald",
    label: "Émeraude",
    description: "Thème par défaut — vert apaisant.",
    price: 100,
    emoji: "🌿",
    gradient: "from-emerald-400 to-teal-600",
    ring: "ring-emerald-400",
  },
  {
    id: "violet",
    label: "Violet",
    description: "Tons violets et pourpres.",
    price: 100,
    emoji: "🔮",
    gradient: "from-violet-400 to-purple-600",
    ring: "ring-violet-400",
  },
  {
    id: "sunset",
    label: "Coucher de soleil",
    description: "Oranges chauds et rouges.",
    price: 100,
    emoji: "🌅",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    ring: "ring-orange-400",
  },
  {
    id: "ocean",
    label: "Océan",
    description: "Bleus profonds et cyans.",
    price: 100,
    emoji: "🌊",
    gradient: "from-cyan-400 to-sky-600",
    ring: "ring-cyan-400",
  },
  {
    id: "dark",
    label: "Noir profond",
    description: "Thème sombre haute-contraste.",
    price: 100,
    emoji: "🌑",
    gradient: "from-slate-700 to-black",
    ring: "ring-slate-500",
  },
];

interface ShopAvatar {
  id: string;
  label: string;
  emoji: string;
  price: number;
}

const AVATARS: ShopAvatar[] = [
  { id: "scholar", label: "Érudit", emoji: "🎓", price: 50 },
  { id: "ninja", label: "Ninja", emoji: "🥷", price: 50 },
  { id: "wizard", label: "Magicien", emoji: "🧙", price: 50 },
  { id: "astronaut", label: "Astronaute", emoji: "🧑‍🚀", price: 50 },
  { id: "robot", label: "Robot", emoji: "🤖", price: 50 },
  { id: "fox", label: "Renard", emoji: "🦊", price: 50 },
  { id: "lion", label: "Lion", emoji: "🦁", price: 50 },
  { id: "unicorn", label: "Licorne", emoji: "🦄", price: 50 },
];

interface ShopBadge {
  id: string;
  label: string;
  emoji: string;
  price: number;
  description: string;
}

const BADGES: ShopBadge[] = [
  {
    id: "founder",
    label: "Pionnier",
    emoji: "🏆",
    price: 300,
    description: "Badge « Pionnier » affiché sur votre profil.",
  },
  {
    id: "mentor",
    label: "Mentor",
    emoji: "💎",
    price: 300,
    description: "Badge « Mentor » pour les aidants du forum.",
  },
  {
    id: "strategist",
    label: "Stratège",
    emoji: "🎯",
    price: 300,
    description: "Badge « Stratège » pour les esprits analytiques.",
  },
];

interface ShopBooster {
  id: string;
  label: string;
  description: string;
  price: number;
  emoji: string;
  /** Tailwind gradient for the icon background. */
  gradient: string;
}

const BOOSTERS: ShopBooster[] = [
  {
    id: "xp-boost-1h",
    label: "Boost XP (2× — 1 heure)",
    description:
      "Double tous les gains d'XP pendant 1 heure. Idéal avant une grosse session de révision.",
    price: 200,
    emoji: "⚡",
    gradient: "from-amber-400 to-orange-600",
  },
  {
    id: "streak-freeze",
    label: "Protection de série",
    description:
      "Protégez votre série d'un jour manqué. S'active automatiquement le lendemain d'une absence.",
    price: 150,
    emoji: "❄️",
    gradient: "from-cyan-300 to-sky-500",
  },
  {
    id: "premium-24h",
    label: "Aperçu Premium (24h)",
    description:
      "Débloquez toutes les fonctionnalités Premium (illimité, IA, certificats) pendant 24 heures.",
    price: 500,
    emoji: "👑",
    gradient: "from-amber-500 to-yellow-600",
  },
];

/** Compute the remaining time (in ms) for a booster that ends at `endMs`. */
function remainingMs(endMs: number | null): number {
  if (endMs === null) return 0;
  return Math.max(0, endMs - Date.now());
}

function msToHuman(ms: number): string {
  if (ms <= 0) return "expiré";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** Hook that re-renders every second so countdowns stay fresh. */
function useTick(intervalMs = 1000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

export function ShopView() {
  const goHome = useQuizStore((s) => s.goHome);
  const quizCoins = usePrefs((s) => s.quizCoins);
  const spendCoins = usePrefs((s) => s.spendCoins);
  const ownedThemes = usePrefs((s) => s.ownedThemes);
  const ownedAvatars = usePrefs((s) => s.ownedAvatars);
  const ownedBadges = usePrefs((s) => s.ownedBadges);
  const activeTheme = usePrefs((s) => s.activeTheme);
  const setActiveTheme = usePrefs((s) => s.setActiveTheme);
  const addOwnedTheme = usePrefs((s) => s.addOwnedTheme);
  const addOwnedAvatar = usePrefs((s) => s.addOwnedAvatar);
  const addOwnedBadge = usePrefs((s) => s.addOwnedBadge);
  const activateXpBoost = usePrefs((s) => s.activateXpBoost);
  const activatePremiumPreview = usePrefs((s) => s.activatePremiumPreview);
  const addStreakFreeze = usePrefs((s) => s.addStreakFreeze);
  const xpBoostUntil = usePrefs((s) => s.xpBoostUntil);
  const premiumPreviewUntil = usePrefs((s) => s.premiumPreviewUntil);
  const streakFreezes = usePrefs((s) => s.streakFreezes);

  // Re-render every second so booster countdowns stay fresh.
  useTick(1000);

  // Pending purchase (for the confirmation dialog).
  const [pending, setPending] = useState<
    | {
        kind: "theme" | "avatar" | "booster" | "badge";
        id: string;
        label: string;
        price: number;
        emoji: string;
        description: string;
      }
    | null
  >(null);

  const xpRemaining = remainingMs(xpBoostUntil);
  const premiumRemaining = remainingMs(premiumPreviewUntil);

  const canAfford = (price: number) => quizCoins >= price;

  function tryBuy(item: {
    kind: "theme" | "avatar" | "booster" | "badge";
    id: string;
    label: string;
    price: number;
    emoji: string;
    description: string;
  }) {
    if (!canAfford(item.price)) {
      toast.error("Solde insuffisant", {
        description: `Il vous manque ${item.price - quizCoins} 🪙 pour « ${item.label} ».`,
      });
      return;
    }
    setPending(item);
  }

  function confirmBuy() {
    if (!pending) return;
    const ok = spendCoins(pending.price);
    if (!ok) {
      toast.error("Achat impossible — solde insuffisant.");
      setPending(null);
      return;
    }
    switch (pending.kind) {
      case "theme":
        addOwnedTheme(pending.id);
        toast.success(`Thème « ${pending.label} » débloqué !`, {
          description: "Activez-le depuis l'onglet Thèmes.",
        });
        break;
      case "avatar":
        addOwnedAvatar(pending.id);
        toast.success(`Avatar « ${pending.label} » débloqué !`, {
          description: "Affichez-le sur votre profil.",
        });
        break;
      case "badge":
        addOwnedBadge(pending.id);
        toast.success(`Badge « ${pending.label} » débloqué !`, {
          description: "Équipez-le depuis votre profil.",
        });
        break;
      case "booster":
        if (pending.id === "xp-boost-1h") {
          activateXpBoost(60 * 60 * 1000);
          toast.success("⚡ Boost XP 2× activé pendant 1 heure !");
        } else if (pending.id === "streak-freeze") {
          addStreakFreeze(1);
          toast.success("❄️ Protection de série ajoutée (+1).");
        } else if (pending.id === "premium-24h") {
          activatePremiumPreview(24 * 60 * 60 * 1000);
          toast.success("👑 Aperçu Premium activé pendant 24 heures !");
        }
        break;
    }
    setPending(null);
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={goHome}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Button>

      {/* Balance header */}
      <Card className="relative overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6 dark:border-amber-800/60 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/40">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/30 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Boutique QuizCoins</h2>
              <p className="text-xs text-muted-foreground">
                Dépensez vos QuizCoins pour personnaliser votre expérience.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-card/80 p-3 text-center shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Solde
            </p>
            <p className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              <Coins className="h-5 w-5" />
              {quizCoins}
            </p>
          </div>
        </div>
        {/* Active boosters */}
        {(xpRemaining > 0 || premiumRemaining > 0 || streakFreezes > 0) && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {xpRemaining > 0 && (
              <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                <Zap className="h-3 w-3" />
                Boost XP 2× · {msToHuman(xpRemaining)}
              </Badge>
            )}
            {premiumRemaining > 0 && (
              <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:opacity-90">
                <Crown className="h-3 w-3" />
                Premium · {msToHuman(premiumRemaining)}
              </Badge>
            )}
            {streakFreezes > 0 && (
              <Badge variant="outline" className="gap-1 border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300">
                <Snowflake className="h-3 w-3" />
                {streakFreezes} protection(s)
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Tabs for categories */}
      <Tabs defaultValue="themes">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="themes" className="gap-1.5">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Thèmes</span>
          </TabsTrigger>
          <TabsTrigger value="avatars" className="gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Avatars</span>
          </TabsTrigger>
          <TabsTrigger value="boosters" className="gap-1.5">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Boosters</span>
          </TabsTrigger>
          <TabsTrigger value="premium" className="gap-1.5">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Premium</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-1.5">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Badges</span>
          </TabsTrigger>
        </TabsList>

        {/* Themes */}
        <TabsContent value="themes" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((theme) => {
              const owned = ownedThemes.includes(theme.id);
              const active = activeTheme === theme.id;
              return (
                <Card
                  key={theme.id}
                  className={`relative overflow-hidden p-4 ${
                    active ? "ring-2 ring-emerald-400" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient} text-2xl shadow-md ring-2 ${theme.ring} ring-offset-2 ring-offset-background`}
                    >
                      {theme.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{theme.label}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {theme.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="gap-1 tabular-nums">
                      <Coins className="h-3 w-3 text-amber-500" />
                      {theme.price}
                    </Badge>
                    {active ? (
                      <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                        <CheckCircle2 className="h-3 w-3" /> Actif
                      </Badge>
                    ) : owned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTheme(theme.id)}
                      >
                        Activer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canAfford(theme.price)}
                        onClick={() =>
                          tryBuy({
                            kind: "theme",
                            id: theme.id,
                            label: theme.label,
                            price: theme.price,
                            emoji: theme.emoji,
                            description: theme.description,
                          })
                        }
                      >
                        <Lock className="mr-1 h-3 w-3" />
                        Acheter
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          {activeTheme !== "default" && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTheme("default")}
              >
                Revenir au thème par défaut
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Avatars */}
        <TabsContent value="avatars" className="space-y-3">
          <Card className="p-3 text-xs text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-emerald-500" />
            Les avatars achetés apparaissent sur votre profil public. Plus
            d&apos;avatars seront ajoutés dans les prochaines saisons.
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {AVATARS.map((av) => {
              const owned = ownedAvatars.includes(av.id);
              return (
                <Card key={av.id} className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 text-3xl dark:from-emerald-950/60 dark:to-teal-950/60">
                    {av.emoji}
                  </div>
                  <p className="text-sm font-semibold">{av.label}</p>
                  <Badge variant="outline" className="gap-1 tabular-nums">
                    <Coins className="h-3 w-3 text-amber-500" />
                    {av.price}
                  </Badge>
                  {owned ? (
                    <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3" /> Possédé
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canAfford(av.price)}
                      onClick={() =>
                        tryBuy({
                          kind: "avatar",
                          id: av.id,
                          label: av.label,
                          price: av.price,
                          emoji: av.emoji,
                          description: `Avatar « ${av.label} »`,
                        })
                      }
                    >
                      Acheter
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Boosters */}
        <TabsContent value="boosters" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BOOSTERS.filter((b) => b.id !== "premium-24h").map((b) => (
              <Card key={b.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${b.gradient} text-2xl shadow-md`}
                  >
                    {b.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.label}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{b.description}</p>
                {b.id === "streak-freeze" && (
                  <p className="text-[11px] text-cyan-700 dark:text-cyan-300">
                    Vous en possédez actuellement : <strong>{streakFreezes}</strong>
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <Badge variant="outline" className="gap-1 tabular-nums">
                    <Coins className="h-3 w-3 text-amber-500" />
                    {b.price}
                  </Badge>
                  <Button
                    size="sm"
                    disabled={!canAfford(b.price)}
                    onClick={() =>
                      tryBuy({
                        kind: "booster",
                        id: b.id,
                        label: b.label,
                        price: b.price,
                        emoji: b.emoji,
                        description: b.description,
                      })
                    }
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    Acheter
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Premium */}
        <TabsContent value="premium" className="space-y-3">
          <Card className="relative overflow-hidden border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6 dark:border-amber-700/60 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/40">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/30 blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-md">
                  <Crown className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Aperçu Premium (24h)</h3>
                  <p className="text-xs text-muted-foreground">
                    Débloquez toutes les fonctionnalités Premium pendant 24 heures :
                    questions illimitées, génération IA, certificats, export Anki…
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Badge variant="outline" className="gap-1 tabular-nums text-base">
                  <Coins className="h-4 w-4 text-amber-500" />
                  500
                </Badge>
                <Button
                  disabled={!canAfford(500)}
                  onClick={() =>
                    tryBuy({
                      kind: "booster",
                      id: "premium-24h",
                      label: "Aperçu Premium (24h)",
                      price: 500,
                      emoji: "👑",
                      description:
                        "Débloquez toutes les fonctionnalités Premium pendant 24 heures.",
                    })
                  }
                  className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:opacity-90"
                >
                  <Crown className="h-4 w-4" />
                  Acheter
                </Button>
              </div>
            </div>
            {premiumRemaining > 0 && (
              <div className="relative mt-4 flex items-center gap-2 rounded-lg bg-card/80 p-3 text-sm">
                <Hourglass className="h-4 w-4 text-amber-600" />
                <span>
                  Aperçu Premium actif — reste <strong>{msToHuman(premiumRemaining)}</strong>
                </span>
              </div>
            )}
          </Card>

          <Card className="border-border/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Comment gagner des QuizCoins
            </div>
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <li>• Terminer un quiz : <strong>+10 🪙</strong></li>
              <li>• Score parfait (100%) : <strong>+50 🪙</strong></li>
              <li>• Défi du jour : <strong>+25 🪙</strong></li>
              <li>• Message sur le forum : <strong>+5 🪙</strong></li>
              <li>• Quête quotidienne : <strong>+20-30 🪙</strong></li>
              <li>• Quête hebdomadaire : <strong>+50-100 🪙</strong></li>
            </ul>
          </Card>
        </TabsContent>

        {/* Badges */}
        <TabsContent value="badges" className="space-y-3">
          <Card className="p-3 text-xs text-muted-foreground">
            <Star className="mr-1 inline h-3 w-3 text-amber-500" />
            Les badges personnalisés s&apos;affichent sur votre profil public
            pour mettre en avant votre personnalité ou vos contributions.
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BADGES.map((b) => {
              const owned = ownedBadges.includes(b.id);
              return (
                <Card key={b.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 text-2xl shadow-md">
                      {b.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{b.label}</p>
                      <p className="text-xs text-muted-foreground">{b.description}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <Badge variant="outline" className="gap-1 tabular-nums">
                      <Coins className="h-3 w-3 text-amber-500" />
                      {b.price}
                    </Badge>
                    {owned ? (
                      <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                        <CheckCircle2 className="h-3 w-3" /> Possédé
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canAfford(b.price)}
                        onClick={() =>
                          tryBuy({
                            kind: "badge",
                            id: b.id,
                            label: b.label,
                            price: b.price,
                            emoji: b.emoji,
                            description: b.description,
                          })
                        }
                      >
                        <Lock className="mr-1 h-3 w-3" />
                        Acheter
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation dialog */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{pending?.emoji}</span>
              Confirmer l&apos;achat
            </DialogTitle>
            <DialogDescription>
              {pending?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Article</span>
              <span className="font-semibold">{pending?.label}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Prix</span>
              <span className="flex items-center gap-1 font-semibold tabular-nums">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {pending?.price}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Solde après achat</span>
              <span className="flex items-center gap-1 font-semibold tabular-nums">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {pending ? quizCoins - pending.price : 0}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Annuler
            </Button>
            <Button
              onClick={confirmBuy}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
            >
              <Coins className="h-4 w-4" />
              Confirmer l&apos;achat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
