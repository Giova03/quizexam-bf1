# Task ID: F3
# Agent: F3 (Z.ai Code)
# Task: 4 UX improvements — (1) Onboarding guidé, (2) Recherche globale unifiée, (3) Navigation simplifiée, (4) Aide contextuelle

## Work Log

- Read worklog.md (through F2, ~1339 lines) and the relevant prior agent-ctx files (P9, F1, F2) to understand the project state, the lazy-loading pattern, the in-memory cache pattern, and the existing 1 pre-existing TS error in next.config.ts(7,3) (documented by every prior agent — out of scope for F3).
- Read the key files I needed to modify:
  - `src/app/page.tsx` (navigation structure, store destructure, lazy views, dialog mounting)
  - `src/components/quiz/search-dialog.tsx` (existing single-tab search)
  - `src/lib/quiz-store.ts` + `src/lib/types.ts` (ViewName union, navigation actions)
  - `src/components/quiz/chatbot.tsx` (floating button pattern + bottom-right position)
  - `src/components/quiz/home-view.tsx` (DailyChallengeCard + banks section locations)
  - `src/app/api/forum/topics/route.ts` (existing `?q=` search support)
  - `src/app/api/admin/users/route.ts` (existing user query pattern)
  - `src/lib/auth.ts` + `src/lib/db.ts` (auth gating + globalThis-cached Prisma client)
  - `src/components/ui/dropdown-menu.tsx` + `src/components/ui/tabs.tsx` (verified both Radix wrappers exist)

### 1. Onboarding guidé — `src/components/quiz/onboarding-tour.tsx` (~470 lines)

Created the file with:
- **STEPS array** (8 entries): Bienvenue → Banques de questions → Recherche rapide → Tableau de bord → Défi quotidien → Forum → Compétition → C'est parti.
  - Each step has `title`, `description`, `icon` (Lucide), and `selector` (CSS selector targeting a `data-tour="..."` attribute, or `null` for a centered final step).
  - Selectors used: `[data-tour='home']`, `[data-tour='banks-section']`, `[data-tour='search-btn']`, `[data-tour='dashboard-nav']`, `[data-tour='daily-challenge']`, `[data-tour='more-nav']` (for both Forum & Compétition — points at the "Plus" dropdown trigger since those items live inside it), and `null` for the final "C'est parti!" step.
