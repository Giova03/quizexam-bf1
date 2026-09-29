"use client";

import { usePrefs } from "@/shared/stores/prefs-store";
import { translate, type Locale } from "./i18n";

export function useTranslation() {
  const locale = usePrefs((s) => s.locale);
  const t = (key: string) => translate(locale as Locale, key);
  return { t, locale };
}
