"use client";

import { useEffect } from "react";
import { usePrefs } from "@/shared/stores/prefs-store";
import { LOCALES, localeTag, type Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";

/**
 * LanguageSwitcher (V5) — compact globe dropdown listing every fully
 * translated language with its native name. Selecting a language updates
 * the whole UI instantly (zustand prefs store) and mirrors the choice onto
 * <html lang> for accessibility and screen readers.
 */
export function LanguageSwitcher() {
  const locale = usePrefs((s) => s.locale);
  const setLocale = usePrefs((s) => s.setLocale);

  // Reflect the current language onto <html lang> (a11y + spellcheck).
  useEffect(() => {
    document.documentElement.lang = localeTag(locale);
  }, [locale]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Changer de langue / Change language"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="uppercase tabular-nums">{locale === "moor" ? "mos" : locale}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Langue · Language · Bʋʋr
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l) => {
          const active = l.code === locale;
          return (
            <DropdownMenuItem
              key={l.code}
              onClick={() => setLocale(l.code as Locale)}
              className="gap-2.5 cursor-pointer"
            >
              <span aria-hidden="true">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.code === "moor" && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                  BF
                </span>
              )}
              {active && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
