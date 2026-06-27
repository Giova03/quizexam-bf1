"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2, Layers } from "lucide-react";
import { useFavorites } from "@/lib/favorites-store";

interface AnkiExportButtonProps {
  /** When provided, exports all questions from this bank (GET ?bankId=xxx). */
  bankId?: string;
  /** When true, exports the user's localStorage favorites (POST favorites). */
  favorites?: boolean;
  /** Optional label override. */
  label?: string;
  /** Visual variant of the button. */
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Triggers a CSV download in Anki-compatible format from either:
 *  - a question bank (`bankId` prop → GET /api/export/anki?bankId=xxx)
 *  - the user's localStorage favorites (`favorites` prop → POST /api/export/anki)
 *
 * On success, the file downloads automatically and a success toast is shown.
 */
export function AnkiExportButton({
  bankId,
  favorites = false,
  label,
  variant = "outline",
  size = "sm",
}: AnkiExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const favList = useFavorites((s) => s.favorites);

  const displayLabel =
    label ??
    (favorites ? "Exporter vers Anki" : "Exporter vers Anki");

  async function handleExport() {
    if (favorites && favList.length === 0) {
      toast.error("Aucun favori à exporter.");
      return;
    }
    if (!favorites && !bankId) {
      toast.error("Banque introuvable.");
      return;
    }

    setExporting(true);
    try {
      let res: Response;
      if (favorites) {
        // Send the localStorage favorites to the server so it can enrich
        // them with full question info (option text, difficulty, category)
        // looked up from the DB.
        res = await fetch("/api/export/anki", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            favorites: favList.map((f) => ({
              id: f.id,
              question: f.question,
              correctAnswer: f.correctAnswer,
              explanation: f.explanation,
              bankTitle: f.bankTitle,
              bankId: f.bankId,
            })),
          }),
        });
      } else {
        res = await fetch(`/api/export/anki?bankId=${encodeURIComponent(bankId!)}`);
      }

      if (!res.ok) {
        let msg = "Échec de l'export Anki.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(msg);
      }

      // Trigger the browser download from the CSV blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Pick a filename from the Content-Disposition header, or fall back
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^";]+)"?/i);
      a.download = match?.[1] ?? `anki-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const count = favorites ? favList.length : 0;
      toast.success(
        favorites
          ? `${count} favori(s) exporté(s) vers Anki`
          : "Banque exportée vers Anki"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className="gap-1.5"
      disabled={exporting || (favorites && favList.length === 0)}
      onClick={handleExport}
      title="Exporter en CSV compatible Anki"
    >
      {exporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Layers className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{displayLabel}</span>
      <span className="sm:hidden">
        {exporting ? "…" : <Download className="h-3.5 w-3.5" />}
      </span>
    </Button>
  );
}
