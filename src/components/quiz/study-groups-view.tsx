"use client";

import { useEffect, useState, useCallback } from "react";
<<<<<<< Updated upstream
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
=======
import { useSession } from "next-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
>>>>>>> Stashed changes
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
<<<<<<< Updated upstream
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Users,
  Plus,
  ArrowLeft,
  UserPlus,
  LogOut,
  Trash2,
  Hash,
  Crown,
  Calendar,
  Loader2,
} from "lucide-react";

// ---------- Types ----------

interface GroupCreator {
=======
  Users2,
  Plus,
  ArrowLeft,
  LogIn,
  Trash2,
  Copy,
  Hash,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface GroupOwner {
>>>>>>> Stashed changes
  id: string;
  name: string;
}

<<<<<<< Updated upstream
interface StudyGroupListItem {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  creatorId: string;
  creator: GroupCreator;
  membersCount: number;
  isMember?: boolean;
  createdAt: string;
}

interface GroupMember {
  id: string;
  userId: string;
  name: string;
  joinedAt: string;
}

interface StudyGroupDetail extends StudyGroupListItem {
  isMember: boolean;
  isCreator: boolean;
  members: GroupMember[];
}

// ---------- Component ----------

export function StudyGroupsView() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [groups, setGroups] = useState<StudyGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudyGroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
=======
interface GroupMember {
  id: string;
  joinedAt: string;
  user: { id: string; name: string };
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  code: string;
  ownerId: string;
  createdAt: string;
  owner: GroupOwner;
  members?: GroupMember[];
  _count?: { members: number };
}

export function StudyGroupsView() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id;
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StudyGroup | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", subject: "" });
>>>>>>> Stashed changes

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
<<<<<<< Updated upstream
      const res = await fetch("/api/groups", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data.items) ? data.items : []);
=======
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
>>>>>>> Stashed changes
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