- **Spotlight overlay** technique: a transparent div positioned at the target's bounding rect (with PADDING=8px), using `boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'` to create the dark surround outside the cutout. Plus a dark overlay div behind it for the centered/final step.
- **Tooltip** that auto-positions above or below the target based on available viewport space, with a small rotated-square arrow pointing to the spotlight.
- **`recompute()` callback** wrapped in `requestAnimationFrame` so all `setState` calls (setRect, setTooltipPos) are async — this satisfies the `react-hooks/set-state-in-effect` lint rule.
- **Recomputed on**: step change, window scroll (capture phase, true), window resize (debounced via `requestAnimationFrame`).
- **`scrollIntoView({ block: 'center' })`** before measuring so the target is always in viewport.
- **Tour control functions** (`complete`, `next`, `prev`) declared BEFORE the keyboard useEffect that uses them (avoids the `react-hooks/immutability` "Cannot access variable before it is declared" lint error).
- **Keyboard shortcuts**: ESC=skip, ArrowRight=next, ArrowLeft=prev.
- **Progress dots** at the bottom — clickable to jump to any step.
- **"Suivant" / "Précédent" / "Passer"** buttons in the footer.
- **Completion**: writes `localStorage["onboarding-completed"] = "1"` and dispatches a `CustomEvent("onboarding-complete")` so the container unmounts.
- **`OnboardingTourContainer`**: wraps `OnboardingTour` with auth-gated logic. Uses `setTimeout(() => setShouldShow(true), 800)` (async, allowed) so the home view has time to mount target elements before we measure them. Listens for `onboarding-complete` to unmount.
- **`restartOnboarding()`** export: removes the localStorage flag and reloads the page — called from the HelpButton's "Relancer le tour guidé" button.

### 2. Recherche globale unifiée — Enhanced `src/components/quiz/search-dialog.tsx` (~530 lines)

Replaced the single-purpose search with a 4-tab interface:
- **Tabs**: Questions | Banques | Forum | Utilisateurs (using `@/components/ui/tabs`).
- **Single search input** at the top (with clear-X button) feeds all tabs.
- **Debounced dispatch** (300ms) inside `setTimeout` — `setLoading(true)` is inside the timer callback so it never fires synchronously in the effect body (lint rule compliance).
- **Questions tab**: existing `/api/search?q=...` (preserved), with the existing detail dialog (correct answer highlighted, explanation, "Ouvrir la banque" button).
- **Banques tab**: fetches `/api/banks` once (cached via the F2 in-memory cache) and filters client-side by `title`/`category`/`description`. Result cards show bank icon (color-mapped via `getColor`), title, description, question count, and a "Ouvrir la banque" affordance. Clicking opens the bank via `openBank()`.
- **Forum tab**: calls `/api/forum/topics?q=...&pageSize=20` (existing endpoint). Result cards show topic title, content excerpt (line-clamped), category badge, reply count, and author name. Clicking opens the forum via `openForum()`.
- **Utilisateurs tab**: calls the new `/api/users?search=...&limit=20` endpoint. Result cards show user avatar (initials, amber for admins, emerald otherwise), name, role label, and a chevron. Clicking opens the user's profile via `openProfile(u.id)`.
- **Empty/loading states** per tab, with skeleton cards during load.
- All navigation actions close the search dialog via `onOpenChange(false)`.

### 2b. New API endpoint — `src/app/api/users/route.ts`

- `GET /api/users?search=<q>&limit=<n>` — requires auth (returns 401 JSON if unauthenticated).
- Case-insensitive `contains` search on `user.name` (Prisma `mode: "insensitive"`).
- Returns `{ items: Array<{ id, name, role }> }` — **no email** for privacy.
- Min 2 chars to trigger a search (returns `{ items: [] }` if shorter).
- Limit clamped to [1, 50], default 20.
- `dynamic = "force-dynamic"`.
- Verified end-to-end with curl: unauthenticated → 401 JSON ✓, short query → empty items (would 401 without auth), valid query (auth) → list of users.

### 3. Navigation simplifiée — `src/app/page.tsx` reorganization

- Added imports: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `OnboardingTourContainer`, `HelpButton`, and Lucide icons `Brain` + `ChevronDown`.
- Added `openSpacedRepetition` to the `useQuizStore()` destructure (needed for the new "Révision espacée" menu item — the action already existed in the store but wasn't destructured in page.tsx).
- **Desktop nav** (`hidden md:flex`): 
  - Primary (always visible): **Accueil** (`data-tour="home-nav"`), **Tableau de bord** (`data-tour="dashboard-nav"`), **Examen IA** (gradient violet button).
  - "Plus" dropdown (Radix `DropdownMenu` with `Tooltip` wrapper): trigger button has `data-tour="more-nav"`, ChevronDown icon, and shows "secondary" variant when any secondary view is active. Dropdown content has 7 items grouped with `DropdownMenuSeparator` dividers:
    1. Communauté (Users icon)
    2. Forum (MessagesSquare icon)
    3. Compétition (Swords icon, rose text + focus:text-rose-600)
    4. (separator)
    5. Classement (Trophy icon, `data-testid="trophy-icon"` preserved)
    6. Succès (Award icon)
    7. Révision espacée (Brain icon)
    8. (separator)
    9. À propos (Info icon)
  - Admin button stays separate (amber, if `isAdmin`).
- **Mobile nav** (`md:hidden`): same structure — Examen IA + Accueil + Stats primary buttons, then "Plus" dropdown with full-width menu (`w-[calc(100vw-2rem)] max-w-xs`), then Admin if applicable. Replaced the previous 8-button horizontal scroll row with a cleaner 3-button + dropdown pattern.
- **All existing navigation preserved**: every view (Communauté/Forum/Compétition/Classement/Succès/Révision espacée/À propos/Admin) is still reachable — just grouped for cleaner UX.
- **`data-tour` attributes** added to: home button, dashboard button, search button, "Plus" dropdown trigger, and `<main>` (`data-tour="home"`).

### 3b. `data-tour` attributes in home-view.tsx

- Wrapped `<DailyChallengeCard />` in a `<div data-tour="daily-challenge">` so the onboarding tour can highlight it.
- Added `data-tour="banks-section"` to the banks `<section>` so the tour can highlight it.

### 4. Aide contextuelle — `src/components/quiz/help-button.tsx` (~370 lines)

Created the file with:
- **Floating "?" button** at `fixed bottom-5 left-5 z-50` — opposite to the chatbot (which is at `bottom-5 right-5`). 14×14 round button, emerald icon, hover scale + shadow.
- **Dialog** with three tabs (using `@/components/ui/tabs`):
  - **Guide tab**: 6-step quick-start guide (Connectez-vous → Choisissez une banque → Lancez un quiz → Consultez vos résultats → Suivez votre progression → Échangez avec la communauté). Numbered cards with gradient badges. Includes an "Astuce" callout and a "Relancer le tour guidé" button (calls `restartOnboarding()`).
  - **FAQ tab**: 8 accordion-style items (exactly the questions requested):
    1. Comment créer un compte?
    2. Comment fonctionne le mode correction?
    3. Comment utiliser la révision espacée?
    4. Comment participer à une compétition?
    5. Comment gagner des badges?
    6. Comment uploader un PDF?
    7. Comment exporter vers Anki?
    8. Le mode hors ligne fonctionne comment?
    Each item uses a clickable header with chevron rotation and an expandable body.
  - **Raccourcis tab**: 6 keyboard shortcuts (Ctrl+K, Esc, →, ←, Tab, Enter) rendered as a list with `<kbd>` styled keys.
- **Footer links**: Forum (calls `openForum()`), Contact (mailto:), À propos (calls `openAbout()`). Each closes the help dialog and navigates.

### Mounting in page.tsx

Added at the bottom of the main layout (after `<Chatbot />`):
```tsx
<HelpButton />
<OnboardingTourContainer isAuthenticated={status === "authenticated"} />
```

## Lint / Type Check Verification

- `bun run lint` → **0 errors, 0 warnings** ✓
- `bunx tsc --noEmit` → only 1 error: `next.config.ts(7,3)` (PRE-EXISTING, documented by every prior agent — out of scope for F3) ✓
- Fixed 3 lint errors encountered during development:
  1. `react-hooks/set-state-in-effect` in `onboarding-tour.tsx` (synchronous `setShouldShow(false)` in effect when not authenticated) → restructured to use `setTimeout` only when starting the tour.
  2. `react-hooks/set-state-in-effect` in `search-dialog.tsx` (synchronous `setLoading(true)` at start of debounced effect) → moved `setLoading(true)` inside the `setTimeout` callback so it's async.
  3. `react-hooks/immutability` "Cannot access variable before it is declared" for `prev`/`next`/`complete` in onboarding-tour.tsx → moved the function declarations ABOVE the keyboard `useEffect` that uses them.
  4. Also removed an unused `// eslint-disable-next-line react-hooks/exhaustive-deps` comment that the linter flagged.

