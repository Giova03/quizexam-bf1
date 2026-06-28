"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";

export interface BankOption {
  id: string;
  title: string;
  category: string;
  _count?: { questions: number };
}

interface Props {
  /**
   * Current selection. Either "new" or an existing bank id.
   * The parent owns this state.
   */
  value: string;
  /** Title for the new bank (when value === "new"). Parent owns. */
  newBankTitle: string;
  banks: BankOption[];
  /** Called when user picks an existing bank or switches to "new" mode. */
  onValueChange: (v: string) => void;
  /** Called when user edits the new bank title input. */
  onNewTitleChange: (v: string) => void;
}

/**
 * Bank selector — fully controlled component.
 * Lets user pick an existing bank or create a new one inline.
 *
 * The parent component owns `value` and `newBankTitle` state, so this
 * component never calls setState synchronously inside useEffect.
 */
export function BankSelector({
  value,
  newBankTitle,
  banks,
  onValueChange,
  onNewTitleChange,
}: Props) {
  const mode: "existing" | "new" = value === "new" ? "new" : "existing";

  function switchMode(m: "existing" | "new") {
    if (m === "existing") {
      // pick first available bank
      onValueChange(banks[0]?.id ?? "new");
    } else {
      onValueChange("new");
    }
  }

  return (
    <div className="space-y-2">
      <Label>Banque cible *</Label>
      <div className="flex gap-1 rounded-lg border p-1">
        <button
          type="button"
          onClick={() => switchMode("existing")}
          disabled={banks.length === 0}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            mode === "existing"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Banque existante
        </button>
        <button
          type="button"
          onClick={() => switchMode("new")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "new"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Plus className="h-3 w-3" />
          Nouvelle banque
        </button>
      </div>

      {mode === "existing" ? (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une banque..." />
          </SelectTrigger>
          <SelectContent>
            {banks.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.title}{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({b._count?.questions ?? 0} Q)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-1">
          <Input
            placeholder="Titre de la nouvelle banque"
            value={newBankTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
          />
          <p className="flex items-center gap-1 text-[11px] text-emerald-600">
            <Check className="h-3 w-3" />
            La banque sera créée automatiquement lors de l&apos;import
          </p>
        </div>
      )}
    </div>
  );
}
