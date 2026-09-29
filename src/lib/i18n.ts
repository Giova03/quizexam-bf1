/**
 * i18n — QuizExam BF multilingual system (V5).
 *
 * Three fully translated locales:
 *  - fr   : Français (default, source of truth)
 *  - en   : English
 *  - moor : Mooré (Mossi, Burkina Faso)
 *
 * Flat dictionary keys ("nav.home", "auth.error.invalid"…). A missing key in
 * a non-French dictionary transparently falls back to French, then to the
 * key itself (so the UI never breaks).
 *
 * Usage (client components):
 *   const { t, locale } = useTranslation();
 *   t("nav.home");
 */
import { fr } from "./i18n-dicts/fr";
import { en } from "./i18n-dicts/en";
import { moor } from "./i18n-dicts/moor";

export type Locale = "fr" | "en" | "moor";

export const LOCALES: Array<{ code: Locale; label: string; flag: string }> = [
  { code: "fr", label: "Français", flag: "🇧🇫" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "moor", label: "Mooré", flag: "🇧🇫" },
];

type Dict = Record<string, string>;

const DICTS: Record<Locale, Dict> = { fr, en, moor };

/** Normalize any persisted/stored locale value to a valid Locale. */
export function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "moor" ? value : "fr";
}

/** BCP-47 tag for <html lang> / date formatting. */
export function localeTag(locale: Locale | string): string {
  switch (normalizeLocale(locale)) {
    case "en":
      return "en";
    case "moor":
      return "mos";
    default:
      return "fr";
  }
}

export function translate(locale: Locale | string, key: string): string {
  const loc = normalizeLocale(locale);
  return DICTS[loc]?.[key] ?? DICTS.fr[key] ?? key;
}
