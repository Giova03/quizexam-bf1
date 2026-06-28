"use client";

<<<<<<< Updated upstream
import { useEffect, useState } from "react";
=======
import { useEffect, useState, useCallback } from "react";
>>>>>>> Stashed changes
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
<<<<<<< Updated upstream
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
=======
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Award, Printer, Loader2, Download, Share2 } from "lucide-react";
>>>>>>> Stashed changes

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
<<<<<<< Updated upstream
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
=======
  sessionId: string;
  sessionTitle: string;
  score: number;
  totalQuestions: number;
}

interface Certificate {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  issuedAt: string;
}

>>>>>>> Stashed changes
export function CertificateDialog({
  open,
  onOpenChange,
  sessionId,
<<<<<<< Updated upstream
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
=======
  sessionTitle,
  score,
  totalQuestions,
}: CertificateDialogProps) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const { toast } = useToast();

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const eligible = percentage >= 80;

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      // Get user info
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setUserName(me?.user?.name ?? "");
      }
      // Check existing certificate
      const res = await fetch(`/api/certificate?sessionId=${sessionId}`);
      if (res.ok) {
        const json = await res.json();
        setCertificate(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function issueCertificate() {
    setIssuing(true);
    try {
      const res = await fetch("/api/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: "Impossible de délivrer le certificat",
          description: json?.error || "Erreur",
          variant: "destructive",
        });
      } else {
        setCertificate(json);
        toast({
          title: "Certificat délivré ✓",
          description: "Vous pouvez l'imprimer, le télécharger ou le partager.",
        });
      }
    } catch {
      toast({
        title: "Erreur réseau",
        variant: "destructive",
      });
    } finally {
      setIssuing(false);
    }
  }

  function printCertificate() {
    const cert = certificate;
    if (!cert) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const dateStr = new Date(cert.issuedAt).toLocaleDateString("fr-FR", {
>>>>>>> Stashed changes
      day: "numeric",
      month: "long",
      year: "numeric",
    });
<<<<<<< Updated upstream
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
=======
    const certId = cert.id;
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Certificat — ${escapeHtml(sessionTitle)}</title>
    <style>
      @page { size: landscape; margin: 0; }
      body { margin: 0; padding: 0; font-family: Georgia, serif; }
      .cert {
        width: 100%; min-height: 100vh; box-sizing: border-box;
        background: linear-gradient(135deg, #f0fdf4 0%, #fefce8 50%, #f0fdf4 100%);
        padding: 60px 80px; color: #1a1a1a; position: relative;
        border: 12px solid #10b981;
      }
      .corner { position: absolute; width: 60px; height: 60px; border: 4px solid #10b981; }
      .corner.tl { top: 30px; left: 30px; border-right: none; border-bottom: none; }
      .corner.tr { top: 30px; right: 30px; border-left: none; border-bottom: none; }
      .corner.bl { bottom: 30px; left: 30px; border-right: none; border-top: none; }
      .corner.br { bottom: 30px; right: 30px; border-left: none; border-top: none; }
      .seal {
        position: absolute; bottom: 80px; right: 100px;
        width: 130px; height: 130px; border-radius: 50%;
        background: radial-gradient(circle, #f59e0b 0%, #b45309 100%);
        color: white; display: flex; flex-direction: column;
        align-items: center; justify-content: center; font-family: Georgia, serif;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      .seal .icon { font-size: 40px; line-height: 1; }
      .seal .label { font-size: 9px; letter-spacing: 1.5px; margin-top: 4px; }
      .header { text-align: center; margin-bottom: 30px; }
      .header .brand { font-size: 14px; letter-spacing: 4px; color: #047857; text-transform: uppercase; }
      .header h1 { font-size: 56px; margin: 12px 0 0; color: #065f46; font-weight: bold; }
      .header .sub { font-size: 16px; color: #6b7280; margin-top: 6px; font-style: italic; }
      .body { text-align: center; margin: 40px 0; }
      .body .presented { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; }
      .body .name { font-size: 38px; margin: 14px 0; color: #1a1a1a; font-weight: bold; }
      .body .description { font-size: 16px; color: #374151; max-width: 700px; margin: 0 auto; line-height: 1.6; }
      .body .quiz-title { font-weight: bold; color: #047857; }
      .score-block { display: inline-block; margin: 24px 0; padding: 14px 36px; border: 3px double #10b981; }
      .score-block .pct { font-size: 40px; font-weight: bold; color: #047857; }
      .score-block .details { font-size: 12px; color: #6b7280; }
      .footer { display: flex; justify-content: space-between; margin-top: 60px; font-size: 12px; color: #6b7280; }
      .sig { border-top: 1px solid #9ca3af; padding-top: 6px; min-width: 200px; text-align: center; }
      .cert-id { position: absolute; bottom: 25px; left: 0; right: 0; text-align: center; font-size: 10px; color: #9ca3af; font-family: monospace; }
    </style>
    </head><body>
    <div class="cert">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
      <div class="header">
        <div class="brand">QuizExam BF · Burkina Faso</div>
        <h1>Certificat de Réussite</h1>
        <div class="sub">Préparation aux concours et examens blancs</div>
      </div>
      <div class="body">
        <div class="presented">Décerné à</div>
        <div class="name">${escapeHtml(userName || "Étudiant")}</div>
        <div class="description">
          Pour avoir obtenu un score exceptionnel au quiz
          <br><span class="quiz-title">« ${escapeHtml(sessionTitle)} »</span>
        </div>
        <div class="score-block">
          <div class="pct">${cert.percentage}%</div>
          <div class="details">${cert.score} / ${cert.totalQuestions} bonnes réponses</div>
        </div>
      </div>
      <div class="footer">
        <div class="sig">Date de délivrance<br><strong>${dateStr}</strong></div>
        <div class="sig">Plateforme<br><strong>QuizExam BF</strong></div>
      </div>
      <div class="seal"><div class="icon">★</div><div class="label">OFFICIEL</div></div>
      <div class="cert-id">Certificat N° ${escapeHtml(certId)} · QuizExam BF</div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
    </body></html>`);
    win.document.close();
  }

  function downloadText() {
    if (!certificate) return;
    const dateStr = new Date(certificate.issuedAt).toLocaleDateString("fr-FR");
    const txt = `QUIZEXAM BF — CERTIFICAT DE RÉUSSITE
================================

Délivré à : ${userName}
Quiz : ${sessionTitle}
Score : ${certificate.score} / ${certificate.totalQuestions} (${certificate.percentage}%)
Date : ${dateStr}
N° : ${certificate.id}

Plateforme QuizExam BF — BAMOGO Pingdwendé Giovanni
`;
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificat-${certificate.id.slice(-8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareCertificate() {
    if (!certificate) return;
    const dateStr = new Date(certificate.issuedAt).toLocaleDateString("fr-FR");
    const shareText = `🎓 J'obtiens un certificat de réussite sur QuizExam BF !\n${sessionTitle} — ${certificate.percentage}% (${certificate.score}/${certificate.totalQuestions})\nDélivré le ${dateStr} · N° ${certificate.id.slice(-8)}`;
    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Mon certificat QuizExam BF",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // User cancelled or share failed → fall back to clipboard
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast({
        title: "Lien copié ✓",
        description: "Partagez-le sur vos réseaux sociaux.",
      });
    } catch {
      toast({
        title: "Impossible de partager",
        description: shareText,
        variant: "destructive",
      });
    }
  }

  const issuedDateStr = certificate
    ? new Date(certificate.issuedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Certificat de réussite
          </DialogTitle>
          <DialogDescription>
            Score : {score}/{totalQuestions} ({percentage}%) ·{" "}
            {eligible ? "Éligible ✓" : "Score insuffisant (≥ 80% requis)"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !eligible ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Obtenez un score ≥ 80% pour débloquer un certificat.
            <br />
            Votre score actuel : <strong>{percentage}%</strong>
          </div>
        ) : certificate ? (
          /* ===== Diploma-style preview ===== */
          <div className="overflow-hidden rounded-lg border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-yellow-50 to-emerald-50 p-6 text-center dark:border-emerald-700 dark:from-emerald-950/30 dark:via-yellow-950/20 dark:to-emerald-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              QuizExam BF · Burkina Faso
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-emerald-800 dark:text-emerald-200">
              Certificat de Réussite
            </h3>
            <p className="mt-1 text-[10px] italic text-muted-foreground">
              Préparation aux concours et examens blancs
            </p>

            <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Décerné à
            </p>
            <p className="font-serif text-2xl font-bold">
              {userName || "Étudiant"}
            </p>

            <p className="mt-3 text-xs text-muted-foreground">
              Pour avoir obtenu un score exceptionnel au quiz
            </p>
            <p className="font-serif font-semibold text-emerald-700 dark:text-emerald-300">
              « {sessionTitle} »
            </p>

            <div className="mx-auto mt-4 inline-block rounded-md border-2 border-double border-emerald-500 px-6 py-2">
              <p className="font-serif text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {certificate.percentage}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                {certificate.score} / {certificate.totalQuestions} bonnes réponses
              </p>
            </div>

            <div className="mt-6 flex items-end justify-between text-[10px] text-muted-foreground">
              <div className="border-t border-muted-foreground/30 px-6 pt-1 text-center">
                Date de délivrance
                <br />
                <strong className="text-foreground">{issuedDateStr}</strong>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-700 text-white shadow">
                <Award className="h-5 w-5" />
              </div>
              <div className="border-t border-muted-foreground/30 px-6 pt-1 text-center">
                Plateforme
                <br />
                <strong className="text-foreground">QuizExam BF</strong>
              </div>
            </div>

            <p className="mt-3 font-mono text-[9px] text-muted-foreground">
              Certificat N° {certificate.id}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm">
            <p>
              Félicitations ! Vous êtes éligible à un certificat de réussite.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cliquez ci-dessous pour le délivrer.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!certificate && eligible && (
            <Button
              onClick={issueCertificate}
              disabled={issuing}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              {issuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
              Délivrer le certificat
            </Button>
          )}
          {certificate && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadText}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                .txt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareCertificate}
>>>>>>> Stashed changes
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
              <Button
<<<<<<< Updated upstream
                onClick={handlePrint}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
=======
                size="sm"
                onClick={printCertificate}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
>>>>>>> Stashed changes
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
<<<<<<< Updated upstream
            </DialogFooter>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Génération du certificat…
          </div>
        )}
=======
            </>
          )}
        </DialogFooter>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    .replace(/'/g, "&#39;");
=======
    .replace(/'/g, "&#039;");
>>>>>>> Stashed changes
}
