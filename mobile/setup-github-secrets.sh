#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# QuizExam BF — migration du keystore vers les GitHub Secrets
#
# Le workflow .github/workflows/build-apk.yml utilise, PAR ORDRE DE PRIORITÉ :
#   1. les secrets GitHub : ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD,
#      ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD ;
#   2. à défaut, le keystore committé dans mobile/keystore/.
#
# Une fois ce script exécuté (une seule fois) avec un token GitHub disposant du
# scope `repo`, vous pouvez retirer mobile/keystore/ du dépôt public :
#   git rm -r mobile/keystore && git commit -m "chore: retirer keystore (secrets GH)" && git push
#
# Usage :  GH_TOKEN=github_pat_xxx ./setup-github-secrets.sh
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="${REPO:-Giova03/quizexam-bf1}"
KEYSTORE="${KEYSTORE:-keystore/quizexam-release.jks}"
KEYSTORE_PASS="${KEYSTORE_PASS:-QuizExamAPK@2026}"
KEY_ALIAS="${KEY_ALIAS:-quizexam}"
KEY_PASS="${KEY_PASS:-QuizExamAPK@2026}"

command -v python3 >/dev/null || { echo "python3 requis"; exit 1; }
python3 -c 'import nacl' 2>/dev/null || { echo "pyNaCl requis : pip install pynacl"; exit 1; }
: "${GH_TOKEN:?Définissez GH_TOKEN avec un token GitHub (scopes: repo)}"

B64=$(base64 -w0 "$KEYSTORE")

python3 - "$REPO" "$B64" "$KEYSTORE_PASS" "$KEY_ALIAS" "$KEY_PASS" << 'PYEOF'
import base64, json, sys, urllib.request
from nacl import encoding, public

repo, b64, kpass, alias, kpass2 = sys.argv[1:6]

def api(path, data=None, method="GET"):
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        data=json.dumps(data).encode() if data else None,
        headers={
            "Authorization": f"Bearer {GH_TOKEN_ENV}",
            "Accept": "application/vnd.github+json",
        },
        method=method,
    )
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return json.loads(body) if body else {}

import os
GH_TOKEN_ENV = os.environ["GH_TOKEN"]

pk = api(f"/repos/{repo}/actions/secrets/public-key")
key = public.PublicKey(pk["key"].encode(), encoding.Base64Encoder())
box = public.SealedBox(key)

def encrypt(secret):
    return base64.b64encode(box.encrypt(secret.encode())).decode()

for name, value in {
    "ANDROID_KEYSTORE_BASE64": b64,
    "ANDROID_KEYSTORE_PASSWORD": kpass,
    "ANDROID_KEY_ALIAS": alias,
    "ANDROID_KEY_PASSWORD": kpass2,
}.items():
    api(f"/repos/{repo}/actions/secrets/{name}",
        {"encrypted_value": encrypt(value), "key_id": pk["key_id"]},
        method="PUT")
    print(f"✓ secret {name} défini")
print("\nSecrets installés. Vous pouvez maintenant retirer mobile/keystore/ du dépôt :")
print("  git rm -r mobile/keystore && git commit -m 'chore: keystore migré vers secrets' && git push")
PYEOF
