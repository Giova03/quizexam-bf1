"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/prefs-store";

export function PreferencesApplier() {
  const highContrast = usePrefs((s) => s.highContrast);
  const largeText = usePrefs((s) => s.largeText);
  const reduceMotion = usePrefs((s) => s.reduceMotion);
  const locale = usePrefs((s) => s.locale);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("hc-mode", highContrast);
    root.classList.toggle("large-text", largeText);
    root.classList.toggle("reduce-motion", reduceMotion);
    root.lang = locale;
  }, [highContrast, largeText, reduceMotion, locale]);

  return null;
}
