"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Database, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import type { AdminStats, BankWithCount } from "./types";

/**
 * BanksTab — Banks & QCM tab content.
 *
 * Renders the PDF upload callout + the full bank list. Clicking a bank calls
 * `onSelectBank(bank)` so the parent can open BankQuestionsDialog.
 */
export function BanksTab({
  stats,
  onSelectBank,
  onUploadPdf,
}: {
  stats: AdminStats | null;
  onSelectBank: (bank: BankWithCount) => void;
  onUploadPdf: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                Générer des QCM depuis un PDF
              </p>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80">
                Importez un document, l&apos;IA génère des questions que vous
                pouvez vérifier et ajouter à une banque.
              </p>
            </div>
          </div>
          <Button
            onClick={onUploadPdf}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            <FileText className="h-4 w-4" />
            Upload PDF
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Database className="h-4 w-4 text-emerald-600" />
            Banques de questions ({stats?.bankStats.length ?? 0})
          </h2>
          <p className="text-sm text-muted-foreground">
            Cliquez sur une banque pour gérer et corriger ses questions
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {stats?.bankStats.map((bank) => (
            <button
              key={bank.id}
              onClick={() => onSelectBank(bank)}
              className="flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-emerald-400 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{bank.title}</p>
                <p className="text-xs text-muted-foreground">
                  {bank.category}
                  {bank.subcategory ? ` · ${bank.subcategory}` : ""}
                </p>
              </div>
              <Badge variant="secondary">
                {bank._count.questions} Q
              </Badge>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * NewBankDialog — modal form for creating a new question bank.
 */
export function NewBankDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Culture Générale");
  const [subcategory, setSubcategory] = useState("");
  const [color, setColor] = useState("emerald");
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          subcategory,
          color,
          icon: "BookOpen",
          level: "TOUS",
        }),
      });
      if (res.ok) {
        toast.success("Banque créée");
        setTitle("");
        setDescription("");
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle banque de questions</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Culture Générale - Concours 2026"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Culture Générale",
                    "Psychotechnique",
                    "Secondaire",
                    "Universitaire",
                    "Concours",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Couleur</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "emerald",
                    "violet",
                    "amber",
                    "sky",
                    "rose",
                    "cyan",
                    "teal",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Sous-catégorie</Label>
            <Input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Ex: Histoire"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={create} disabled={saving || !title}>
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
