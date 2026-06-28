"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, AlertTriangle, Activity, Send } from "lucide-react";
import { toast } from "sonner";

/**
 * BroadcastPanel — "Broadcast" tab. Form to send an email to all registered
 * users via /api/admin/broadcast.
 *
 * The `open`/`onOpenChange` props are accepted for API compatibility with
 * the original component signature; this panel is always rendered inline
 * (not in a dialog) when the broadcast tab is active.
 */
export function BroadcastPanel({
  open: _open,
  onOpenChange: _onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Sujet et message requis");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message ?? "Message envoyé");
        setSubject("");
        setBody("");
      } else {
        toast.error("Erreur lors de l'envoi");
      }
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Mail className="h-4 w-4 text-amber-600" />
          Message broadcast
        </h2>
        <p className="text-sm text-muted-foreground">
          Envoyez un message email à tous les utilisateurs inscrits
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="broadcast-subject">Sujet *</Label>
          <Input
            id="broadcast-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Nouveaux examens disponibles !"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-body">Message *</Label>
          <Textarea
            id="broadcast-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contenu du message..."
            rows={6}
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="flex-1">
            Le message sera programmé pour tous les visiteurs inscrits.
            L&apos;envoi réel dépend de la configuration du service email.
          </p>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
        >
          {sending ? (
            <>
              <Activity className="h-4 w-4 animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Envoyer le broadcast
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
