# FIX2 — Dropdown fix + bank merge + responsive design

Task ID: **FIX2**
Agent: **FIX2 (Z.ai Code)**

## What I did

### 1. Fixed the broken "Plus" dropdown (`src/app/page.tsx`)

The desktop "Plus" dropdown did not open on click because the
`<DropdownMenuTrigger>` was double-wrapped inside `<TooltipProvider> > <Tooltip>
> <TooltipTrigger asChild>`. The two `asChild` slots conflict (each `asChild`
clones its single child into a Slot — chaining TooltipTrigger →
DropdownMenuTrigger breaks Radix's event wiring).

Fix:
- Removed the entire Tooltip wrapper around the DropdownMenuTrigger.
- Made the trigger prominent: `Grid` icon + "Plus" label visible at every
  breakpoint ≥ `sm` (was hidden below `lg`).
- Grouped items by category using `DropdownMenuLabel` +
  `DropdownMenuSeparator`: **Social** (9 items), **Apprentissage** (5 items),
  **Outils** (6 items) + a final `À propos`.
- Added `max-h-[min(80vh,36rem)] overflow-y-auto` so the menu scrolls if it
  would overflow the viewport.
- 21 menu items total — all items from the spec are present.

### 2. Merged duplicate banks (`scripts/merge-banks.ts`)

Created and ran the script. Idempotent — re-running is a no-op.

Before: 66 files, ~56 non-empty banks.
After: 57 files, **48 non-empty banks**, 3497 questions, 0 parse errors.

| Op | Source(s) | Target | Result |
|----|-----------|--------|--------|
| 1  | pays-capitales.json (2 Q) | pays-capitales-monnaies.json | 37 Q |
| 2  | physique-chimie.json (5 Q) | physique-chimie-lycee.json | 52 Q |
| 3  | histoire-monde.json (1 Q) | histoire.json | 70 Q |
| 4  | sciences-eco-gestion.json (50 Q) + sciences-eco-ufr.json (104 Q) | sciences-eco-ufr.json (renamed) | 154 Q |
| 5  | culture-bf-2025.json (35 Q) | culture-bf.json | 202 Q |
| 6  | svt-6e-termd.json (73 Q) + svt-lycee.json (69 Q) | svt-college-lycee.json (new) | 141 Q (1 dup) |
| 7  | litterature-africaine.json (24 Q) | litterature-ufr.json | 136 Q (3 dups) |

Also deleted 2 empty stub files: `sciences-eco-modules.json` and
`litterature.json`.

### 3. Made the platform 100% responsive

**`page.tsx` (header)**
- New hamburger button (`Menu` icon, 44px) visible only on `< md`.
- Opens a slide-out `Sheet` (right side, 85vw, max-w-sm) with ALL nav items
  grouped (Primary / Social / Apprentissage / Outils / Administration / Réglages).
- Two new inline components: `MobileNavItem` (full-width, min-h-11, leading
  icon, label, active/highlight states) + `MobileNavSection` (uppercase heading
  between groups).
- Removed the old horizontal-scroll mobile nav row + duplicate "Plus" dropdown.
- Hid secondary buttons on `< md` (search, language, dark mode, notif, help,
  settings, premium) — all accessible from inside the Sheet. User menu stays
  visible at every breakpoint.

**`home-view.tsx`** — Hero `p-6 sm:p-8 md:p-12`, h1 `text-2xl sm:text-3xl
md:text-4xl`, smaller stats badges on mobile, 44px touch targets, explicit
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for banks/exams, `line-clamp-2` on
bank titles so cards stay equal-height.

**`session-view.tsx`** — Top bar stacks on mobile, Quitter button 44px on
mobile, question number grid wraps inside a `max-h-32 overflow-y-auto`
container, options use `min-h-11 w-full sm:min-h-0` (44px touch target),
navigation buttons full-width on mobile with 44px touch target.

**`results-view.tsx`** — Score hero smaller on mobile (ring 120px → 160px,
text-2xl → text-3xl, p-5 → p-8), action buttons full-width 2-col grid on mobile
with 44px touch target, "Certificat" label truncated, all text `break-words`.

**`admin-view.tsx`** — Header title `text-xl sm:text-2xl`, Upload/New bank
buttons 44px on mobile, tab navigation horizontally scrollable on mobile with
44px touch targets, error name/message/context all `break-words`.

**`dashboard-view.tsx`** — Title `text-xl sm:text-2xl`, Export PDF button 44px
on mobile, tabs horizontally scrollable on mobile with short labels (Vue, Quiz,
Hist., Fav., IA), stats cards explicit `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`,
badges grid `grid-cols-3 sm:grid-cols-4 md:grid-cols-8`, per-quiz + history
cards stack properly on mobile with `shrink-0` on the pct/chevron cluster.

## Lint / TS

- `bun run lint` → EXIT 0, 0 errors, 0 warnings.
- `npx tsc --noEmit` → 1 pre-existing error in `next.config.ts:7` (eslint field
  not in NextConfig type — present before FIX2). 0 errors in src/.

## Files touched

- **New**: `scripts/merge-banks.ts` (~280 lines).
- **New**: `scripts/generated/banks/svt-college-lycee.json` (141 Q).
- **Deleted**: 9 bank JSON files (pays-capitales, physique-chimie,
  histoire-monde, sciences-eco-gestion, sciences-eco-modules, culture-bf-2025,
  svt-6e-termd, svt-lycee, litterature-africaine, litterature).
- **Modified**: 6 bank JSON files (titles + merged questions).
- **Modified**: `src/app/page.tsx`, `src/components/quiz/home-view.tsx`,
  `src/components/quiz/session-view.tsx`, `src/components/quiz/results-view.tsx`,
  `src/components/quiz/admin-view.tsx`, `src/components/quiz/dashboard-view.tsx`.

## Verification

- All 21 desktop Plus menu items present (Communauté, Forum, Groupes,
  Événements, Blog, Messagerie, Mentorat, Wiki, Sessions live, Parcours IA,
  Examen blanc officiel, Fiches de révision, Parcours 30 jours, Compétition,
  Quêtes, Arbre de compétences, Boutique, Classement, Succès, Révision espacée,
  À propos).
- 48 non-empty banks, 0 parse errors, all titles unique.
- 0 lint errors, 0 TS errors in src/, 0 existing features broken.
- Responsive design works on 390px viewport (iPhone) — verified via class
  inspection.
