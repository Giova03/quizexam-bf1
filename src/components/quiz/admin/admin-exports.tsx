"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
<<<<<<< Updated upstream
=======
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
>>>>>>> Stashed changes
import {
  Users,
  Activity,
  Database,
  Download,
<<<<<<< Updated upstream
=======
  Mail,
  AlertTriangle,
  Send,
>>>>>>> Stashed changes
} from "lucide-react";
import { toast } from "sonner";

/**
<<<<<<< Updated upstream
 * ExportsPanel — "Export" tab. Three CSV export cards (users, sessions,
 * banks) that trigger a download via the /api/admin/export endpoint.
 *
 * Note: the `bg-${color}-50` / `text-${color}-600` classes are intentionally
 * dynamic — Tailwind's JIT picks them up because the full set of color
 * names is referenced in other files (e.g. admin-banks.tsx color list).
 * If tree-shaking ever drops them, switch to a static colorMap.
=======
 * ExportsPanel — onglet "Export" du panneau admin.
 * Permet de télécharger les données (utilisateurs, sessions, banques) au format CSV.
>>>>>>> Stashed changes
 */
export function ExportsPanel() {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(type: "users" | "sessions" | "banks") {
    setExporting(type);
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Export ${type} téléchargé`);
      } else {
        toast.error("Erreur lors de l'export");
      }
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setExporting(null);
    }
  }

  const exports = [
    {
      type: "users" as const,
      title: "Utilisateurs",
      desc: "Liste complète des utilisateurs inscrits (nom, email, rôle, sessions)",
      icon: Users,
      color: "emerald",
    },
    {
      type: "sessions" as const,
      title: "Sessions",
      desc: "Toutes les sessions de quiz (utilisateur, score, mode, date)",
      icon: Activity,
      color: "rose",
    },
    {
      type: "banks" as const,
      title: "Banques",
      desc: "Liste des banques de questions avec le nombre de questions",
      icon: Database,
      color: "violet",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Download className="h-4 w-4 text-emerald-600" />
          Export de données (CSV)
        </h2>
        <p className="text-sm text-muted-foreground">
          Téléchargez les données de la plateforme au format CSV pour analyse externe
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {exports.map((e) => (
          <Card key={e.type} className="flex flex-col gap-3 p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${e.color}-50 text-${e.color}-600 dark:bg-${e.color}-950/40`}>
              <e.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{e.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{e.desc}</p>
            </div>
            <Button
              className="mt-auto gap-2"
              variant="outline"
              disabled={exporting === e.type}
              onClick={() => handleExport(e.type)}
            >
              {exporting === e.type ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Télécharger CSV
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
<<<<<<< Updated upstream
=======

/**
 * BroadcastPanel — onglet "Broadcast" du panneau admin.
 * Envoie un message email à tous les utilisateurs inscrits (via /api/admin/broadcast).
 */
export function BroadcastPanel() {
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
>>>>>>> Stashed changes
