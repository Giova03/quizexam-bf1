"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePrefs, type Badge as BadgeType } from "@/lib/prefs-store";
import { useQuizStore } from "@/lib/quiz-store";
import * as LucideIcons from "lucide-react";
import {
  ArrowLeft,
  Pencil,
  Award,
  Lock,
  Trophy,
  Target,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Building2,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  Clock,
  BookOpen,
} from "lucide-react";

// ---------- Types ----------

interface ProfileStats {
  totalSessions: number;
  avgScore: number;
  totalCorrect: number;
  totalQuestions: number;
  rank: number;
  totalUsers: number;
}

interface RecentActivity {
  id: string;
  title: string;
  sourceType: string;
  score: number;
  total: number;
  pct: number;
  completedAt: string | null;
}

interface ProfileData {
  id: string;
  name: string;
  email?: string;
  role?: string;
  bio?: string;
  establishment?: string;
  referralCode?: string;
  referredBy?: string | null;
  createdAt: string;
  avatar: { initial: string };
  stats: ProfileStats;
  // Badges are stored client-side per browser (zustand + localStorage).
  // The server returns an empty array; the component fills in the local
  // prefs badges when viewing the current user's own profile.
  badges: BadgeType[];
  recentActivity: RecentActivity[];
}

// ---------- Color styles for badges ----------

const COLOR_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-800",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-800",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-800",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-300 dark:border-violet-800",
  },
  sky: {
    bg: "bg-sky-100 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-300 dark:border-sky-800",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-300 dark:border-teal-800",
  },
};

function getColor(name?: string) {
  return (name && COLOR_STYLES[name]) || COLOR_STYLES.emerald;
}

