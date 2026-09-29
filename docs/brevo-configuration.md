# Emails transactionnels Brevo — guide de configuration

Toute la plomberie est déjà en place. Il **suffit de fournir les clés** :
aucun code à modifier.

## 1. Ce qui est déjà implémenté

| Élément | Fichier |
|---|---|
| Gateway Brevo (API HTTPS `/v3/smtp/email`) | `src/lib/brevo.ts` |
| Templates HTML brandés (confirmation d'inscription) | `src/lib/email-templates.ts` |
| Routage de tous les emails + journal EmailLog | `src/lib/email-service.ts` |
| Envoi à l'inscription (email + mot de passe) | `src/app/api/auth/signup/route.ts` |
| Envoi à la première connexion Google | `src/lib/auth.ts` (callback `signIn`) |

## 2. Obtenir la clé

1. Créez/connectez-vous sur [brevo.com](https://www.brevo.com) (plan gratuit :
   300 emails/jour).
2. **Profil → SMTP & API → Clés API → Générer une nouvelle clé API**.
3. Notez la clé (format `xkeysib-...`).

## 3. Déclarer les variables (Vercel + `.env` local)

| Variable | Exemple | Rôle |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-...` | Authentification API (obligatoire) |
| `BREVO_SENDER_EMAIL` | `no-reply@quizexam-bf.app` | Expéditeur — doit être **validé dans Brevo** (Senders) |
| `BREVO_SENDER_NAME` | `QuizExam BF` | Nom affiché (optionnel) |
| `NEXT_PUBLIC_APP_URL` | `https://quizexam-bf.app` | URL utilisée dans les boutons des emails |

## 4. Comportement selon la configuration

- **Sans clé** : aucun envoi, l'email est journalisé en base
  (table `EmailLog`, statut `logged_no_brevo`) — le développement ne casse pas.
- **Avec clé** : envoi réel via Brevo ; statuts `sent`, `failed_http_*`,
  `failed_network` visibles dans l'historique admin. Timeout 10 s, jamais
  bloquant pour l'inscription.

## 5. Template de confirmation

L'email « Bienvenue sur QuizExam BF — votre compte est confirmé » contient :
bannière dégradée émeraude/or, liste des fonctionnalités débloquées, CTA
« Commencer maintenant » vers `NEXT_PUBLIC_APP_URL`, pied de page avec vos
coordonnées. Version texte incluse (clients sans HTML).

Pour tester sans attendre : `curl -X POST https://quizexam-bf.app/api/auth/signup
-H 'content-type: application/json' -d '{"email":"vous@test.com","name":"Test","password":"secret6"}'`
puis vérifiez la boîte de réception.
