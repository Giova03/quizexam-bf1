"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Printer, Share2, Award, Crown } from "lucide-react";
import { toast } from "sonner";

interface CertificateData {
  certificateId: string;
  userName: string;
  quizTitle: string;
  score: number;
  total: number;
  percentage: number;
  date: string;
  sessionId: string;
  issuer: string;
}

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string | null;
}

/**
 * CertificateDialog — fetches the certificate payload for a given session
 * and renders a diploma-style preview. The "Imprimer" button calls
 * window.print() (with a print-only stylesheet injected at runtime so
 * only the certificate is printed, not the surrounding UI). The
 * "Partager" button uses the Web Share API if available, falling back
 * to a clipboard copy of the certificate URL.
 *
 * Premium-only — the API returns 403 with code "PREMIUM_REQUIRED" for
 * free users. In that case the dialog shows an upgrade prompt.
 */
export function CertificateDialog({
  open,
  onOpenChange,
  sessionId,
}: CertificateDialogProps) {
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  useEffect(() => {
    if (!open || !sessionId) {
      // Defer state reset to avoid synchronous setState in effect.
      const t = setTimeout(() => {
        setData(null);
        setError(null);
        setNeedsUpgrade(false);
      });
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      setNeedsUpgrade(false);
      fetch(`/api/certificate?sessionId=${encodeURIComponent(sessionId)}`)
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (body?.code === "PREMIUM_REQUIRED") {
              setNeedsUpgrade(true);
              setError(body.error ?? "Premium requis");
            } else {
              setError(body?.error ?? "Échec du chargement du certificat");
            }
            return null;
          }
          return body as CertificateData;
        })
        .then((d) => {
          if (!cancelled && d) setData(d);
        })
        .catch(() => {
          if (!cancelled) setError("Erreur réseau");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, sessionId]);

  function handlePrint() {
    if (!data) return;
    // Open a fresh window with just the certificate markup and call print.
    // This avoids polluting the main app's print stylesheets and ensures
    // the printed page only contains the diploma.
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) {
      toast.error("Veuillez autoriser les pop-ups pour imprimer.");
      return;
    }
    const dateStr = new Date(data.date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Certificat ${data.certificateId}</title>
      <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background: #f8fafc; }
        .cert {
          width: 297mm; height: 210mm; margin: 0 auto;
          background: linear-gradient(135deg, #fefce8 0%, #fff 50%, #f0fdf4 100%);
          border: 12px double #b45309; padding: 32mm 24mm; box-sizing: border-box; position: relative;
        }
        .cert::before, .cert::after {
          content: ""; position: absolute; left: 8mm; right: 8mm; height: 2px;
          background: linear-gradient(90deg, transparent, #b45309, transparent);
        }
        .cert::before { top: 8mm; } .cert::after { bottom: 8mm; }
        .issuer { text-align: center; font-size: 14px; letter-spacing: 4px; color: #b45309; text-transform: uppercase; }
        .seal { font-size: 56px; text-align: center; margin: 8mm 0 4mm; }
        .title { text-align: center; font-size: 36px; font-weight: bold; color: #1f2937; margin-bottom: 6mm; }
        .subtitle { text-align: center; font-size: 16px; color: #6b7280; margin-bottom: 12mm; }
        .name { text-align: center; font-size: 28px; font-weight: bold; color: #b45309; margin-bottom: 8mm; border-bottom: 1px solid #d1d5db; padding-bottom: 4mm; display: inline-block; }
        .name-wrap { text-align: center; }
        .body { text-align: center; font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 10mm; }
        .body strong { color: #b45309; }
        .footer { display: flex; justify-content: space-between; margin-top: 16mm; font-size: 12px; color: #6b7280; }
        .footer .left, .footer .right { text-align: center; }
        .footer .line { border-top: 1px solid #9ca3af; padding-top: 2mm; width: 60mm; }
        .cert-id { position: absolute; bottom: 4mm; right: 12mm; font-size: 10px; color: #9ca3af; font-family: monospace; }
      </style></head><body>
      <div class="cert">
        <div class="issuer">QuizExam BF · Burkina Faso</div>
        <div class="seal">🏆</div>
        <div class="title">Certificat de Réussite</div>
        <div class="subtitle">Ce certificat est décerné à</div>
        <div class="name-wrap"><span class="name">${escapeHtml(data.userName)}</span></div>
        <div class="body">
          pour avoir obtenu un score de <strong>${data.percentage}%</strong>
          (${data.score} / ${data.total} questions correctes)<br/>
          au quiz <strong>« ${escapeHtml(data.quizTitle)} »</strong><br/>
          le ${dateStr}.
        </div>
        <div class="footer">
          <div class="left"><div class="line">Date de délivrance</div>${dateStr}</div>
          <div class="right"><div class="line">Émis par</div>${escapeHtml(data.issuer)}</div>
        </div>
        <div class="cert-id">${data.certificateId}</div>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>
      </body></html>`);
    win.document.close();
  }

  async function handleShare() {
    if (!data) return;
    const url = `${window.location.origin}/?cert=${data.certificateId}`;
    const text = `J'ai obtenu un certificat QuizExam BF avec ${data.percentage}% au quiz « ${data.quizTitle} » ! 🏆`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mon certificat QuizExam BF", text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien du certificat copié dans le presse-papiers.");
      }
    } catch {
      // user-cancelled share, or clipboard blocked — silent
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Certificat de réussite</DialogTitle>
              <DialogDescription>
                Diplôme officiel QuizExam BF
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        )}

        {!loading && needsUpgrade && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Crown className="h-10 w-10 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              {error ??
                "Les certificats sont réservés aux membres Premium."}
            </p>
            <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
              <Crown className="h-3 w-3" /> Premium
            </Badge>
          </div>
        )}

        {!loading && !needsUpgrade && error && (
          <div className="py-6 text-center text-sm text-rose-600">{error}</div>
        )}

        {!loading && !needsUpgrade && data && (
          <>
            {/* Diploma preview */}
            <div
              className="relative overflow-hidden rounded-xl border-4 border-double border-amber-600 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 text-center"
              style={{ minHeight: 280 }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">
                {data.issuer} · Burkina Faso
              </p>
              <div className="my-2 text-4xl">🏆</div>
              <h3 className="text-xl font-bold text-gray-800">
                Certificat de Réussite
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Ce certificat est décerné à
              </p>
              <p className="mx-auto mt-2 inline-block border-b border-gray-300 pb-1 text-lg font-bold text-amber-700">
                {data.userName}
              </p>
              <p className="mt-3 text-sm text-gray-700">
                pour avoir obtenu un score de{" "}
                <strong className="text-amber-700">{data.percentage}%</strong>{" "}
                ({data.score}/{data.total}) au quiz «{" "}
                <strong>{data.quizTitle}</strong> » le{" "}
                {new Date(data.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="border-t border-gray-400 pt-1">
                  Date de délivrance
                </span>
                <span className="border-t border-gray-400 pt-1">
                  Émis par {data.issuer}
                </span>
              </div>
              <p className="mt-3 font-mono text-[10px] text-gray-500">
                ID: {data.certificateId}
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
              <Button
                onClick={handlePrint}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </DialogFooter>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Génération du certificat…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
