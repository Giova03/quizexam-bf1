"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/prefs-store";

export function PreferencesApplier() {
  const highContrast = usePrefs((s) => s.highContrast);
  const largeText = usePrefs((s) => s.largeText);
  const reduceMotion = usePrefs((s) => s.reduceMotion);
  const fontSize = usePrefs((s) => s.fontSize);
  const dyslexiaFont = usePrefs((s) => s.dyslexiaFont);
  const screenReaderHints = usePrefs((s) => s.screenReaderHints);
  const locale = usePrefs((s) => s.locale);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", highContrast);
    root.classList.toggle("large-text", largeText);
    root.classList.toggle("reduce-motion", reduceMotion);
    root.lang = locale;
  }, [highContrast, largeText, reduceMotion, locale]);

  // Apply the custom base font-size (only when the user explicitly picked a
  // non-default value, so we don't fight Tailwind's default 16px).
  useEffect(() => {
    const root = document.documentElement;
    if (fontSize && fontSize !== 16) {
      root.style.fontSize = `${fontSize}px`;
    } else {
      root.style.removeProperty("font-size");
    }
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    if (dyslexiaFont) {
      root.setAttribute("data-dyslexia", "");
    } else {
      root.removeAttribute("data-dyslexia");
    }
  }, [dyslexiaFont]);

  useEffect(() => {
    const root = document.documentElement;
    if (screenReaderHints) {
      root.setAttribute("data-sr-hints", "");
    } else {
      root.removeAttribute("data-sr-hints");
    }
  }, [screenReaderHints]);

  return null;
}
