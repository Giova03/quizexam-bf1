"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Share2, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";

interface QRShareDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  content: string;
}

export function QRShareDialog({
  open,
  onOpenChange,
  title,
  content,
}: QRShareDialogProps) {
  const [copied, setCopied] = useState(false);

  // Build shareable text
  const shareText = `${title}\n\n${content}\n\n— QuizExam BF`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?shared=${encodeURIComponent(title)}`
      : "";

  const qrValue = shareUrl || `QuizExam BF: ${title}`;

  function copyToClipboard() {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      toast.success("Copié dans le presse-papier !");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadQR() {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quizexam-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("QR code téléchargé !");
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: content });
      } catch {
        // user cancelled
      }
    } else {
      copyToClipboard();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-600" />
            Partager
          </DialogTitle>
          <DialogDescription className="sr-only">
            Partager cette question ou réponse
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="gap-1.5">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5">
              <Share2 className="h-4 w-4" />
              Texte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="flex flex-col items-center gap-4 pt-4">
            <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4 dark:border-emerald-800">
              <QRCodeSVG
                id="qr-code-svg"
                value={qrValue}
                size={180}
                level="M"
                includeMargin={false}
                imageSettings={{
                  src: "/logo-quizexam.svg",
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Scannez ce QR code pour accéder à la question
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={downloadQR}
            >
              <Download className="h-4 w-4" />
              Télécharger le QR code
            </Button>
          </TabsContent>

          <TabsContent value="text" className="space-y-3 pt-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm whitespace-pre-wrap">{shareText}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copié !" : "Copier"}
              </Button>
              <Button
                className="flex-1 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                onClick={nativeShare}
              >
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
