"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Users,
  LogIn,
  Loader2,
  Search,
} from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";

// ---------- Types ----------

interface MessageRow {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: string;
  createdAt: string;
}

interface ConversationSummary {
  peerId: string;
  peerName: string;
  lastMessage: MessageRow;
  unread: number;
}

interface SearchUser {
  id: string;
  name: string;
  role?: string;
}

// ---------- Helpers ----------

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  return name
    ?.split(" ")
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") ?? "?";
}

// ---------- Component ----------

export function MessagesView() {
  const { data: session, status } = useSession();
  const meId = (session?.user as { id?: string } | undefined)?.id;
  const openProfile = useQuizStore((s) => s.openProfile);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [selectedPeerName, setSelectedPeerName] = useState<string>("");
  const [thread, setThread] = useState<MessageRow[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // New conversation dialog state.
  const [newOpen, setNewOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // --- Load conversations ----------------------------------------------
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data.items) ? data.items : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadConversations();
  }, [status, loadConversations]);

  // --- Load thread when a peer is selected ----------------------------
  const loadThread = useCallback(
    async (peerId: string) => {
      setLoadingThread(true);
      try {
        const res = await fetch(`/api/messages?with=${peerId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setThread(Array.isArray(data.items) ? data.items : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingThread(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedPeer) loadThread(selectedPeer);
  }, [selectedPeer, loadThread]);

  // Auto-scroll to the bottom of the thread on new messages.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // Poll for new messages every 15s when a peer is selected, and refresh
  // the conversation list every 30s.
  useEffect(() => {
    if (status !== "authenticated") return;
    const t1 = setInterval(loadConversations, 30_000);
    const t2 = selectedPeer
      ? setInterval(() => loadThread(selectedPeer), 15_000)
      : null;
    return () => {
      clearInterval(t1);
      if (t2) clearInterval(t2);
    };
  }, [status, selectedPeer, loadConversations, loadThread]);

  // --- Search users (for new conversation) ----------------------------
  useEffect(() => {
    if (!newOpen) return;
    if (userSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users?search=${encodeURIComponent(userSearch.trim())}`,
          { signal: ctrl.signal, cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const arr: SearchUser[] = Array.isArray(data)
            ? data
            : Array.isArray(data.items)
              ? data.items
              : [];
          // Exclude self from results.
          setSearchResults(arr.filter((u) => u.id !== meId));
        }
      } catch {
        // ignore abort errors
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [userSearch, newOpen, meId]);

  // --- Send a message -------------------------------------------------
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedPeer || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: selectedPeer, content: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Échec de l'envoi");
        return;
      }
      setThread((prev) => [...prev, data]);
      setDraft("");
      // Refresh the conversation list so the new last-message shows up.
      loadConversations();
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setSending(false);
    }
  }

  // --- Start a new conversation from the user search ------------------
  function startConversationWith(userId: string, name: string) {
    setNewOpen(false);
    setUserSearch("");
    setSearchResults([]);
    setSelectedPeer(userId);
    setSelectedPeerName(name);
    setThread([]);
    toast.success(`Conversation avec ${name}`);
  }

  // --- Auth gate ------------------------------------------------------
  if (status !== "authenticated") {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <LogIn className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Connexion requise</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Connectez-vous pour envoyer et recevoir des messages privés avec
          les autres membres de la communauté.
        </p>
      </Card>
    );
  }

  // --- Thread view (right pane) ---------------------------------------
  if (selectedPeer) {
    const peer = conversations.find((c) => c.peerId === selectedPeer);
    const peerName = peer?.peerName ?? selectedPeerName ?? "Utilisateur";
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setSelectedPeer(null);
              setSelectedPeerName("");
              setThread([]);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux conversations
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => openProfile(selectedPeer)}
          >
            <Users className="h-4 w-4" />
            Voir le profil
          </Button>
        </div>

        <Card className="flex h-[60vh] min-h-[400px] flex-col overflow-hidden p-0">
          {/* Thread header */}
          <div className="flex items-center gap-3 border-b bg-muted/30 p-4">
            <Avatar>
              <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                {initials(peerName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{peerName}</p>
              <p className="text-xs text-muted-foreground">
                Conversation privée
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loadingThread ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="ml-auto h-12 w-2/3" />
              </div>
            ) : thread.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucun message. Écrivez le premier ci-dessous.
              </div>
            ) : (
              thread.map((m) => {
                const mine = m.authorId === meId;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "bg-violet-500 text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                      <p
                        className={`mt-1 text-[10px] ${
                          mine ? "text-violet-100" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={send}
            className="flex items-end gap-2 border-t bg-background p-3"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrivez votre message…"
              rows={2}
              maxLength={4000}
              className="min-h-[44px] flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !draft.trim()}
              className="h-11 w-11 shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              aria-label="Envoyer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // --- Conversation list (left pane / default view) -------------------
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-6 w-6 text-violet-600" />
            Messagerie privée
          </h1>
          <p className="text-sm text-muted-foreground">
            Vos conversations 1-à-1 avec les autres membres.
          </p>
        </div>
        <Button
          onClick={() => setNewOpen(true)}
          className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
        >
          <MessageSquare className="h-4 w-4" />
          Nouvelle conversation
        </Button>
      </div>

      <Card className="p-0">
        <div className="border-b bg-muted/30 p-4">
          <p className="text-sm font-medium">Conversations</p>
        </div>
        <div className="divide-y">
          {loadingConvos ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Aucune conversation</p>
              <p className="text-sm text-muted-foreground">
                Démarrez une nouvelle conversation avec un membre de la
                communauté.
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.peerId}
                onClick={() => {
                  setSelectedPeer(c.peerId);
                  setSelectedPeerName(c.peerName);
                }}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
              >
                <Avatar>
                  <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    {initials(c.peerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{c.peerName}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatRelative(c.lastMessage.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.lastMessage.authorId === meId ? "Vous : " : ""}
                    {c.lastMessage.content}
                  </p>
                </div>
                {c.unread > 0 && (
                  <Badge className="shrink-0 bg-violet-500 text-white">
                    {c.unread > 9 ? "9+" : c.unread}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </Card>

      {/* New conversation dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
            <DialogDescription>
              Recherchez un membre par son nom pour démarrer une conversation
              privée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Nom de l'utilisateur…"
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche…
                </div>
              ) : searchResults.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {userSearch.trim().length < 2
                    ? "Saisissez au moins 2 caractères."
                    : "Aucun utilisateur trouvé."}
                </p>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversationWith(u.id, u.name)}
                    className="flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-muted/40"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      {u.role === "ADMIN" && (
                        <p className="truncate text-xs text-muted-foreground">
                          Administrateur
                        </p>
                      )}
                    </div>
                    {u.role === "ADMIN" && (
                      <Badge variant="secondary" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
