/**
 * Screen reader helper (Feature E6.9).
 *
 * Provides simple announce() helpers that push messages to an invisible
 * aria-live region managed by <SrAnnouncer /> (see sr-announcer.tsx).
 *
 * Three announcement helpers:
 *   - announce(message)        — generic message.
 *   - announcePageChange(view) — fired when the user navigates to a view.
 *   - announceScore(score)     — fired when a quiz result is shown.
 *
 * The component subscribes to a tiny in-memory event emitter (no React
 * state needed) so the helpers can be called from anywhere (event
 * handlers, effects, even outside React).
 */

type Listener = (message: string, level: "polite" | "assertive") => void;

const listeners = new Set<Listener>();

function emit(message: string, level: "polite" | "assertive" = "polite") {
  if (typeof window === "undefined") return;
  if (listeners.size === 0) {
    // No announcer mounted yet — fall back to console for debugging.
    console.debug("[sr-announce]", message);
    return;
  }
  for (const l of listeners) l(message, level);
}

/** Subscribe to announcements. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announce a generic message to screen reader users.
 *
 * @param message  The text to announce.
 * @param level    "polite" (default — waits for the user to pause) or
 *                 "assertive" (interrupts current speech — use sparingly).
 */
export function announce(
  message: string,
  level: "polite" | "assertive" = "polite",
): void {
  if (!message) return;
  emit(message, level);
}

/**
 * Announce a page/view change. Called by the router-level view
 * transition (e.g. page.tsx useEffect on `view` change).
 */
const VIEW_LABELS: Record<string, string> = {
  home: "Accueil",
  "bank-list": "Liste des banques de questions",
  "bank-detail": "Détail d'une banque de questions",
  "exam-list": "Liste des examens",
  "exam-detail": "Détail d'un examen",
  session: "Session de quiz en cours",
  results: "Résultats du quiz",
  dashboard: "Tableau de bord",
  about: "À propos",
  admin: "Panneau d'administration",
  social: "Communauté",
  leaderboard: "Classement",
  "spaced-repetition": "Révision espacée",
  achievements: "Succès",
  forum: "Forum",
  profile: "Profil utilisateur",
  competition: "Mode compétition",
  groups: "Groupes d'étude",
  events: "Événements",
  blog: "Blog",
  "study-plan": "Parcours d'étude IA",
  quests: "Quêtes",
  "skill-tree": "Arbre de compétences",
  shop: "Boutique",
  messages: "Messagerie privée",
  mentorship: "Mentorat",
  wiki: "Wiki collaboratif",
  "live-sessions": "Sessions de révision live",
  "official-exam": "Mode examen blanc officiel",
  "study-sheet": "Fiches de révision auto-générées",
  "guided-path": "Parcours guidé 30 jours",
};

export function announcePageChange(viewName: string): void {
  const label = VIEW_LABELS[viewName] ?? viewName;
  announce(`Navigation vers : ${label}.`);
}

/**
 * Announce a quiz score. Called by the results view on mount.
 */
export function announceScore(
  correct: number,
  total: number,
): void {
  if (total <= 0) return;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 50;
  announce(
    `Quiz terminé. Score : ${correct} sur ${total}, soit ${pct} pour cent. ${
      passed ? "Examen réussi." : "Examen à reprendre."
    }`,
    "assertive",
  );
}

/**
 * Announce an error message (e.g. network failure, form validation).
 */
export function announceError(message: string): void {
  announce(`Erreur : ${message}`, "assertive");
}
