# mobile/ — Application Android QuizExam BF (TWA)

Projet TWA (Trusted Web Activity) généré par Bubblewrap, wrapper Android de la
PWA `https://quizexam-bf1-5tlh.vercel.app`.

| Élément | Valeur |
|---|---|
| Package | `bf.quizexam.app` |
| Version courante | voir `twa-manifest.json` → `appVersion` / `appVersionCode` |
| minSdk / targetSdk | 21 / 36 |
| Keystore | `keystore/quizexam-release.jks` (alias `quizexam`) |

## Build automatique (recommandé)

Le workflow `.github/workflows/build-apk.yml` construit, signe et publie l'APK
en téléchargement cloud à chaque modification de `mobile/` sur `main` :

- **GitHub Releases** : https://github.com/Giova03/quizexam-bf1/releases
  - release roulante `mobile-latest` (mise à jour à chaque push main)
  - releases de version lors des tags `v*`
- **Artifacts** : onglet Actions du run correspondant.

### Production : migrer le keystore vers les GitHub Secrets

Le workflow utilise les secrets GitHub s'ils sont définis, sinon il retombe sur
le keystore committé (déposé ici pour que le cloud fonctionne immédiatement sur
ce dépôt public). Pour durcir :

```bash
GH_TOKEN=<votre PAT scope repo> ./setup-github-secrets.sh
# puis :
git rm -r keystore/ && git commit -m "chore: keystore migré vers secrets GH" && git push
```

Secrets utilisés : `ANDROID_KEYSTORE_BASE64` (keystore encodé base64),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Build local

```bash
# Prérequis : JDK 21 (avec javac) + Android SDK (ANDROID_HOME)
./gradlew :app:assembleRelease --no-daemon
BT="$(ls -d "$ANDROID_HOME/build-tools"/* | sort -V | tail -1)"
"$BT/zipalign" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk aligned.apk
"$BT/apksigner" sign --ks keystore/quizexam-release.jks --ks-key-alias quizexam \
  --ks-pass pass:'QuizExamAPK@2026' --key-pass pass:'QuizExamAPK@2026' \
  --out quizexam-bf.apk aligned.apk
```

## Monter la version

Éditer `twa-manifest.json` (`appVersion`, `appVersionCode`), puis rebuild.
Le nom du fichier publié suit automatiquement la version
(`quizexam-bf-v{appVersion}.apk`). Après une nouvelle version : copier l'APK
dans `public/apk/` et mettre à jour `APK_URL` dans
`src/components/quiz/landing-view.tsx`.

## Régénérer le projet depuis le manifest web

```bash
npx @bubblewrap/cli update --skipVersionUpgrade
```
