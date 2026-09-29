# Base de données — synchronisation du schéma & accès admin

> **Problème résolu par ce guide** : `The column User.googleId does not exist in the current database`
> (impossible de se connecter ou de s'inscrire après la V3/V4).

## Ce qui s'est passé

Les versions V3/V4 ont ajouté des colonnes au schéma Prisma (`User.googleId`,
`User.educationLevel`, `User.onboardingDone` pour la connexion Google et
l'onboarding). La base Supabase de production n'avait **pas encore** reçu ces
colonnes : Prisma génère des requêtes qui les incluent, donc **chaque** lecture
ou écriture d'un utilisateur échouait — connexion, inscription, admin.

## Solution 1 — Automatique (recommandée, rien à faire)

Le build Vercel synchronise désormais la base **à chaque déploiement** :

```
"build": "node scripts/migrate-on-build.cjs && next build"
```

`prisma db push` est idempotent et **additif uniquement** : sans
`--accept-data-loss`, Prisma refuse tout changement destructif — le build
échoue visiblement plutôt que d'endommager la base.

→ Au prochain déploiement après le push de ce correctif, la base est à jour et
la connexion/inscription remarchent sans aucune action.

## Solution 2 — Immédiate via Supabase SQL Editor (30 secondes)

Si vous ne voulez pas attendre le redéploiement :

1. Ouvrez **Supabase Dashboard** → votre projet → **SQL Editor** → **New query**
2. Collez tout le contenu de [`prisma/manual-migration-2026-09.sql`](../prisma/manual-migration-2026-09.sql)
3. Cliquez **Run** — 100 % idempotent, aucune donnée n'est modifiée ou perdue.

## Réinitialiser le mot de passe admin

### Option A — SQL Editor (le plus rapide)

Collez ceci dans Supabase → SQL Editor → Run (le hash correspond au mot de
passe `QuizExam@2026-BF`, pensez à le changer ensuite dans Profil) :

```sql
UPDATE "User"
SET "passwordHash" = '$2b$10$eqs8h5Ki7uQidD/IYbEPNe4i9dEUXld1cd89CilXenO18ZF7ySy/S',
    "role" = 'ADMIN'
WHERE "email" = 'giobamos03@gmail.com';
```

Résultat attendu : `UPDATE 1`. Si `UPDATE 0`, le compte n'existe pas — créez-le :

```sql
INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "referralCode")
VALUES (
  'admin-' || substr(md5(random()::text), 1, 20),
  'giobamos03@gmail.com',
  'Administrateur',
  '$2b$10$eqs8h5Ki7uQidD/IYbEPNe4i9dEUXld1cd89CilXenO18ZF7ySy/S',
  'ADMIN',
  'ADMIN0001'
);
```

### Option B — Ligne de commande

```bash
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@db.VOTRE_REF.supabase.co:5432/postgres" \
  node scripts/reset-admin-password.cjs
```

> L'URL de connexion se trouve dans **Supabase → Project Settings → Database →
> Connection string → URI** (utilisez le port direct **5432**, pas le pooler 6543).

## Vérification finale

1. Rechargez le site (les colonnes existent → plus d'erreur Prisma).
2. Connectez-vous : `giobamos03@gmail.com` / mot de passe défini ci-dessus.
3. Le menu admin (« Administration ») doit apparaître.

## Dépannage

| Symptôme | Cause | Correctif |
|---|---|---|
| Build Vercel échoue sur `db push` | URL pooler `:6543` ou base injoignable | Utilisez la Solution 2, puis redéployez |
| `UPDATE 0` sur le reset admin | Compte absent | Utilisez l'`INSERT` ci-dessus |
| Connexion OK mais erreur Prisma persiste | Cache navigateur / old build | Ctrl+Shift+R, vérifiez que le déploiement est bien le dernier |
