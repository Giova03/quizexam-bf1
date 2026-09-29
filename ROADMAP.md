# ROADMAP — QuizExam BF1

> **Objectif de ce document** : qu'aucune session de travail ne démarre jamais
> à zéro. Si vous perdez une conversation avec votre assistant IA, relisez ce
> fichier + `worklog.md` + `git log --oneline -20` : vous avez tout l'état du
> projet. Mis à jour le **2026-09-30** (session P3).

---

## 1. Le projet en une page

- **Quoi** : plateforme de révision et de préparation aux examens (Burkina
  Faso) — banques de QCM, sessions de quiz, examens blancs, tuteur IA,
  répétition espacée (SM-2), gamification (XP, niveaux, ligues, défis,
  quêtes), forum par matière, groupes d'étude, événements, blog, certificats,
  mentorat, parrainage, abonnements freemium, mode hors-ligne (PWA), i18n,
  import/génération de QCM depuis PDF/Word.
- **Stack** : Next.js 16 (App Router) · React 19 · TypeScript strict ·
  Tailwind 4 · shadcn/ui · Prisma 6 · NextAuth (JWT) · Zod · Zustand.
- **Production** : **Vercel** (hébergement) + **Supabase PostgreSQL** (base).
- **Repo** : `github.com/Giova03/quizexam-bf1` (branche `main`).
- **Taille** : ~273 fichiers TS/TSX, 48 groupes de routes API, 20 modèles Prisma.

### Variables d'environnement (Vercel)

| Variable | Rôle | Statut |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL (pooler) | requis |
| `NEXTAUTH_SECRET` | signature des sessions JWT | **à définir en prod** (sinon fallback public + warning au boot) |
| `ADMIN_EMAIL` | email du compte admin initial | défaut : `giobamos03@gmail.com` |
| `ADMIN_PASSWORD` | mot de passe admin initial | **désormais requis** pour créer l'admin (plus de mot de passe en dur dans le code — corrigé en P2) |

### Base de données

Workflow : **`prisma db push`** (pas de dossier `migrations/`). Après chaque
modification de `prisma/schema.prisma` :

```bash
# local d'abord, puis contre Supabase :
DATABASE_URL="postgresql://...supabase..." npx prisma db push
```

---

## 2. Architecture V2 — où nous en sommes

Refonte en couches démarrée le 29/09/2026. Objectif : sortir la logique métier
des routes API, la rendre testable, et uniformiser sécurité & audit.

```
src/
├── app/api/...                    # Routes HTTP minces (auth, rate-limit, mapping HTTP)
├── server/
│   ├── application/
│   │   ├── quiz/                  # ✅ P2 — cas d'usage session (get/submit/complete/start)
│   │   ├── content/               # ✅ P3 — list/get questions, banks, exams (+ cache listes)
│   │   └── subscription/          # ✅ P3 — overview, set-tier, check-quota (quota quotidien)
│   ├── domain/                    # ✅ P1/P3 — logique métier PURE (zéro framework)
│   │   ├── quiz/quiz-domain.ts            # scoring, state machine (derive/canAcceptAnswer P3), SM-2, XP
│   │   ├── questions/question-domain.ts   # lifecycle statuts, qualité, détection doublons
│   │   ├── questions/question-view.ts     # ✅ P3 — visibilité réponse/explication par rôle
│   │   ├── banks/bank-domain.ts           # ✅ P3 — filtre niveaux (joker TOUS)
│   │   └── subscription/subscription-domain.ts  # tiers, quotas freemium
│   └── infrastructure/
│       ├── repositories/          # ✅ P2/P3 — accès Prisma (sessions, audit, questions, banks, exams, subscription)
│       └── competition-store.ts   # ✅ P3 — store serveur (mode compétition)
├── shared/
│   ├── security/                  # ✅ P1/P2 — RBAC (6 rôles, 25+ permissions) + audit
│   └── stores/                    # ✅ P3 — stores CLIENT zustand (quiz, prefs, quests, favorites, spaced-repetition)
└── lib/                           # services transverses (auth, db, cache, limits-constants…)
```

### Phases

