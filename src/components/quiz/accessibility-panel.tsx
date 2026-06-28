"use client";

import { usePrefs } from "@/lib/prefs-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Contrast,
  Type,
  Wind,
  Accessibility,
  BookOpen,
  Volume2,
  RotateCcw,
} from "lucide-react";

/**
 * Accessibility panel — embedded inside the Settings sheet.
 *
 * Toggles are persisted in the prefs-store (zustand + localStorage) and
 * applied to <html> by PreferencesApplier.
 *
 * Toggles:
 *   - High contrast (high-contrast class)
 *   - Large text (large-text class)
 *   - Reduce motion (reduce-motion class)
 *   - Dyslexia-friendly font ([data-dyslexia] attribute)
 *   - Screen-reader hints ([data-sr-hints] attribute)
 *
 * Slider:
 *   - Base font size (12-24 px)
 */
export function AccessibilityPanel() {
  const {
    highContrast = false,
    largeText = false,
    reduceMotion = false,
    dyslexiaFont = false,
    screenReaderHints = false,
    fontSize,
    toggleHighContrast,
    toggleLargeText,
    toggleReduceMotion,
    toggleDyslexiaFont,
    toggleScreenReaderHints,
    setFontSize,
  } = usePrefs();

  const resetAll = () => {
    if (highContrast) toggleHighContrast();
    if (largeText) toggleLargeText();
    if (reduceMotion) toggleReduceMotion();
    if (dyslexiaFont) toggleDyslexiaFont();
    if (screenReaderHints) toggleScreenReaderHints();
    setFontSize(16);
  };

  const anyActive =
    highContrast ||
    largeText ||
    reduceMotion ||
    dyslexiaFont ||
    screenReaderHints ||
    fontSize !== 16;

  return (
    <div className="space-y-3">
      <Card className="divide-y p-0 shadow-sm">
        <ToggleRow
          icon={Contrast}
          title="Contraste élevé"
          description="Couleurs noir et blanc renforcées, bordures épaisses"
          checked={highContrast}
          onToggle={toggleHighContrast}
        />
        <ToggleRow
          icon={Type}
          title="Texte agrandi"
          description="Augmente la taille de base de la police"
          checked={largeText}
          onToggle={toggleLargeText}
        />
        <ToggleRow
          icon={Wind}
          title="Réduire les animations"
          description="Désactive les transitions et animations"
          checked={reduceMotion}
          onToggle={toggleReduceMotion}
        />
        <ToggleRow
          icon={BookOpen}
          title="Police dyslexie"
          description="Police adaptée aux lecteurs dyslexiques"
          checked={dyslexiaFont}
          onToggle={toggleDyslexiaFont}
        />
        <ToggleRow
          icon={Volume2}
          title="Indices lecteur d'écran"
          description="Affiche les labels masqués (aria-label)"
          checked={screenReaderHints}
          onToggle={toggleScreenReaderHints}
        />
      </Card>

      {/* Font size slider */}
      <Card className="space-y-3 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-2.5">
            <Accessibility className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">
                Taille de police de base
              </Label>
              <p className="text-xs text-muted-foreground">
                Ajuste la taille du texte de toute l&apos;application
              </p>
            </div>
          </div>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
            {fontSize}px
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">A</span>
          <Slider
            min={12}
            max={24}
            step={1}
            value={[fontSize]}
            onValueChange={(values) => setFontSize(values[0])}
            aria-label="Taille de police"
          />
          <span className="text-base text-muted-foreground">A</span>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>12px</span>
          <span>16px (défaut)</span>
          <span>24px</span>
        </div>
      </Card>

      {anyActive && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="w-full gap-2 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser les préférences d&apos;accessibilité
          </Button>
        </>
      )}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: typeof Contrast;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <Label className="text-sm font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} aria-label={title} />
    </div>
  );
}