function Icon({ name, className }: { name: string; className?: string }) {
  const IconCmp =
    (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    LucideIcons.Award;
  return <IconCmp className={className} />;
}

// ---------- Component ----------

export function ProfileView() {
  const { data: session } = useSession();
  const profileUserId = useQuizStore((s) => s.profileUserId);
  const goHome = useQuizStore((s) => s.goHome);
  const openForum = useQuizStore((s) => s.openForum);
  // Local badges from the prefs store — used to enrich the current user's
  // own profile (the server doesn't store badge unlock state).
  const localBadges = usePrefs((s) => s.badges);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editEstablishment, setEditEstablishment] = useState("");
  const [saving, setSaving] = useState(false);

  // Decide whose profile to load.
  // - If `profileUserId` is set, show that user's public profile.
  // - Otherwise, show the current user's own (private) profile.
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const targetUserId = profileUserId ?? currentUserId ?? null;
  const isOwnProfile = !profileUserId || profileUserId === currentUserId;

  const loadProfile = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = isOwnProfile
        ? "/api/profile/me"
        : `/api/profile/${targetUserId}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data: ProfileData = await res.json();
        setProfile(data);
      } else if (res.status === 401) {
        toast.error("Connexion requise");
      } else if (res.status === 404) {
        toast.error("Utilisateur introuvable");
      } else {
        toast.error("Échec du chargement du profil");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwnProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function openEdit() {
    if (!profile) return;
    setEditName(profile.name ?? "");
    setEditBio(profile.bio ?? "");
    setEditEstablishment(profile.establishment ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!profile) return;
    setSaving(true);
    try {
      // Use the /me endpoint for the current user; fall back to the
      // [userId] endpoint for admin edits of other users' profiles.
      const url = isOwnProfile
        ? "/api/profile/me"
        : `/api/profile/${profile.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          establishment: editEstablishment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Profil mis à jour");
        setEditOpen(false);
        // Reload the profile + refresh the session display name.
        loadProfile();
        // Force a session refresh so the header shows the new name.
        // next-auth won't refetch the JWT automatically — but the UI will
        // update the next time the user reloads. We accept that trade-off.
      } else {
        toast.error(data.error || "Échec de la mise à jour");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Button>
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <UserIcon className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Profil indisponible. Connectez-vous pour voir votre profil.
          </p>
        </Card>
      </div>
    );
  }

  // For the current user's own profile, use the local badges (which track
  // unlock state in localStorage). For other users, we have no badge data
  // server-side — display an informational note instead.
  const displayBadges = isOwnProfile ? localBadges : profile.badges;
  const unlockedBadges = displayBadges.filter((b) => b.unlocked);
  const lockedBadges = displayBadges.filter((b) => !b.unlocked);
  const isAdmin = profile.role === "ADMIN";
  const stats = profile.stats;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Button>

      {/* Profile header */}
      <Card className="overflow-hidden">
        <div
          className={`h-24 ${
            isAdmin
              ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
              : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600"
          }`}
        />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarFallback
                className={`h-24 w-24 text-3xl font-bold text-white ${
                  isAdmin
                    ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                }`}
              >
                {profile.avatar.initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {isAdmin && (
                  <Badge className="border-amber-300 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    ADMIN
                  </Badge>
                )}
                {!isOwnProfile && (
                  <Badge variant="outline" className="gap-1">
                    <UserIcon className="h-3 w-3" />
                    Profil public
                  </Badge>
                )}
              </div>
              {profile.establishment && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {profile.establishment}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Membre depuis le{" "}
                {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            {isOwnProfile && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={openEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier le profil
              </Button>
            )}
          </div>

          {profile.bio ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {profile.bio}
            </p>
          ) : (
            isOwnProfile && (
              <p className="mt-4 text-sm italic text-muted-foreground">
                Aucune bio. Cliquez sur « Modifier le profil » pour vous
                présenter à la communauté.
              </p>
            )
          )}
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
          label="Rang"
          value={stats.totalUsers > 0 ? `#${stats.rank}` : "—"}
          sub={
            stats.totalUsers > 0
              ? `sur ${stats.totalUsers} utilisateurs`
              : "Aucun classement"
          }
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
          label="Sessions"
          value={String(stats.totalSessions)}
          sub="terminées"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-violet-500" />}
          label="Score moyen"
          value={`${stats.avgScore}%`}
          sub="par session"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-sky-500" />}
          label="Questions"
          value={String(stats.totalQuestions)}
          sub={`${stats.totalCorrect} correctes`}
        />
      </div>

      {/* Badges grid */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Award className="h-5 w-5 text-amber-500" />
            Badges
            <Badge variant="secondary" className="text-xs">
              {unlockedBadges.length} / {displayBadges.length}
            </Badge>
          </h2>
          {isOwnProfile && (
            <Button variant="ghost" size="sm" onClick={openForum} className="gap-1.5">
              Voir le forum
            </Button>
          )}
        </div>

        {!isOwnProfile && displayBadges.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Award className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm">
              Les badges de cet utilisateur ne sont pas visibles publiquement.
            </p>
          </div>
        ) : unlockedBadges.length === 0 && lockedBadges.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Award className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm">
              Aucun badge encore. Jouez des quiz pour en débloquer !
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {/* Unlocked badges first */}
            {unlockedBadges.map((badge) => {
              const color = getColor(badge.color);
              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${color.border} ${color.bg}`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color.bg} ${color.text}`}
                  >
                    <Icon name={badge.icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${color.text}`}>
                      {badge.label}
                    </p>
                    {badge.unlockedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(badge.unlockedAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${color.text}`}
                  />
                </div>
              );
            })}
            {/* Locked badges (only show on own profile) */}
            {isOwnProfile &&
              lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 opacity-60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground/80">
                      {badge.label}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {badge.description ?? "Verrouillé"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Recent activity */}
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5 text-emerald-500" />
          Activité récente
          <Badge variant="secondary" className="text-xs">
            {profile.recentActivity.length} sessions
          </Badge>
        </h2>
        {profile.recentActivity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm">
              Aucune activité récente. Les sessions terminées apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {profile.recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    a.pct >= 80
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : a.pct >= 50
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  }`}
                >
                  {a.pct}%
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.score} / {a.total} correctes ·{" "}
                    {a.sourceType === "exam" ? "Examen" : "Quiz"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.completedAt
                    ? new Date(a.completedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-600" />
              Modifier mon profil
            </DialogTitle>
            <DialogDescription>
              Ces informations sont publiques : tout utilisateur consultant
              votre profil les verra.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nom affiché</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
              <p className="text-[11px] text-muted-foreground">
                {editName.length}/100
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-establishment">Établissement</Label>
              <Input
                id="edit-establishment"
                value={editEstablishment}
                onChange={(e) => setEditEstablishment(e.target.value)}
                placeholder="Ex: Université Joseph Ki-Zerbo"
                maxLength={200}
              />
              <p className="text-[11px] text-muted-foreground">
                {editEstablishment.length}/200
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Présentez-vous en quelques mots..."
                rows={4}
                maxLength={500}
                className="resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                {editBio.length}/500
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving || !editName.trim()}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Stat card sub-component ----------

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
