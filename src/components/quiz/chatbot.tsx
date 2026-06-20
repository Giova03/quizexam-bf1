"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Quelles banques pour préparer le concours de l'ENAM ?",
  "Explique-moi la différence entre les modes de correction",
  "Donne-moi un conseil pour réviser efficacement",
  "Qui est le président de l'ALT au Burkina Faso ?",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour ! 👋 Je suis QuizExam Assistant, votre coach IA pour la préparation aux concours. Posez-moi vos questions sur les cours, les banques de quiz, ou demandez des conseils de révision !",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
            context: "general",
          }),
        });
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.response || data.error || "Réponse indisponible.",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              "Désolé, une erreur est survenue. Vérifiez votre connexion et réessayez. 🙏",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Ouvrir le chatbot"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          {/* Header */}
          <SheetHeader className="shrink-0 border-b bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Avatar className="h-9 w-9 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-base font-semibold">
                  QuizExam Assistant
                  <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                    <Sparkles className="h-2.5 w-2.5" />
                    IA
                  </span>
                </span>
                <p className="text-[11px] text-white/80">
                  Coach IA pour vos concours
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Messages - flex-1 with overflow hidden, inner div scrolls */}
          <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto overflow-x-hidden"
            >
              <div className="space-y-3 p-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-card px-3 py-2.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-xs">QuizExam réfléchit…</span>
                    </div>
                  </div>
                )}

                {/* Suggestions (only when few messages) */}
                {messages.length <= 1 && !loading && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      💡 Suggestions de questions :
                    </p>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="block w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-left text-xs text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input - shrink-0 to stay at bottom */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 flex items-center gap-2 border-t bg-background p-3"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question…"
              disabled={loading}
              className="flex-1"
              aria-label="Saisir un message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:opacity-90"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={
            isUser
              ? "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
          }
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      {/* Message bubble - max-width to prevent overflow, break-words for long text */}
      <div
        className={`max-w-[75%] break-words rounded-2xl px-3.5 py-2.5 text-sm ${
          isUser
            ? "rounded-br-sm bg-violet-500 text-white"
            : "rounded-bl-sm bg-card text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}