| Phase | Contenu | État |
|---|---|---|
| **P0** | Sécurisation immédiate : ownership sessions, masquage des corrections aux non-staff, export Anki protégé, seed désactivé en prod, admin-init protégé, checks TS/ESLint réactivés au build | ✅ 29/09 |
| **P1** | Domain layer pur (quiz, questions, subscription) + RBAC 6 rôles + module audit (localStorage, provisoire) | ✅ 29/09 |
| **P2** | **Audit log migré en base** (modèle `AuditLog` + API `/api/audit-log` + façade isomorphe) · **Couche application** (4 cas d'usage session) · **4 routes session rebranchées** · fix `correctAnswer2` · mot de passe admin hors du code · tests vitest (81) · CI GitHub · hygiène dépôt | ✅ 30/09 |
| **P3** | **Routes content rebranchées** (questions, banks, banks/[id], exams, exams/[id] — 5 routes) · **subscription rebranchée** (GET overview + POST tier, quota quotidien déplacé de lib vers application) · **state machine stricte** : réponses sur session terminée → 409 · domain : `question-view` (masquage réponse), `bank-domain` (joker TOUS), `deriveSessionStatus`/`canAcceptAnswer` · 4 nouveaux repositories Prisma · **stores déplacés** (zustand → `shared/stores/`, compétition → `infrastructure/`) · **unification des tests** : suite lib migrée vers vitest (136 tests), runner maison supprimé · fix alignement RBAC (SUPER_ADMIN visible staff) · tests morts supprimés (favorites.test, sm2.test) | ✅ 30/09 |
| **P4** | Audit trail branché sur TOUTES les mutations staff (questions, banks, users, reports) + onglet « Journal d'audit » dans l'admin (lecture `GET /api/audit-log`) · unifier les 2 implémentations SM-2 (store ISO-strings vs domaine Dates) via un adaptateur | ⏳ prochaine |
| **P5** | Paiement réel du premium : **FedaPay** (Orange/Moov Money BF) — webhook HMAC, passage `subscription: "premium"`, reçus email. Alternatives : Stripe (cartes) | ⏳ |
| **P6** | Observabilité prod : Sentry (erreurs), analytics sans données de santé/personnelles, healthcheck | ⏳ |
| **P7** | E2E (Playwright) sur les parcours critiques : signup → quiz → résultat → certificat | ⏳ |

### Décisions d'architecture (à respecter)

1. **Routes minces** : une route API ne fait que (a) rate-limit, (b) auth,
   (c) appeler un cas d'usage, (d) mapper le résultat en HTTP.
2. **Le domaine est pur** : ni Prisma, ni Next, ni React dans `src/server/domain/`.
3. **L'audit ne casse jamais rien** : une écriture d'audit en échec se dégrade
   en `console.warn` (jamais de 500 pour l'utilisateur).
4. **Identité d'audit serveur** : `/api/audit-log` POST dérive l'auteur de la
   session NextAuth — le body client n'a aucun droit sur l'identité.
5. **Compatibilité client** : les routes migrées renvoient **exactement** les
   mêmes JSON qu'avant (cf. `quiz-session-repository.ts`).

### Bugs corrigés en P2 (bonus)

- `PATCH /api/sessions/[id]/answers/[answerId]` évaluait `isCorrect` en
  ignorant `correctAnswer2` → les questions à double réponse étaient
  comptées fausses si l'élève choisissait la 2e réponse acceptée. Passé par
  `checkAnswer()` du domaine (gestion double réponse).
- Mot de passe admin en dur dans `src/lib/auth.ts` (public sur GitHub) →
  remplacé par `ADMIN_PASSWORD` ; sans la variable, la création d'admin est
  ignorée avec un warning (l'admin existant en prod n'est pas affecté).

### Comportement documenté (à ne pas « corriger » sans lire)

- `selectQuestions()` : si le pool filtré par difficulté est plus petit que
  `count`, on pioche `count` questions dans **tout** le pool (mélange de
  difficultés). Comportement historique, testé.
- **State machine stricte (P3)** : `PATCH .../answers` sur une session
  terminée renvoie désormais **409** `Session déjà terminée` (avant P3 :
  accepté). La synchro hors-ligne est sûre — elle crée toujours une session
  neuve avant de PATCHer. Côté serveur, la règle vit dans le domaine
  (`canAcceptAnswer(deriveSessionStatus(completedAt))`).
- `GET /api/questions` : le staff inclut désormais SUPER_ADMIN (alignement
  RBAC — le hardcode legacy l'omettait par oubli).
- Deux implémentations SM-2 coexistent (store ISO-strings pour
  localStorage, domaine Dates) — algorithmiquement identiques, unification
  prévue P4.

---

## 3. Qualité & CI

```bash
bun install                    # deps
bun run typecheck              # tsc --noEmit (0 erreur exigée)
bun run lint                   # ESLint (0 erreur exigée)
bun run test                   # vitest — domaine + sécurité + stores (136 tests)
bun run build                  # build prod (doit passer avant tout push)
```

- **CI GitHub Actions** (`.github/workflows/ci.yml`) : bun install →
  prisma generate → typecheck → lint → vitest, sur chaque push/PR vers
  `main`.
- **Règle de push** : les 4 vérifications ci-dessus doivent passer localement
  avant `git push`.

---

## 4. Hygiène du dépôt (fait en P2)

- Dépôt historiquement > 400 Mo (captures, vidéos marketing committées).
- `.gitignore` interdit désormais : `/*.png`, `/screenshots/`,
  `/marketing-video/`, `/download/` (fichiers retirés du suivi, conservés en
  local). `bun.lock` **reste** versionné.
- L'historique git garde l'ancien poids — si besoin d'un vrai slimming :
  `git filter-repo` (opération destructive, à faire un jour de calme).

---

## 5. Runbook « j'ai perdu la conversation »

1. `git log --oneline -20` → dernier état livré.
2. Lire ce fichier (§2 pour la phase en cours, §3 pour valider).
3. Lire `worklog.md` (journal détaillé des sessions, en bas = plus récent).
4. Relancer l'environnement : `bun install && bunx prisma generate`,
   puis les 4 vérifications du §3.
5. Reprendre la phase ⏳ suivante du tableau §2 — une phase = un lot committé
   avec un message structuré (voir les commits P0/P1/P2/P3 comme modèles).
6. Après un changement de schéma Prisma : **`prisma db push` contre Supabase**
   AVANT de déployer le code qui l'utilise (sinon dégradation gracieuse pour
   l'audit, erreur pour le reste).

### Déploiement

- Vercel redéploie à chaque push sur `main` (ou via dashboard).
- Ordre à respecter : (1) `prisma db push` sur Supabase, (2) push du code →
  build Vercel, (3) vérifier `/api/seed` renvoie 403 en prod.
