#!/usr/bin/env bash
# Safe Akira seller release: first --check, then explicit --apply.
set -Eeuo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || { echo 'Use --check or --apply'; exit 2; }
ROOT="${AKIRA_LIVE_ROOT:-/opt/akira}"
STAGE_PORT="${AKIRA_STAGE_PORT:-4302}"
BRANCH='fix/akira-ci-auth-20261025'
STAMP="$(date -u +%Y%m%d-%H%M%S)"
REVIEW="/opt/akira-seller-review-$STAMP-$$"
CONTAINER="akira-seller-review-$$"
IMAGE="akira-seller-review:$STAMP"
ORIGINS='https://api.soverixnet.online,https://voice.soverixnet.online,https://localhost,capacitor://localhost'
BACKUP=""
DEPLOY_STARTED=0
DONE=0
# IMPORTANT: never replace live web/src/app.js, web/admin.html,
# server/src/control.mjs, server/src/admin.html, APKs or credentials.
FILES=(server/src/server.mjs server/src/seller-wallet.mjs server/src/seller-admin.mjs
  server/src/game-bets.mjs web/src/seller-panel.js web/src/seller-directory.js
  web/src/wallet-sync.js web/src/wallet-safety.js web/src/game-overlay.js
  web/game-live.html web/admin-connected.html)
SAVE=("${FILES[@]}" web/index.html server/compose.yaml)

restore_live() {
  echo "RESTORING previous API and UI from $BACKUP"
  for f in "${SAVE[@]}"; do
    if [[ -f "$BACKUP/files/$f" ]]; then
      mkdir -p "$ROOT/$(dirname "$f")"
      cp -a "$BACKUP/files/$f" "$ROOT/$f"
    else
      rm -f -- "$ROOT/$f"
    fi
  done
  docker compose -f "$ROOT/server/compose.yaml" --project-directory "$ROOT/server" build akira-api &&
    docker compose -f "$ROOT/server/compose.yaml" --project-directory "$ROOT/server" up -d --no-deps akira-api ||
    echo "CRITICAL: automatic restore failed; backups at $BACKUP" >&2
}
finish() {
  result="$?"
  trap - EXIT
  if [[ "$result" -ne 0 && "$DEPLOY_STARTED" == 1 && "$DONE" == 0 ]]; then
    restore_live || true
  fi
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
  if [[ -d "$REVIEW" ]]; then
    git -C "$ROOT" worktree remove --force "$REVIEW" >/dev/null 2>&1 || true
  fi
  exit "$result"
}
trap finish EXIT
for c in git docker node npm curl python3; do
  command -v "$c" >/dev/null || { echo "Missing $c" >&2; exit 1; }
done
[[ -e "$ROOT/.git" && -f "$ROOT/server/compose.yaml" &&
   -f "$ROOT/secrets/postgres_password" ]] || { echo 'Server files/secret unavailable'; exit 1; }

echo '=== GET CANDIDATE (without pulling into live code) ==='
git -C "$ROOT" fetch origin "$BRANCH"
git -C "$ROOT" worktree add --detach "$REVIEW" "origin/$BRANCH"
echo "Review commit: $(git -C "$REVIEW" rev-parse HEAD)"
echo '=== GUARD EXISTING USER CUSTOMIZATIONS ==='
for f in "${FILES[@]}"; do
  [[ -f "$REVIEW/$f" ]] || { echo "Missing candidate $f"; exit 1; }
  if [[ -e "$ROOT/$f" ]]; then
    git -C "$ROOT" ls-files --error-unmatch "$f" >/dev/null 2>&1 ||
      { echo "CONFLICT: untracked live $f. Nothing changed."; exit 1; }
    git -C "$ROOT" diff --quiet HEAD -- "$f" ||
      { echo "CONFLICT: locally modified $f. Nothing changed."; exit 1; }
  elif git -C "$ROOT" ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "CONFLICT: tracked file locally deleted: $f"
    exit 1
  fi
done
[[ -f "$ROOT/web/index.html" ]] || { echo 'Missing original index.html'; exit 1; }
echo '=== CANDIDATE TESTS ==='
(cd "$REVIEW/server" && npm install --ignore-scripts --no-audit --no-fund && npm test)
for f in server/src/server.mjs web/src/seller-panel.js web/src/seller-directory.js \
  web/src/wallet-sync.js web/src/wallet-safety.js; do
  node --check "$REVIEW/$f"
done

echo '=== TEMPORARY READ-ONLY API SMOKE TEST ON LOCAL PORT ==='
docker build -q -t "$IMAGE" "$REVIEW/server" >/dev/null
docker run -d --rm --name "$CONTAINER" --network akira-private \
  -p "127.0.0.1:$STAGE_PORT:4301" --memory 192m --cpus 0.5 \
  --security-opt no-new-privileges:true --read-only --tmpfs /tmp \
  -v "$ROOT/secrets/postgres_password:/run/secrets/db_password:ro" \
  -e HOST=0.0.0.0 -e PORT=4301 -e PGHOST=akira-postgres \
  -e PGPORT=5432 -e PGUSER=akira -e PGDATABASE=akira_db \
  -e PGPASSWORD_FILE=/run/secrets/db_password \
  -e AKIRA_ALLOWED_ORIGINS="$ORIGINS" -e AKIRA_GAME_ENGINE_ENABLED=false \
  "$IMAGE" >/dev/null
READY=0
for attempt in $(seq 1 25); do
  if curl --max-time 3 -fsS "http://127.0.0.1:$STAGE_PORT/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
[[ "$READY" == 1 ]] || { docker logs --tail 25 "$CONTAINER"; echo 'Staging unhealthy; live untouched'; exit 1; }
AKIRA_API_BASE="http://127.0.0.1:$STAGE_PORT" node "$REVIEW/scripts/smoke-prod.mjs"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

