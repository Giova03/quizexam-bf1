# Déploiement APK — QuizExam BF (PWA → TWA)

Ce document décrit le chemin **officiel et sans serveur dédié** pour
transformer la plateforme en application Android (APK/AAB), avec
fonctionnement **hors connexion** pour la partie consultation/révision.

La plateforme est déjà une **PWA complète** (v16) :

| Brique | État | Fichier |
|---|---|---|
| Manifeste installable | ✅ | `public/manifest.json` (icônes PNG 192/512 + maskable) |
| Service worker | ✅ | `public/sw.js` (v3) : shell en cache-first, API GET network-first + repli cache, **mutations hors-ligne mises en file d'attente** (background sync `quizexam-replay`) |
| Icônes Android/iOS | ✅ | `public/icons/*` (générées par `scripts/generate-pwa-icons.mjs`) |
| Bannière d'installation | ✅ | `src/components/quiz/install-prompt.tsx` (Android + hint iOS) |
| Panneau hors-ligne | ✅ | `src/components/quiz/offline-manager-panel.tsx` |
| Asset links (TWA) | 🔶 template | `public/.well-known/assetlinks.json` (à compléter avec le SHA-256 du keystore) |

---

## 0. Ce qui marche déjà « sans rien faire de plus »

**Installation directe depuis Chrome Android** (aucun APK requis) :
1. Ouvrir https://quizexam-bf1-5tlh.vercel.app dans Chrome.
2. Menu ⋮ → **« Installer l'application »** (ou bannière intégrée de la
   plateforme).
3. L'application apparaît sur l'écran d'accueil, plein écran
   (`display: standalone`), avec l'icône émeraude.

**Hors connexion** : le service worker met en cache le shell (HTML/JS/CSS),
les banques consultées (`/api/banks`, détail banque) et les examens ; les
scores réalisés hors ligne sont **mis en file d'attente** puis rejoués
automatiquement au retour du réseau. La génération IA et le chat exigent
en revanche une connexion (elles appellent des API distantes).

## 1. Générer un vrai APK (TWA via Bubblewrap) — 20 minutes

Une TWA (Trusted Web Activity) enveloppe la PWA dans un APK signé — c'est
la voie recommandée par Google, sans écrire de code natif.

### Prérequis (une seule fois)
- **JDK 17** + **Android SDK** (ou Android Studio).
- Node 18+ (déjà le cas).
```bash
npm i -g @bubblewrap/cli
bubblewrap init   # télécharge JDK/SDK automatiquement si absents
```

### Étapes
```bash
# 1. Initialiser le projet TWA (répondre aux questions) :
bubblewrap init --manifest https://quizexam-bf1-5tlh.vercel.app/manifest.json

#    Paramètres clés :
#    - Domaine             : quizexam-bf1-5tlh.vercel.app
#    - Nom du package      : bf.quizexam.app   (à conserver pour toujours)
#    - Mode d'affichage    : standalone
#    - Splash              : couleur #10b981 (fond) — géré par le manifeste

# 2. Générer le keystore (conservé PRÉCIEUSEMENT, sans lui pas de mise à jour) :
bubblewrap update          # ou : keytool -genkeypair -v -keystore upload-keystore.jks -alias quizexam -keyalg RSA -keysize 2048 -validity 10000

# 3. Compiler :
bubblewrap build           # produit app-release-signed.apk + app-release-bundle.aab

# 4. Récupérer l'empreinte SHA-256 du keystore :
keytool -list -v -keystore android/app/upload-keystore.jks -alias quizexam | grep SHA256
```

### Étape cruciale — relier le site à l'app
Coller l'empreinte SHA-256 obtenue dans
`public/.well-known/assetlinks.json` (remplacer les `CHANGE_ME`, fixer
`package_name` = `bf.quizexam.app`), puis **pousser/redéployer**.
Vérification : https://quizexam-bf1-5tlh.vercel.app/.well-known/assetlinks.json
et https://developers.google.com/digital-asset-links/tools/generator

> Sans assetlinks valides, l'APK fonctionne mais affiche la barre d'URL
> (pas de plein écran « vrai app »). C'est le seul point à ne pas oublier.

### Tester l'APK
```bash
adb install app-release-signed.apk    # ou transférer le fichier sur le téléphone
```
Installable par simple ouverture du fichier (inconnu → autoriser) :
parfait pour la **distribution directe** aux candidats burkinabè sans Play
Store (APK partageable par WhatsApp/Telegram).

### Publier sur Google Play (optionnel)
1. Console Play → nouvelle app → package `bf.quizexam.app`.
2. Téléverser le `.aab` (Play App Signing).
3. Fiche : icône 512 PNG ✓ (déjà générée), bannière 1024×500, captures.
4. `prefer_related_applications` est déjà à `false` dans le manifeste.

## 2. Compiler une version « hors-ligne renforcée » (roadmap)

État actuel : shell + banques déjà consultées + examens sont disponibles
hors ligne ; révision espacée/quiz fonctionnent sur les données cachées.

Pour aller plus loin (prochaines itérations) :
1. **Précaching massif des banques** : bouton « Télécharger pour
   l'examen » qui `cache.addAll()` les banques choisies (JSON complets).
2. **IndexDB pour les sessions** : sauvegarde locale d'une session en
   cours (déjà amorcée par `offline-manager-panel`), reprise après
   coupure.
3. **Sélection des pages statiques** : `/privacy`, `/terms` ajoutées au
   `PRE_CACHE_URLS` pour consultation hors ligne.

## 3. Checklist finale avant distribution

- [ ] `assetlinks.json` complété avec le SHA-256 réel + déployé.
- [ ] APK testé : ouverture hors ligne, quiz, file de sync au retour réseau.
- [ ] Keystore sauvegardé (2 emplacements + mot de passe en coffre).
- [ ] Version bumpée (`package.json`) avant chaque rebuild TWA.
- [ ] Numéro `versionCode` incrémenté (`bubblewrap update`).

---
*Généré v16 — à jour avec l'infrastructure PWA réelle du dépôt.*