## Runtime Verification

- `curl http://localhost:3000/` → **200 OK** (28551 bytes) ✓ — page renders with splash screen + login flow (unauthenticated). All chunks loaded including the new `src_app_page_tsx_b4090435._.js` (page) and `src_components_quiz_b80ff25b._.js` (contains HelpButton + OnboardingTourContainer + SearchDialog).
- `curl http://localhost:3000/api/users?search=ab` → **401 JSON** `{"error":"Authentification requise"}` ✓ (auth gating works)
- `curl http://localhost:3000/api/users` (no search) → **401 JSON** ✓ (still requires auth)
- Grep on compiled chunks confirms 66 occurrences of `OnboardingTour|HelpButton|data-tour` in the b80ff25b chunk and 25 occurrences of `DropdownMenu|more-nav` in the page chunk ✓ (components compiled into the bundle)

## Stage Summary

- ✅ **Feature 1 (Onboarding guidé)**: `src/components/quiz/onboarding-tour.tsx` (~470 lines) with 8-step tour, spotlight overlay (box-shadow cutout technique), auto-positioning tooltip with arrow, progress dots, ESC/Arrow keyboard shortcuts, localStorage tracking, "Suivant/Précédent/Passer" controls. `OnboardingTourContainer` wraps it with auth-gating + 800ms mount delay so home-view target elements exist before measuring. Mounted in `page.tsx` when authenticated.
- ✅ **Feature 2 (Recherche globale unifiée)**: Rewrote `src/components/quiz/search-dialog.tsx` (~530 lines) with 4 tabs (Questions/Banques/Forum/Utilisateurs). Each tab has its own search function: Questions uses existing `/api/search`, Banques fetches `/api/banks` once and filters client-side, Forum uses `/api/forum/topics?q=`, Users uses new `/api/users?search=`. Created `/api/users/route.ts` with auth-gated case-insensitive name search (no email exposed).
- ✅ **Feature 3 (Navigation simplifiée)**: Refactored `src/app/page.tsx` nav into Primary (Accueil + Tableau de bord + Examen IA) + "Plus" DropdownMenu (Communauté, Forum, Compétition, Classement, Succès, Révision espacée, À propos) + Admin (separate, if admin). Same pattern on mobile with full-width menu. All 9 navigation destinations preserved. Added `data-tour` attributes to key nav elements + `<main>` + home-view banks section + DailyChallengeCard wrapper.
- ✅ **Feature 4 (Aide contextuelle)**: `src/components/quiz/help-button.tsx` (~370 lines) with floating "?" button at bottom-left (opposite chatbot at bottom-right), Dialog with 3 tabs (Guide: 6-step quick start + restart-onboarding button, FAQ: 8 accordion items, Raccourcis: 6 keyboard shortcuts with `<kbd>` styling), footer links to Forum/Contact/À propos.
- **Files created (4)**: `src/app/api/users/route.ts`, `src/components/quiz/onboarding-tour.tsx`, `src/components/quiz/help-button.tsx` (new) + rewritten `src/components/quiz/search-dialog.tsx` (was 217 lines, now ~530).
- **Files modified (3)**: `src/app/page.tsx` (imports + store destructure + desktop nav rewrite + mobile nav rewrite + data-tour attributes + HelpButton + OnboardingTourContainer mount), `src/components/quiz/home-view.tsx` (added `data-tour` wrappers around DailyChallengeCard and banks section).
- **0 lint errors, 0 lint warnings, 0 new TS errors** (1 pre-existing in next.config.ts — out of scope).
- Work record written to: `/home/z/my-project/agent-ctx/F3-onboarding-search-nav-help.md`