if [[ "$MODE" == "--check" ]]; then
  echo 'PASS: Staging API, wallet permissions, and seller directory. Live app unchanged.'
  exit 0
fi

echo '=== BACKUP LIVE SOURCE AND DB BEFORE UPDATE ==='
BACKUP="$ROOT/backups/akira-seller-release-$STAMP"
mkdir -p "$BACKUP/files" "$BACKUP/database"
for f in "${SAVE[@]}"; do
  if [[ -f "$ROOT/$f" ]]; then
    mkdir -p "$BACKUP/files/$(dirname "$f")"
    cp -a "$ROOT/$f" "$BACKUP/files/$f"
  fi
done
docker exec akira-postgres pg_dump -U akira -d akira_db -Fc > "$BACKUP/database/akira-db.dump"
[[ -s "$BACKUP/database/akira-db.dump" ]] || { echo 'DB dump is empty; aborting'; exit 1; }
docker exec -i akira-postgres pg_restore --list < "$BACKUP/database/akira-db.dump" >/dev/null
echo "Backup: $BACKUP"

DEPLOY_STARTED=1
for f in "${FILES[@]}"; do
  mkdir -p "$ROOT/$(dirname "$f")"
  cp -a "$REVIEW/$f" "$ROOT/$f"
done

# Preserve the existing index page and its design; inject only missing scripts.
python3 - "$ROOT/web/index.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
scripts=[('src/app.js','src/game-overlay.js'),
 ('src/game-overlay.js','src/seller-panel.js'),
 ('src/seller-panel.js','src/seller-directory.js'),
 ('src/profile-app.js','src/wallet-sync.js'),
 ('src/wallet-sync.js','src/wallet-safety.js')]
for anchor,addon in scripts:
    if f'src="{addon}"' in s: continue
    a=f'<script src="{anchor}"></script>'
    if a not in s: raise RuntimeError(f'Expected script tag missing: {anchor}')
    s=s.replace(a,a+'\n'+f'<script src="{addon}"></script>',1)
p.write_text(s)
PY

# Never replace local LiveKit, Docker, database or other Compose configuration.
python3 - "$ROOT/server/compose.yaml" "$ORIGINS" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
if 'AKIRA_ALLOWED_ORIGINS:' not in s:
    a='      PORT: "4301"'
    if a not in s: raise RuntimeError('Compose PORT not as expected; manual merge required')
    s=s.replace(a,a+'\n      AKIRA_ALLOWED_ORIGINS: "'+sys.argv[2]+'"',1)
    p.write_text(s)
PY
# Never silently lose live LiveKit credentials or game-engine configuration.
# The running container and proposed Compose config must agree on these values.
python3 - "$ROOT/server/compose.yaml" "$ROOT/server" <<'PY'
import json,subprocess,sys
compose=sys.argv[1];directory=sys.argv[2]
prefix=['docker','compose','-f',compose,'--project-directory',directory]
cid=subprocess.check_output(prefix+['ps','-q','akira-api'],text=True).strip()
if not cid:
    raise RuntimeError('No running Akira API found; refusing to recreate an unknown service')
existing=json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]
live=dict(item.split('=',1) for item in existing['Config']['Env'] if '=' in item)
desired=json.loads(subprocess.check_output(prefix+['config','--format','json'],text=True))
future=desired['services']['akira-api'].get('environment') or {}
for key in ('AKIRA_LIVEKIT_API_KEY','AKIRA_LIVEKIT_API_SECRET','AKIRA_LIVEKIT_URL','AKIRA_GAME_ENGINE_ENABLED'):
    current=live.get(key,'')
    planned=str(future.get(key,'') or '')
    if current and planned!=current:
        raise RuntimeError(f'{key} would change during restart. Reuse the original env-file settings before deploying.')
print('PASS: Existing LiveKit and game-engine settings will be retained (values hidden).')
PY
echo '=== REBUILD ONLY THE AKIRA API; PRESERVE POSTGRES/LIVEKIT ==='
docker compose -f "$ROOT/server/compose.yaml" --project-directory "$ROOT/server" build akira-api
docker compose -f "$ROOT/server/compose.yaml" --project-directory "$ROOT/server" up -d --no-deps akira-api
LIVE_READY=0
for attempt in $(seq 1 20); do
  if curl --max-time 4 -fsS 'https://api.soverixnet.online/health' >/dev/null 2>&1; then
    LIVE_READY=1
    break
  fi
  sleep 1
done
[[ "$LIVE_READY" == 1 ]] || { echo 'Live API health failed'; exit 1; }
node "$REVIEW/scripts/smoke-prod.mjs"
echo '=== VERIFY NEW WEB FILES ARE SERVED ==='
WEB_ORIGIN="${AKIRA_WEB_ORIGIN:-https://voice.soverixnet.online}"
curl -fsS --max-time 15 "$WEB_ORIGIN/admin-connected.html" -o "$BACKUP/admin-served-check.html"
grep -q 'Akira Connected Admin Preview' "$BACKUP/admin-served-check.html" ||
  { echo 'Admin Panel not served from current website root'; exit 1; }
curl -fsS --max-time 15 "$WEB_ORIGIN/" -o "$BACKUP/index-served-check.html"
grep -q 'seller-directory.js' "$BACKUP/index-served-check.html" ||
  { echo 'Updated seller directory script not in live website HTML'; exit 1; }
DONE=1
echo "DEPLOYMENT AND READ-ONLY SMOKE TESTS PASSED. Backup: $BACKUP"
echo 'A real authorized seller-to-user coin transfer and voice/game device tests remain.'
