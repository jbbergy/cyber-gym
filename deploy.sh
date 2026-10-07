#!/usr/bin/env bash
# Déploie Cyber Gym sur le VPS : envoi des sources, build de l'image Docker
# sur le serveur, redémarrage du conteneur, puis vérification de santé.
# Première fois : scripts/server-setup.sh
set -euo pipefail

SERVER=${SERVER:-jibhey.fr}
DEST=/srv/apps/cyber-gym
URL=${URL:-https://gym.jibhey.fr}

cd "$(dirname "$0")"

echo "→ envoi des sources vers $SERVER:$DEST"
rsync -az --delete \
  --exclude .git \
  --exclude .claude \
  --exclude node_modules \
  --exclude client/dist \
  --exclude client/dev-dist \
  --exclude server/data \
  --exclude .env \
  --exclude '.env.bak-*' \
  --exclude .DS_Store \
  ./ "$SERVER:$DEST/"

echo "→ build et redémarrage du conteneur"
ssh "$SERVER" "cd $DEST && test -f .env || { echo 'Pas de .env : lancer scripts/server-setup.sh' >&2; exit 1; }; docker compose up -d --build --remove-orphans && docker image prune -f >/dev/null"

echo "→ vérification de $URL"
for i in $(seq 1 30); do
  if curl -fsS "$URL/api/health" >/dev/null 2>&1; then
    echo "✓ en ligne : $URL"
    exit 0
  fi
  sleep 2
done
echo "✗ $URL/api/health ne répond pas — logs :" >&2
ssh "$SERVER" "docker logs --tail 50 cyber-gym" >&2
exit 1
