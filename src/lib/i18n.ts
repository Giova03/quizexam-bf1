// Multilingual dictionary for QuizExam BF
export type Locale = "fr" | "en" | "moor" | "dioula";

export const LOCALES: Array<{ code: Locale; label: string; flag: string }> = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "moor", label: "Moore", flag: "🇧🇫" },
  { code: "dioula", label: "Dioula", flag: "🇧🇫" },
];

type Dict = Record<string, string>;

const fr: Dict = {
  "app.name": "QuizExam BF",
  "nav.home": "Accueil",
  "nav.dashboard": "Tableau de bord",
  "nav.about": "À propos",
  "nav.notifications": "Notifications",
  "nav.settings": "Préférences",
  "footer.tagline": "Plateforme de Quiz & Examens Blancs — Burkina Faso",
  "settings.title": "Préférences",
  "settings.language": "Langue de l'interface",
  "settings.accessibility": "Accessibilité",
  "settings.highContrast": "Contraste élevé",
  "settings.largeText": "Texte agrandi",
  "settings.reduceMotion": "Réduire les animations",
  "settings.gamification": "Gamification & Progression",
  "settings.xp": "Points XP",
  "settings.level": "Niveau",
  "settings.streak": "Série de jours",
  "settings.badges": "Badges débloqués",
  "gamif.badges": "Badges",
  "notifs.title": "Notifications",
  "notifs.empty": "Aucune notification.",
  "notifs.markRead": "Tout marquer comme lu",
};

const en: Dict = {
  ...fr,
  "nav.home": "Home",
  "nav.dashboard": "Dashboard",
  "nav.about": "About",
  "nav.notifications": "Notifications",
  "nav.settings": "Settings",
  "settings.title": "Settings",
  "settings.language": "Interface language",
  "settings.accessibility": "Accessibility",
  "settings.highContrast": "High contrast",
  "settings.largeText": "Large text",
  "settings.reduceMotion": "Reduce motion",
};

const moor: Dict = { ...en, "app.name": "QuizExam BF" };
const dioula: Dict = { ...en, "app.name": "QuizExam BF" };

export const DICTS: Record<Locale, Dict> = { fr, en, moor, dioula };

export function translate(locale: Locale, key: string): string {
  return DICTS[locale]?.[key] ?? DICTS.fr[key] ?? key;
}
