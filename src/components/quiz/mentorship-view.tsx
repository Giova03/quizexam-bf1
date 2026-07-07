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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  GraduationCap,
  Users,
  LogIn,
  Loader2,
  UserCheck,
  UserPlus,
  Clock,
  Check,
  X,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";

// ---------- Types ----------

interface Mentor {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  establishment: string | null;
  xp: number;
  sessionCount: number;
  avgPct: number;
  isMentor: boolean;
}

interface MentorshipRequest {
  id: string;
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  status: "pending" | "accepted" | "declined";
  message: string;
  createdAt: string;
}

interface MentorshipData {
  mentors: Mentor[];
  myRequests: MentorshipRequest[];
  incomingRequests: MentorshipRequest[];
  myMentor: MentorshipRequest | null;
  myMentees: MentorshipRequest[];
}

// ---------- Helpers ----------

function initials(name: string): string {
  return (
    name
      ?.split(" ")
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") ?? "?"
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: {
    label: "En attente",
    color:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  accepted: {
    label: "Acceptée",
    color:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  declined: {
    label: "Refusée",
    color:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

// ---------- Component ----------

export function MentorshipView() {
  const { data: session, status } = useSession();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  const openProfile = useQuizStore((s) => s.openProfile);

  const [data, setData] = useState<MentorshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMentor, setRequestMentor] = useState<Mentor | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mentorship", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  async function sendRequest() {
    if (!requestMentor) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/mentorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: requestMentor.id,
          message: requestMessage.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Échec de la demande");
        return;
      }
      toast.success(`Demande envoyée à ${requestMentor.name}`);
      setRequestOpen(false);
      setRequestMentor(null);
      setRequestMessage("");
      load();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  async function respondToRequest(
    requestId: string,
    action: "accept" | "decline"
  ) {
    setActioningId(requestId);
    try {
      const res = await fetch("/api/mentorship", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Échec de l'action");
        return;
      }
      toast.success(
        action === "accept"
          ? "Demande acceptée — vous êtes désormais mentor !"
          : "Demande refusée"
      );
      load();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setActioningId(null);
    }
  }

  // --- Auth gate ------------------------------------------------------
  if (status !== "authenticated") {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <LogIn className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Connexion requise</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Connectez-vous pour trouver un mentor ou accompagner d'autres
          membres de la communauté.
        </p>
      </Card>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <GraduationCap className="h-6 w-6 text-emerald-600" />
          Mentorat
        </h1>
        <p className="text-sm text-muted-foreground">
          Trouvez un mentor pour vous accompagner ou partagez votre savoir
          avec d'autres membres.
        </p>
      </div>

      {/* Summary cards: my mentor + my mentees */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            Mon mentor
          </div>
          {data.myMentor ? (
            <div className="mt-3 flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {initials(data.myMentor.mentorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <button
                  className="block truncate text-left font-medium hover:underline"
                  onClick={() => openProfile(data.myMentor!.mentorId)}
                >
                  {data.myMentor.mentorName}
                </button>
                <Badge
                  variant="outline"
                  className={STATUS_LABELS.accepted.color}
                >
                  {STATUS_LABELS.accepted.label}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Vous n&apos;avez pas encore de mentor. Parcourez la liste
              ci-dessous pour en trouver un.
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            Mes mentorés ({data.myMentees.length})
          </div>
          {data.myMentees.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Vous n&apos;accompagnez encore personne. Les demandes reçues
              apparaissent dans l&apos;onglet &quot;Demandes reçues&quot;.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.myMentees.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openProfile(r.menteeId)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted/40"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {initials(r.menteeName)}
                    </AvatarFallback>
                  </Avatar>
                  {r.menteeName}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tabs: mentors / my requests / incoming requests */}
      <Tabs defaultValue="mentors">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mentors" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Mentors
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Mes demandes
            {data.myRequests.length > 0 && (
              <Badge className="ml-1 bg-violet-500 text-white">
                {data.myRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incoming" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Reçues
            {data.incomingRequests.filter((r) => r.status === "pending").length >
              0 && (
              <Badge className="ml-1 bg-amber-500 text-white">
                {data.incomingRequests.filter((r) => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Mentors tab */}
        <TabsContent value="mentors" className="space-y-3">
          {data.mentors.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Aucun mentor disponible pour le moment.
            </Card>
          ) : (
            data.mentors.map((m) => {
              const alreadyRequested = data.myRequests.some(
                (r) =>
                  r.mentorId === m.id &&
                  (r.status === "pending" || r.status === "accepted")
              );
              const isMyMentor = data.myMentor?.mentorId === m.id;
              return (
                <Card key={m.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="font-medium hover:underline"
                          onClick={() => openProfile(m.id)}
                        >
                          {m.name}
                        </button>
                        {m.role === "ADMIN" && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          >
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {m.isMentor && m.role !== "ADMIN" && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                          >
                            <Trophy className="h-3 w-3" />
                            Expert
                          </Badge>
                        )}
                      </div>
                      {m.bio && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {m.bio}
                        </p>
                      )}
                      {m.establishment && (
                        <p className="text-xs text-muted-foreground">
                          📍 {m.establishment}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-violet-500" />
                          {m.xp.toLocaleString("fr-FR")} XP
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-amber-500" />
                          {m.sessionCount} quiz
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            {m.avgPct}%
                          </span>{" "}
                          moyenne
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {isMyMentor ? (
                        <Badge
                          variant="outline"
                          className={STATUS_LABELS.accepted.color}
                        >
                          Votre mentor
                        </Badge>
                      ) : alreadyRequested ? (
                        <Badge
                          variant="outline"
                          className={STATUS_LABELS.pending.color}
                        >
                          Demande envoyée
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                          onClick={() => {
                            setRequestMentor(m);
                            setRequestMessage("");
                            setRequestOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                          Demander
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* My requests tab */}
        <TabsContent value="mine" className="space-y-3">
          {data.myRequests.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Vous n&apos;avez envoyé aucune demande de mentorat.
            </Card>
          ) : (
            data.myRequests.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {initials(r.mentorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <button
                      className="font-medium hover:underline"
                      onClick={() => openProfile(r.mentorId)}
                    >
                      {r.mentorName}
                    </button>
                    {r.message && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        &ldquo;{r.message}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(r.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={STATUS_LABELS[r.status].color}
                  >
                    {STATUS_LABELS[r.status].label}
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Incoming requests tab */}
        <TabsContent value="incoming" className="space-y-3">
          {data.incomingRequests.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Aucune demande reçue pour le moment.
            </Card>
          ) : (
            data.incomingRequests.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                      {initials(r.menteeName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <button
                      className="font-medium hover:underline"
                      onClick={() => openProfile(r.menteeId)}
                    >
                      {r.menteeName}
                    </button>
                    {r.message && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        &ldquo;{r.message}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(r.createdAt)}
                    </p>
                  </div>
                  {r.status === "pending" ? (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        className="gap-1 bg-emerald-500 text-white hover:bg-emerald-600"
                        disabled={actioningId === r.id}
                        onClick={() => respondToRequest(r.id, "accept")}
                      >
                        {actioningId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-rose-600"
                        disabled={actioningId === r.id}
                        onClick={() => respondToRequest(r.id, "decline")}
                      >
                        <X className="h-4 w-4" />
                        Refuser
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className={STATUS_LABELS[r.status].color}
                    >
                      {STATUS_LABELS[r.status].label}
                    </Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Request dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Demander {requestMentor?.name} en mentor
            </DialogTitle>
            <DialogDescription>
              Ajoutez un message (optionnel) pour présenter votre demande.
              Le mentor pourra l&apos;accepter ou le refuser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="mentor-msg">Message (optionnel)</Label>
              <Textarea
                id="mentor-msg"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Bonjour, je prépare le concours…"
                rows={4}
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground">
                {requestMessage.length}/1000 caractères
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={sendRequest}
              disabled={submitting}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