<<<<<<< Updated upstream
  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/groups/${id}`, { cache: "no-store" });
      if (res.ok) {
        setDetail(await res.json());
      } else {
        toast.error("Groupe introuvable");
        setSelectedId(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement du groupe");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleLeave = async () => {
    if (!detail) return;
=======
  const loadGroup = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la création");
        return;
      }
      toast.success("Groupe créé !");
      setCreateOpen(false);
      setForm({ name: "", description: "", subject: "" });
      await loadGroups();
      await loadGroup(data.id);
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) {
      toast.error("Entrez un code d'invitation");
      return;
    }
    setJoining(true);
>>>>>>> Stashed changes
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
<<<<<<< Updated upstream
        body: JSON.stringify({ inviteCode: detail.inviteCode, leave: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Impossible de quitter le groupe");
        return;
      }
      toast.success("Vous avez quitté le groupe");
      setSelectedId(null);
      setDetail(null);
      loadGroups();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/groups/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Suppression impossible");
        return;
      }
      toast.success("Groupe supprimé");
      if (selectedId === deleteId) {
        setSelectedId(null);
        setDetail(null);
      }
      setDeleteId(null);
      loadGroups();
=======
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la rejoindre");
        return;
      }
      if (data.alreadyMember) {
        toast.info("Vous êtes déjà membre de ce groupe");
      } else {
        toast.success("Vous avez rejoint le groupe");
      }
      setJoinCode("");
      await loadGroups();
      await loadGroup(data.group.id);
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setJoining(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce groupe ? Les membres seront retirés.")) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Erreur");
        return;
      }
      toast.success("Groupe supprimé");
      setSelected(null);
      await loadGroups();
>>>>>>> Stashed changes
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
<<<<<<< Updated upstream
  };

  // ---------- Detail view ----------
  if (selectedId) {
=======
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(
      () => toast.success("Code copié"),
      () => toast.error("Copie impossible")
    );
  }

  // === Detail view ===
  if (selected) {
    const members = selected.members ?? [];
>>>>>>> Stashed changes
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
<<<<<<< Updated upstream
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
          }}
=======
          onClick={() => setSelected(null)}
>>>>>>> Stashed changes
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>

<<<<<<< Updated upstream
        {loadingDetail || !detail ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold">{detail.name}</h1>
                    {detail.isCreator && (
                      <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Crown className="h-3 w-3" />
                        Créateur
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {detail.description || "Aucune description"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {detail.membersCount} membre(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Créé le{" "}
                      {new Date(detail.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="flex items-center gap-1">
                      par {detail.creator.name}
                    </span>
                  </div>
                </div>

                {/* Invite code box (visible to members/creator) */}
                {(detail.isMember || detail.isCreator) && (
                  <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Code d&apos;invitation
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
                      {detail.inviteCode}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 gap-1 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard?.writeText(detail.inviteCode);
                        toast.success("Code copié");
                      }}
                    >
                      <Hash className="h-3 w-3" />
                      Copier
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {detail.isCreator ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setDeleteId(detail.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer le groupe
                  </Button>
                ) : detail.isMember ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleLeave}
                  >
                    <LogOut className="h-4 w-4" />
                    Quitter le groupe
                  </Button>
                ) : (
                  <JoinByCodeButton
                    prefillCode={detail.inviteCode}
                    onJoined={() => {
                      toast.success("Vous avez rejoint le groupe");
                      openDetail(detail.id);
                      loadGroups();
                    }}
                  />
                )}
              </div>
            </Card>

            {/* Members list */}
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold">
                Membres ({detail.members.length})
              </p>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {detail.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border p-2.5"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {m.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Membre depuis le{" "}
                        {new Date(m.joinedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {m.userId === detail.creatorId && (
                      <Badge variant="outline" className="gap-1 text-amber-600">
                        <Crown className="h-3 w-3" />
                        Créateur
                      </Badge>
                    )}
                    {m.userId === currentUserId && (
                      <Badge variant="secondary">Vous</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce groupe ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Tous les membres seront retirés
                et le code d&apos;invitation ne sera plus valide.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
=======
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{selected.name}</h1>
                {selected.subject && (
                  <Badge className="mt-2 border-white/30 bg-white/20 text-white">
                    {selected.subject}
                  </Badge>
                )}
                {selected.description && (
                  <p className="mt-3 text-sm text-white/90">{selected.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur">
                <Hash className="h-4 w-4" />
                <span className="font-mono text-lg font-bold tracking-wider">
                  {selected.code}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => copyCode(selected.code)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-white/80">
              <span className="flex items-center gap-1">
                <UserCircle2 className="h-3.5 w-3.5" />
                Créé par {selected.owner.name}
              </span>
              <span className="flex items-center gap-1">
                <Users2 className="h-3.5 w-3.5" />
                {selected._count?.members ?? members.length} membre(s)
              </span>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Users2 className="h-5 w-5 text-violet-600" />
            Membres ({members.length})
          </h2>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {members.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Aucun membre pour l&apos;instant.
              </Card>
            ) : (
              members.map((m, i) => (
                <Card key={m.id} className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    {m.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Rejoint le{" "}
                      {new Date(m.joinedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {m.user.id === selected.ownerId && (
                    <Badge variant="secondary" className="text-[10px]">
                      Propriétaire
                    </Badge>
                  )}
                  {i === 0 && m.user.id !== selected.ownerId && (
                    <Badge variant="outline" className="text-[10px]">
                      Premier membre
                    </Badge>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {selected.ownerId === currentUserId && (
          <Card className="border-rose-200 bg-rose-50/50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Zone dangereuse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supprimer définitivement ce groupe et tous ses membres.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => handleDelete(selected.id)}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </Card>
        )}
>>>>>>> Stashed changes
      </div>
    );
  }

<<<<<<< Updated upstream
  // ---------- List view ----------
=======
  // === List view ===
>>>>>>> Stashed changes
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
<<<<<<< Updated upstream
            <Users className="h-6 w-6 text-emerald-600" />
            Groupes d&apos;étude
          </h1>
          <p className="text-muted-foreground">
            Étudiez ensemble pour les concours et examens blancs
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setJoinOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Rejoindre par code
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
=======
            <Users2 className="h-6 w-6 text-violet-600" />
            Groupes d&apos;étude
          </h1>
          <p className="text-muted-foreground">
            Révisez à plusieurs, partagez vos banques et progressez ensemble.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
        >
          <Plus className="h-4 w-4" />
          Créer un groupe
        </Button>
      </div>

      {/* Join by code */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="join-code" className="text-sm font-medium">
              Rejoindre par code d&apos;invitation
            </Label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ex: AB3K9Z"
              className="font-mono uppercase"
              maxLength={10}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
          </div>
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="gap-1.5"
          >
            <LogIn className="h-4 w-4" />
            {joining ? "..." : "Rejoindre"}
          </Button>
        </div>
      </Card>

      {/* Groups grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
>>>>>>> Stashed changes
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
<<<<<<< Updated upstream
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucun groupe pour le moment. Soyez le premier à en créer un !
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Card
              key={g.id}
              className="cursor-pointer p-4 transition-all hover:border-emerald-300 hover:shadow-md"
              onClick={() => openDetail(g.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {g.description || "Aucune description"}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {g.membersCount}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <span className="truncate text-xs text-muted-foreground">
                  par {g.creator.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(g.createdAt).toLocaleDateString("fr-FR")}
=======
          <Users2 className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucun groupe pour l&apos;instant. Créez le premier !
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card
              key={g.id}
              className="group cursor-pointer p-4 transition-all hover:border-violet-300 hover:shadow-md"
              onClick={() => loadGroup(g.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{g.name}</h3>
                  {g.subject && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {g.subject}
                    </Badge>
                  )}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40">
                  <Users2 className="h-4 w-4" />
                </div>
              </div>
              {g.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {g.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                <span>{g._count?.members ?? 0} membre(s)</span>
                <span className="flex items-center gap-1">
                  par {g.owner.name}
>>>>>>> Stashed changes
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

<<<<<<< Updated upstream
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(g) => {
          setCreateOpen(false);
          toast.success(`Groupe créé — code: ${g.inviteCode}`);
          loadGroups();
          openDetail(g.id);
        }}
      />
      <JoinByCodeDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={(g) => {
          setJoinOpen(false);
          toast.success("Vous avez rejoint le groupe");
          loadGroups();
          if (g?.groupId) openDetail(g.groupId);
        }}
      />
    </div>
  );
}

// ---------- Sub-components ----------

function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (g: StudyGroupListItem) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Création échouée");
        return;
      }
      onCreated(data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un groupe d&apos;étude</DialogTitle>
          <DialogDescription>
            Un code d&apos;invitation unique sera généré pour partager avec vos
            camarades.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="grp-name">Nom du groupe *</Label>
            <Input
              id="grp-name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prépa Concours Fonction Publique"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grp-desc">Description (optionnel)</Label>
            <Textarea
              id="grp-desc"
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quel est l'objectif du groupe ?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !name.trim()}
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JoinByCodeDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onJoined: (g: { groupId: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setCode("");
  }, [open]);

  async function submit() {
    if (!/^[A-Za-z0-9]{6}$/.test(code.trim())) {
      toast.error("Code invalide — 6 caractères alphanumériques");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Impossible de rejoindre");
        return;
      }
      onJoined({ groupId: data.groupId });
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejoindre un groupe</DialogTitle>
          <DialogDescription>
            Saisissez le code d&apos;invitation à 6 caractères partagé par le
            créateur du groupe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="grp-code">Code d&apos;invitation</Label>
          <Input
            id="grp-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABCDEF"
            className="text-center font-mono text-lg tracking-[0.4em]"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || code.length !== 6}
            className="gap-1.5"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Rejoindre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Inline "join by code" button (used in the detail view for non-members). */
function JoinByCodeButton({
  prefillCode,
  onJoined,
}: {
  prefillCode: string;
  onJoined: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function join() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: prefillCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Impossible de rejoindre");
        return;
      }
      onJoined();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      size="sm"
      className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
      onClick={join}
      disabled={submitting}
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      Rejoindre ce groupe
    </Button>
  );
}
=======
      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un groupe d&apos;étude</DialogTitle>
            <DialogDescription>
              Un code d&apos;invitation à 6 caractères sera généré pour
              permettre à d&apos;autres étudiants de rejoindre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Nom du groupe *</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ex: Prépa Concours Fonction Publique 2025"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-subject">Matière / Sujet</Label>
              <Input
                id="g-subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="ex: Culture Générale, Droit..."
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Description</Label>
              <Textarea
                id="g-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Objectifs, horaires de révision, etc."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Création..." : "Créer le groupe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
>>>>>>> Stashed changes
