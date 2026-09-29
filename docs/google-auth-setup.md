# Google Sign-in (Supabase + NextAuth) — guide de configuration

Ce guide active le bouton **« Continuer avec Google »** de QuizExam BF.
L'application utilise **NextAuth v4** (strategy JWT) avec votre base
**Supabase (Postgres via Prisma)** : le compte Google est relié
automatiquement au compte local existant ayant le **même email** (l'utilisateur
récupère sa progression, ses badges et son code de parrainage), sinon un
nouveau compte VISITOR est créé.

## 1. Créer les identifiants OAuth dans Google Cloud Console

1. Ouvrez [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials).
2. Créez un projet (ex. `quizexam-bf`) → **Créer des identifiants → ID client OAuth**.
3. Type d'application : **Application Web**.
4. **Origines JavaScript autorisées** :
   - `http://localhost:3000` (dev local)
   - `https://quizexam-bf.app` (remplacez par votre domaine Vercel réel)
5. **URI de redirection autorisés** :
   - `http://localhost:3000/api/auth/callback/google`
   - `https://quizexam-bf.app/api/auth/callback/google`
6. Notez le **GOOGLE_CLIENT_ID** (finit par `.apps.googleusercontent.com`)
   et le **GOOGLE_CLIENT_SECRET**.

> Écran de consentement : configurez-le en mode « Externe » avec les scopes
> par défaut (`email`, `profile`, `openid`). Ajoutez votre email comme
> utilisateur test si l'app reste en mode « Test ».

## 2. Déclarer les variables sur Vercel

| Variable | Valeur |
|---|---|
| `GOOGLE_CLIENT_ID` | le client ID Google |
| `GOOGLE_CLIENT_SECRET` | le client secret Google |

Et vérifiez que `NEXTAUTH_URL` (domaine de prod) et `NEXTAUTH_SECRET` sont
déjà définis — requis pour un retour OAuth fiable.

## 3. Appliquer la migration Prisma sur Supabase

Le schéma ajoute trois colonnes optionnelles (aucune donnée perdue) :

```bash
npx prisma db push        # applique googleId / educationLevel / onboardingDone
```

## 4. C'est tout

- Sans ces variables, le provider Google n'est pas enregistré et **le bouton
  ne s'affiche pas** (détection via `GET /api/auth/providers`).
- Dès que les variables sont posées et le projet redéployé, le bouton
  apparaît sur la landing et dans le dialogue Connexion/Inscription.

## Rattachement de compte — comment ça marche

`src/lib/auth.ts` → `signIn` callback :
1. L'utilisateur revient de Google avec son email vérifié.
2. On cherche un User Prisma avec ce email :
   - **trouvé** → on relie `googleId` (le compte existant est conservé) ;
   - **absent** → on crée un VISITOR (mot de passe aléatoire inutilisable,
     code de parrainage généré) et on envoie l'email de bienvenue Brevo.
3. Le JWT stocke l'**identifiant local** + le rôle, donc toutes les
   fonctionnalités (sessions, XP, favoris…) fonctionnent comme d'habitude.
