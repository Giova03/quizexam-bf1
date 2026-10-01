# Google Sign-in (QuizExam BF) — guide de configuration V8

Ce guide active le bouton **« Continuer avec Google »** de QuizExam BF.
Depuis la **V8**, l'application propose **deux chemins de connexion Google**
qui coexistent — le premier fonctionne **sans client secret** :

| Chemin | Prérequis | Statut |
|---|---|---|
| **1. Google Identity Services (GIS)** — bouton officiel Google + popup, ID Token vérifié côté serveur | Le **Client ID** uniquement | ✅ **Actif dès maintenant** (Client ID intégré en fallback public) |
| **2. OAuth redirect NextAuth** — flux classique `signIn("google")` | Client ID **+ Client Secret** en variables Vercel | Optionnel, s'active automatiquement quand le secret est posé |

Les deux chemins utilisent **exactement la même logique de rattachement de
compte** (`findOrCreateGoogleUser` dans `src/lib/auth.ts`) : l'utilisateur
récupère sa progression, ses badges et son code de parrainage.

## 1. ✅ Action requise (5 minutes) — autoriser l'origine du site

Le Client ID fourni est **déjà intégré dans le code** (valeur publique par
nature). Il reste UNE étape indispensable dans Google Cloud Console :

1. Ouvrez [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials).
2. Sélectionnez le client OAuth `447645518029-6kv7hant8ogjo9lbto888hfimidp9mus…`
3. Dans **« Origines JavaScript autorisées »** (Authorized JavaScript origins),
   ajoutez :
   - `https://quizexam-bf1-5tlh.vercel.app` (production)
   - `http://localhost:3000` (développement local)
4. Cliquez **Enregistrer**, puis rechargez QuizExam BF (le popup Google met
   quelques minutes à prendre en compte le changement).

> ⚠️ Le flow GIS popup n'utilise **pas** d'« URI de redirection » : ce sont
> uniquement les **origines JavaScript** qui comptent. Si Google affiche
> « origine non autorisée », c'est cette étape qui est manquante — l'application
> affiche d'ailleurs un encart d'aide avec l'URL exacte à ajouter.

## 2. Sécurité — comment l'ID Token est validé (sans secret)

`src/lib/auth.ts` → provider NextAuth **`google-idtoken`** :

1. Le navigateur reçoit un **ID Token (JWT signé par Google)** via le popup GIS.
2. Le serveur vérifie la **signature** via l'endpoint officiel
   `https://oauth2.googleapis.com/tokeninfo` (Google seul détient les clés).
3. Vérifications locales strictes, en **fail-closed** :
   - `aud` = notre Client ID (le token est destiné à CETTE application) ;
   - `iss` ∈ { `accounts.google.com`, `https://accounts.google.com` } ;
   - `exp` non expiré ;
   - `email_verified` obligatoire (aucun compte créé depuis un email non vérifié).
4. Le compte local est alors créé ou relié par email (voir section 4).

Le **GOOGLE_CLIENT_SECRET reste inutile** pour ce chemin : il n'est requis que
par le flux OAuth « redirect » de NextAuth — tant qu'il n'est pas fourni, seul
le chemin GIS est actif, et c'est amplement suffisant.

## 3. (Optionnel) Activer aussi le flux OAuth redirect

Si vous obtenez le **GOOGLE_CLIENT_SECRET** :

| Variable Vercel | Valeur |
|---|---|
| `GOOGLE_CLIENT_ID` | `447645518029-6kv7hant8ogjo9lbto888hfimidp9mus.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | le secret du même client OAuth |

**URI de redirection autorisés** à ajouter dans Google Cloud Console :
- `https://quizexam-bf1-5tlh.vercel.app/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`

Dès le redéploiement, le provider NextAuth `google` s'enregistre et le bouton
custom bascule dessus automatiquement (détection via `GET /api/auth/providers`).

> Écran de consentement : mode « Externe », scopes par défaut
> (`email`, `profile`, `openid`). Ajoutez votre email comme utilisateur test si
> l'app reste en mode « Test ».

## 4. Rattachement de compte — comment ça marche

`src/lib/auth.ts` — `findOrCreateGoogleUser()` (partagé par les deux chemins) :
1. L'utilisateur se connecte avec son email Google **vérifié**.
2. On cherche un User Prisma avec cet email :
   - **trouvé** → on relie `googleId` (le compte existant est conservé :
     sessions, XP, badges, code de parrainage) ;
   - **absent** → on crée un **VISITOR** (mot de passe aléatoire inutilisable,
     code de parrainage généré) et on envoie l'email de bienvenue Brevo.
3. Le JWT stocke l'**identifiant local** + le rôle : toutes les fonctionnalités
   (banques, sessions, favoris, tour de contrôle admin…) fonctionnent comme
   d'habitude.

## 5. Dépannage express

| Symptôme | Cause probable | Correction |
|---|---|---|
| Popup « origine non autorisée » | Origine absente dans Google Cloud Console | Section 1, étape 3 |
| Bouton Google absent | Script GIS bloqué (extension/réseau) | Désactivez l'extension ou réessayez — le fallback custom prend le relais |
| « La connexion Google a échoué » | Token expiré ou rejeté par la validation serveur | Rechargez la page et recommencez |
| Compte non relié à l'ancien | Emails différents (ex. `@gmail.com` vs autre) | Les comptes se lient UNIQUEMENT à email identique |
