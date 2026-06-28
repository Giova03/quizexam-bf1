"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileInput,
  ClipboardPaste,
  FileText,
  FileSpreadsheet,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { ImportTextDialog } from "../import-text-dialog";
import { PdfUploadDialog } from "../pdf-upload-dialog";
import { ImportCsvDialog } from "../import-csv-dialog";
import { ExamBuilder } from "../exam-builder";

/**
 * ImportsPanel — onglet "Import" du panneau admin.
 * Cartes d'accès rapide aux 5 méthodes d'import de contenu.
 *
 * Intègre les dialogues créés par le sous-agent I1 :
 *  - ImportTextDialog (parser texte QCM)
 *  - PdfUploadDialog (PDF + Word partagés)
 *  - ImportCsvDialog (CSV/JSON en masse)
 *  - ExamBuilder (création d'examen drag & drop)
 */
export function ImportsPanel({ onChanged }: { onChanged: () => void }) {
  const [textOpen, setTextOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [examBuilderOpen, setExamBuilderOpen] = useState(false);

  const importCards = [
    {
      title: "Texte QCM (copier-coller)",
      desc: "Collez du texte contenant des questions. Le parseur détecte les numéros, options (a-d), réponses et explications.",
      icon: ClipboardPaste,
      color: "emerald",
      onClick: () => setTextOpen(true),
      tag: "Rapide",
    },
    {
      title: "PDF → Extraction → Banque",
      desc: "Téléversez un PDF, extrayez le texte automatiquement, puis générez des QCM par IA.",
      icon: FileText,
      color: "rose",
      onClick: () => setPdfOpen(true),
      tag: "IA",
    },
    {
      title: "Word (.docx) → Extraction",
      desc: "Importez un document Word .docx, extrayez le texte et générez des questions par IA.",
      icon: FileText,
      color: "sky",
      onClick: () => setPdfOpen(true),
      tag: "IA",
    },
    {
      title: "CSV / JSON en masse",
      desc: "Importez un fichier CSV ou JSON contenant des dizaines/centaines de questions. Modèle téléchargeable.",
      icon: FileSpreadsheet,
      color: "amber",
      onClick: () => setCsvOpen(true),
      tag: "Bulk",
    },
    {
      title: "Création d'examen directe",
      desc: "Composez un examen en sélectionnant des questions individuelles ou par banque. Glisser-déposer pour réordonner.",
      icon: GraduationCap,
      color: "violet",
      onClick: () => setExamBuilderOpen(true),
      tag: "Examen",
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/40",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/40",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <FileInput className="h-4 w-4 text-emerald-600" />
          Import de contenu
        </h2>
        <p className="text-sm text-muted-foreground">
          5 méthodes pour enrichir vos banques de questions et créer des
          examens. Chaque import crée ou complète une banque existante.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {importCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <Card
              key={idx}
              className="group flex flex-col gap-3 p-5 transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    colorMap[c.color] ?? colorMap.emerald
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {c.tag}
                </Badge>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
              </div>
              <Button
                onClick={c.onClick}
                className="mt-auto gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              >
                <Sparkles className="h-4 w-4" />
                Ouvrir
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Astuce</p>
          <p className="mt-0.5">
            Pour un import rapide, utilisez le copier-coller de texte QCM.
            Pour générer du contenu depuis un PDF/Word, l&apos;IA crée les
            questions automatiquement. Le format CSV/JSON est idéal pour
            migrer une base existante.
          </p>
        </div>
      </div>

      <ImportTextDialog
        open={textOpen}
        onOpenChange={setTextOpen}
        onImported={() => onChanged()}
      />
      <PdfUploadDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        onSaved={() => onChanged()}
      />
      <ImportCsvDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={() => onChanged()}
      />
      <ExamBuilder
        open={examBuilderOpen}
        onOpenChange={setExamBuilderOpen}
        onCreated={() => onChanged()}
      />
    </div>
  );
}
