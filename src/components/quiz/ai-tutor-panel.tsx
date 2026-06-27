"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  Send,
  Sparkles,
  AlertTriangle,
  Crown,
  Loader2,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

interface WeakArea {
  bank: string;
  count: number;
}

interface StatsResponse {
  user: { name: string };
  stats: {
    totalSessions: number;
    avgScore: number;
    bestScore: number;
    totalQuestions: number;
  };
}

interface TutorResponse {
  answer: string;
  recommendations: string[];
  weakAreas: string;
  tier: "free" | "premium" | "admin";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * AITutorPanel — embedded in the dashboard as a new tab/section.
 *
 * Surface three things:
 *   1. Weak-areas analysis (derived from /api/me/stats + the user's most
 *      recent wrong answers, fetched lazily when the panel mounts).
 *   2. Personalized recommendations (returned by /api/ai-tutor).
 *   3. A chat interface to ask the AI tutor a question.
 *
 * The tutor API is gated behind Premium (returns 403 with code
 * "PREMIUM_REQUIRED" for free users). The panel surfaces a friendly
 * upgrade message in that case rather than blocking the whole panel —
 * the weak-areas + recommendations sections remain visible.
 */
export function AITutorPanel() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/me/stats");
      if (res.ok) {
        const data = (await res.json()) as StatsResponse;
        setStats(data);
        // Fetch the user's most recent wrong answers to derive weak areas
        // client-side (avoids adding a dedicated endpoint).
        const sess = await fetch("/api/sessions").then((r) => r.json());
        if (Array.isArray(sess)) {
          const wrongByBank = new Map<string, number>();
          for (const s of sess) {
            const title = s.title ?? "Banque inconnue";
            for (const a of s.answers ?? []) {
              if (a.isCorrect === false || a.userAnswer === null) {
                wrongByBank.set(title, (wrongByBank.get(title) ?? 0) + 1);
              }
            }
          }
          const list = Array.from(wrongByBank.entries())
            .map(([bank, count]) => ({ bank, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setWeakAreas(list);
        }
      }
    } catch {
      // ignore — non-blocking
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setIsPremium(Boolean(data.isPremium));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadSubscription();
  }, [loadStats, loadSubscription]);

  // Auto-scroll to bottom when a new message arrives.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function handleSend() {
    const q = input.trim();
    if (!q || sending) return;
    if (isPremium === false) {
      toast.error("Le Tuteur IA est réservé aux membres Premium.");
      return;
    }
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: q },
    ];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data: TutorResponse | { error: string; code?: string } =
        await res.json();
      if (!res.ok) {
        const err = data as { error: string; code?: string };
        if (err.code === "PREMIUM_REQUIRED") {
          setIsPremium(false);
          toast.error("Premium requis pour le Tuteur IA.");
          setMessages([
            ...newMessages,
            {
              role: "assistant",
              content:
                "🔒 Le Tuteur IA est réservé aux membres Premium. Passez à Premium pour activer cette fonctionnalité.",
            },
          ]);
        } else {
          toast.error(err.error ?? "Échec du Tuteur IA");
        }
        return;
      }
      const tutor = data as TutorResponse;
      setMessages([
        ...newMessages,
        { role: "assistant", content: tutor.answer },
      ]);
      if (tutor.recommendations?.length) {
        setRecommendations(tutor.recommendations);
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Bot className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                Tuteur IA personnalisé
                {isPremium === false && (
                  <Badge className="border-white/30 bg-white/20 text-white">
                    <Crown className="mr-1 h-3 w-3" /> Premium
                  </Badge>
                )}
                {isPremium === true && (
                  <Badge className="border-white/30 bg-white/20 text-white">
                    <Sparkles className="mr-1 h-3 w-3" /> Actif
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-white/80">
                Analyse vos zones de faiblesse et répond à vos questions de
                cours.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weak areas */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold">Zones de faiblesse</h3>
          </div>
          {!stats ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : weakAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune zone de faiblesse détectée — continuez sur cette lancée ! 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {weakAreas.map((w) => {
                const max = weakAreas[0]?.count ?? 1;
                const pct = Math.max(8, Math.round((w.count / max) * 100));
                return (
                  <div key={w.bank} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{w.bank}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {w.count} erreur(s)
                      </Badge>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recommendations */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">
              Recommandations personnalisées
            </h3>
          </div>
          {recommendations.length === 0 ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Posez votre première question au Tuteur IA pour recevoir des
                recommandations sur-mesure.
              </p>
              {stats && stats.stats.totalSessions === 0 && (
                <p className="text-xs">
                  Faites d&apos;abord un quiz pour que le tuteur ait un
                  historique à analyser.
                </p>
              )}
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Chat interface */}
      <Card className="flex flex-col">
        <div className="border-b p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-violet-600" />
            Discuter avec le Tuteur IA
          </h3>
        </div>
        <div
          ref={scrollRef}
          className="max-h-72 space-y-3 overflow-y-auto p-4"
        >
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Bot className="h-10 w-10 text-violet-400" />
                <p>
                  Posez une question de cours, demandez une explication, ou
                  sollicitez un plan de révision personnalisé.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {[
                    "Explique-moi l'AES",
                    "Comment réviser efficacement ?",
                    "Quelles matières prioriser ?",
                  ].map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setInput(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Le tuteur réfléchit…
              </div>
            )}
        </div>
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question de cours…"
              rows={2}
              className="min-h-[40px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="gap-2 self-end bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
            >
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
