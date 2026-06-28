"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
<<<<<<< Updated upstream
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
=======
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, FileDown } from "lucide-react";

interface AnkiExportButtonProps {
  bankId: string;
  bankTitle?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

/**
 * Triggers a CSV download (Anki-compatible format) for the given bank.
 * The CSV is generated server-side by GET /api/export/anki.
 */
export function AnkiExportButton({
  bankId,
  bankTitle,
  variant = "outline",
  size = "sm",
  className,
  label = "Exporter Anki",
}: AnkiExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/export/anki?bankId=${encodeURIComponent(bankId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Échec de l'export");
      }
>>>>>>> Stashed changes
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
<<<<<<< Updated upstream
      // Pick a filename from the Content-Disposition header, or fall back
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^";]+)"?/i);
      a.download = match?.[1] ?? `anki-${Date.now()}.csv`;
=======
      const safeName = (bankTitle ?? "banque").replace(/[^a-zA-Z0-9-_]/g, "_");
      a.download = `${safeName}_anki.csv`;
>>>>>>> Stashed changes
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
<<<<<<< Updated upstream

      const count = favorites ? favList.length : 0;
      toast.success(
        favorites
          ? `${count} favori(s) exporté(s) vers Anki`
          : "Banque exportée vers Anki"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'export");
=======
      toast({
        title: "Export Anki prêt ✓",
        description: `Importez le fichier CSV dans Anki (Front;Back;Tags).`,
      });
    } catch (e) {
      toast({
        title: "Erreur d'export",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue",
        variant: "destructive",
      });
>>>>>>> Stashed changes
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
<<<<<<< Updated upstream
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
=======
      className={className}
      onClick={handleExport}
      disabled={exporting}
      title="Télécharger un fichier CSV importable dans Anki"
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">{label}</span>
      <Download className="h-3 w-3 sm:hidden" />
>>>>>>> Stashed changes
    </Button>
  );
}
