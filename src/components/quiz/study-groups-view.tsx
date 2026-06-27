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
import {
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
  id: string;
  name: string;
}

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

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data.items) ? data.items : []);
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
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  // ---------- Detail view ----------
  if (selectedId) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>

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
      </div>
    );
  }

  // ---------- List view ----------
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
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
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
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
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

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
