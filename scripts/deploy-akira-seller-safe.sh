#!/usr/bin/env bash
# Safe Akira seller release: first --check, then explicit --apply.
set -Eeuo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || { echo 'Use --check or --apply'; exit 2; }
ROOT="${AKIRA_LIVE_ROOT:-/opt/akira}"
# Staging health and API probes run inside the container: independent of VPS port forwarding.
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
FILES=(server/package.json server/src/server.mjs server/src/seller-wallet.mjs server/src/seller-admin.mjs
  server/src/room-seats.mjs server/src/rooms.mjs server/src/account-deletion.mjs
  server/src/daily-rewards.mjs server/src/google-auth.mjs
  server/migrations/011_room_seats.sql server/migrations/012_deletion_requests.sql
  server/migrations/013_user_safety.sql server/migrations/014_daily_rewards.sql
  server/src/game-bets.mjs web/src/seller-panel.js web/src/seller-directory.js
  web/src/wallet-sync.js web/src/wallet-safety.js web/src/account-deletion-ui.js web/src/game-overlay.js
  web/src/room.js web/src/room-live.js
  web/game-live.html web/admin-connected.html web/delete-account.html)
SAVE=("${FILES[@]}" web/index.html web/room.html server/compose.yaml)

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
git -C "$ROOT" worktree add --detach "$REVIEW" FETCH_HEAD
echo "Review commit: $(git -C "$REVIEW" rev-parse HEAD)"
echo '=== GUARD EXISTING USER CUSTOMIZATIONS ==='
conflicts=0
for f in "${FILES[@]}"; do
  [[ -f "$REVIEW/$f" ]] || { echo "ERROR: Missing candidate $f"; conflicts=$((conflicts+1)); continue; }
  if [[ "$f" == "server/package.json" && -f "$ROOT/$f" ]] && ! cmp -s "$ROOT/$f" "$REVIEW/$f"; then
    # Merge only required dependency declarations into the candidate staging
    # manifest. Preserve every local script and extra package, and abort if
    # an existing required dependency has a different version.
    if python3 - "$ROOT/$f" "$REVIEW/$f" <<'PY'
import json,sys
from pathlib import Path
live,candidate=map(Path,sys.argv[1:])
a=json.loads(live.read_text())
b=json.loads(candidate.read_text())
for field in ('name','type'):
    if a.get(field)!=b.get(field):
        raise SystemExit(f'PACKAGE CONFLICT: {field} differs — manual inspection required')
for script in ('start','test'):
    if a.get('scripts',{}).get(script)!=b.get('scripts',{}).get(script):
        raise SystemExit(f'PACKAGE CONFLICT: script {script} differs — manual inspection required')
for section in ('dependencies','devDependencies','optionalDependencies'):
    existing=a.setdefault(section,{})
    required=b.get(section,{})
    for pkg,version in required.items():
        if pkg in existing and existing[pkg]!=version:
            raise SystemExit(f'PACKAGE CONFLICT: {pkg} has a different declared version — manual inspection required')
        existing.setdefault(pkg,version)
candidate.write_text(json.dumps(a,indent=2,ensure_ascii=False)+'\n')
print('SAFE MERGE: Package metadata and installed packages kept; only missing required dependencies added to staging')
PY
    then
      continue
    else
      conflicts=$((conflicts+1))
      continue
    fi
  fi
  if [[ -e "$ROOT/$f" ]]; then
    # The prior successful guarded release may already have installed this exact
    # candidate file. Git status will still call it 'modified' versus old HEAD.
    if cmp -s "$ROOT/$f" "$REVIEW/$f"; then
      echo "ALREADY MATCHES CANDIDATE: $f"
      continue
    fi
    if ! git -C "$ROOT" ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      echo "CONFLICT: Untracked live file differs from candidate: $f"
      conflicts=$((conflicts+1))
    elif ! git -C "$ROOT" diff --quiet HEAD -- "$f"; then
      echo "CONFLICT: Locally modified file differs from candidate: $f"
      conflicts=$((conflicts+1))
    fi
  elif git -C "$ROOT" ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "CONFLICT: Tracked file locally deleted: $f"
    conflicts=$((conflicts+1))
  fi
done
if ((conflicts)); then
  echo "STOP: $conflicts file conflict(s). This is deliberate: no file or coin changes." >&2
  echo "For each modified tracked file run: git -C $ROOT diff -- path/to/file" >&2
  echo "Never use git reset --hard or git clean to fix these conflicts." >&2
  exit 1
fi
[[ -f "$ROOT/web/index.html" ]] || { echo 'Missing original index.html'; exit 1; }
echo '=== CANDIDATE TESTS ==='
(cd "$REVIEW/server" && npm install --ignore-scripts --no-audit --no-fund && npm test)
for f in server/src/server.mjs web/src/seller-panel.js web/src/seller-directory.js \
  web/src/wallet-sync.js web/src/wallet-safety.js web/src/account-deletion-ui.js web/src/room.js web/src/room-live.js server/src/room-seats.mjs server/src/account-deletion.mjs \
  server/src/daily-rewards.mjs server/src/google-auth.mjs; do
  node --check "$REVIEW/$f"
done

echo '=== VERIFY OPTIONAL EXISTING ADMIN CODE BEFORE SERVER RESTART ==='
LEGACY_MOUNTS=()
for admin_module in control.mjs admin-panel.mjs; do
  if [[ -f "$ROOT/server/src/$admin_module" ]]; then
    node --check "$ROOT/server/src/$admin_module"
    LEGACY_MOUNTS+=("-v" "$ROOT/server/src/$admin_module:/app/src/$admin_module:ro")
    echo "Testing compatibility with the existing $admin_module"
  fi
done
echo '=== TEMPORARY READ-ONLY API SMOKE TEST ON LOCAL PORT ==='
docker build -q -t "$IMAGE" "$REVIEW/server" >/dev/null
docker run -d --rm --name "$CONTAINER" --network akira-private \
  --memory 192m --cpus 0.5 \
  --security-opt no-new-privileges:true --read-only --tmpfs /tmp \
  "${LEGACY_MOUNTS[@]}" \
  -v "$ROOT/secrets/postgres_password:/run/secrets/db_password:ro" \
  -e HOST=0.0.0.0 -e PORT=4301 -e PGHOST=akira-postgres \
  -e PGPORT=5432 -e PGUSER=akira -e PGDATABASE=akira_db \
  -e PGPASSWORD_FILE=/run/secrets/db_password \
  -e AKIRA_ALLOWED_ORIGINS="$ORIGINS" -e AKIRA_GAME_ENGINE_ENABLED=false \
  "$IMAGE" >/dev/null
READY=0
for attempt in $(seq 1 25); do
  if docker exec "$CONTAINER" node -e "fetch('http://127.0.0.1:4301/health',{signal:AbortSignal.timeout(2500)}).then(async r=>{const j=await r.json();process.exit(r.status===200&&j.ok===true?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
[[ "$READY" == 1 ]] || { docker logs --tail 35 "$CONTAINER"; echo 'Staging health check failed INSIDE container; live untouched'; exit 1; }
echo '=== CHECK API ROUTES FROM INSIDE THE ISOLATED STAGING CONTAINER ==='
docker exec -i -e AKIRA_API_BASE=http://127.0.0.1:4301 "$CONTAINER" node --input-type=module - < "$REVIEW/scripts/smoke-prod.mjs"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

echo '=== CURRENT LIVE SERVICE FEATURE FLAGS (NO SECRETS PRINTED) ==='
python3 - "$ROOT/server/compose.yaml" "$ROOT/server" <<'PY'
import json, subprocess, sys
config=sys.argv[1]; directory=sys.argv[2]
cmd=['docker','compose','-f',config,'--project-directory',directory]
cid=subprocess.check_output(cmd+['ps','-q','akira-api'],text=True).strip()
if not cid:
    raise SystemExit('Existing Akira API container not running; stop before release')
info=json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]
env=dict(item.split('=',1) for item in info['Config']['Env'] if '=' in item)
features={
 'LiveKit voice':all(env.get(k) for k in ['AKIRA_LIVEKIT_API_KEY','AKIRA_LIVEKIT_API_SECRET','AKIRA_LIVEKIT_URL']),
 'Game rounds / settlement':env.get('AKIRA_GAME_ENGINE_ENABLED')=='true',
 'Google login':bool(env.get('AKIRA_GOOGLE_WEB_CLIENT_ID'))
}
for label,enabled in features.items():
 print(('ENABLED' if enabled else 'NOT CONFIGURED')+' — '+label)
print('The new release will not silently enable financial games or change live credentials.')
PY

if [[ "$MODE" == "--check" ]]; then
  echo 'PASS: Staging API, wallet permissions, and seller directory. Live app unchanged.'
  exit 0
fi

echo '=== PREFLIGHT: ENSURE EXISTING LIVE VOICE AND GAME ENVIRONMENT IS PRESERVED ==='
python3 - "$ROOT/server/compose.yaml" "$ROOT/server" <<'PY'
import json,subprocess,sys
compose,directory=sys.argv[1:]
base=['docker','compose','-f',compose,'--project-directory',directory]
cid=subprocess.check_output(base+['ps','-q','akira-api'],text=True).strip()
if not cid:
    raise SystemExit('Live API container not found; cannot safely deploy')
info=json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]
active=dict(x.split('=',1) for x in info['Config']['Env'] if '=' in x)
desired=json.loads(subprocess.check_output(base+['config','--format','json'],text=True))
env=desired['services']['akira-api'].get('environment') or {}
keys=('AKIRA_LIVEKIT_API_KEY','AKIRA_LIVEKIT_API_SECRET','AKIRA_LIVEKIT_URL',
      'AKIRA_GAME_ENGINE_ENABLED','AKIRA_GOOGLE_WEB_CLIENT_ID')
fail=[key for key in keys if active.get(key) and str(env.get(key) or '')!=active[key]]
if fail:
    print('STOP: Existing live settings would change after Compose restart:',', '.join(fail))
    print('Restore these values securely through your existing Compose environment before applying.')
    raise SystemExit(1)
print('PASS: Current live voice/game/login settings match the Compose restart configuration.')
PY
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
echo '=== APPLY ADDITIVE ROOM SEAT MIGRATION (BACKUP ALREADY VERIFIED) ==='
docker exec -i akira-postgres psql -U akira -d akira_db -v ON_ERROR_STOP=1 < "$REVIEW/server/migrations/011_room_seats.sql"
docker exec -i akira-postgres psql -U akira -d akira_db -v ON_ERROR_STOP=1 < "$REVIEW/server/migrations/012_deletion_requests.sql"
docker exec -i akira-postgres psql -U akira -d akira_db -v ON_ERROR_STOP=1 < "$REVIEW/server/migrations/013_user_safety.sql"
docker exec -i akira-postgres psql -U akira -d akira_db -v ON_ERROR_STOP=1 < "$REVIEW/server/migrations/014_daily_rewards.sql"
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
 ('src/wallet-sync.js','src/wallet-safety.js'),
 ('src/wallet-safety.js','src/account-deletion-ui.js')]
for anchor,addon in scripts:
    if f'src="{addon}"' in s: continue
    a=f'<script src="{anchor}"></script>'
    if a not in s: raise RuntimeError(f'Expected script tag missing: {anchor}')
    s=s.replace(a,a+'\n'+f'<script src="{addon}"></script>',1)
p.write_text(s)
PY

# Preserve the user's original room.html and only load the new real seat adapter.
python3 - "$ROOT/web/room.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
if 'src="src/room-live.js"' not in s:
    anchor='<script src="src/room.js"></script>'
    if anchor not in s: raise RuntimeError('Original room.js script missing: merge manually')
    s=s.replace(anchor,anchor+'\n<script src="src/room-live.js"></script>',1)
    p.write_text(s)
PY

# Read effective Compose and running API origins, then preserve them while adding
# the four required app origins. Previously the script kept a too-narrow existing
# AKIRA_ALLOWED_ORIGINS value, causing public API requests to return HTTP 403.
python3 - "$ROOT/server/compose.yaml" "$ROOT/server" "$ORIGINS" <<'PY'
from pathlib import Path
import json,re,subprocess,sys
p=Path(sys.argv[1]);directory=sys.argv[2];required=sys.argv[3].split(',')
prefix=['docker','compose','-f',str(p),'--project-directory',directory]
raw=p.read_text()
config=json.loads(subprocess.check_output(prefix+['config','--format','json'],text=True))
service=config.get('services',{}).get('akira-api',{})
environment=service.get('environment') or {}
if not isinstance(environment,dict):
    raise RuntimeError('Unexpected Compose environment format; refusing to guess')
configured=str(environment.get('AKIRA_ALLOWED_ORIGINS') or '')
running=''
cid=subprocess.check_output(prefix+['ps','-q','akira-api'],text=True).strip()
if cid:
    data=json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]
    for item in data.get('Config',{}).get('Env',[]):
        if item.startswith('AKIRA_ALLOWED_ORIGINS='):
            running=item.partition('=')[2]
            break
values=[v.strip() for group in (configured,running,','.join(required)) for v in group.split(',') if v.strip()]
origins=list(dict.fromkeys(values))
assert all(x in origins for x in required),'Missing required app origin'
value=json.dumps(','.join(origins))
if 'AKIRA_ALLOWED_ORIGINS:' in raw:
    raw,count=re.subn(r'^      AKIRA_ALLOWED_ORIGINS:[^\n]*$',lambda _: '      AKIRA_ALLOWED_ORIGINS: '+value,
                      raw,count=1,flags=re.MULTILINE)
    if count!=1: raise RuntimeError('Unexpected Compose CORS layout; manual review required')
else:
    marker='      PORT: "4301"'
    if marker not in raw: raise RuntimeError('Unexpected Compose PORT layout; manual review required')
    raw=raw.replace(marker,marker+'\n      AKIRA_ALLOWED_ORIGINS: '+value,1)
p.write_text(raw)
future=json.loads(subprocess.check_output(prefix+['config','--format','json'],text=True))
effective=str(future['services']['akira-api']['environment']['AKIRA_ALLOWED_ORIGINS']).split(',')
if not all(x in effective for x in required):
    raise RuntimeError('API app origins still incomplete; refusing to restart')
print('PASS: All required browser and Capacitor app origins are in Compose config.')
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
for key in ('AKIRA_LIVEKIT_API_KEY','AKIRA_LIVEKIT_API_SECRET','AKIRA_LIVEKIT_URL','AKIRA_GAME_ENGINE_ENABLED','AKIRA_GOOGLE_WEB_CLIENT_ID'):
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
echo '=== CHECK RESTARTED API DIRECTLY FROM ITS CONTAINER ==='
LIVE_CONTAINER="$(docker compose -f "$ROOT/server/compose.yaml" --project-directory "$ROOT/server" ps -q akira-api)"
[[ -n "$LIVE_CONTAINER" ]] || { echo 'Akira API container is not running'; exit 1; }
docker exec -i -e AKIRA_API_BASE=http://127.0.0.1:4301 "$LIVE_CONTAINER" node --input-type=module - < "$REVIEW/scripts/smoke-prod.mjs"
echo '=== CHECK THE SAME ORIGINS THROUGH THE PUBLIC HTTPS PROXY ==='
node "$REVIEW/scripts/smoke-prod.mjs"
echo '=== VERIFY NEW WEB FILES ARE SERVED ==='
WEB_ORIGIN="${AKIRA_WEB_ORIGIN:-https://api.soverixnet.online/app}"
curl -fsS --max-time 15 "$WEB_ORIGIN/admin-connected.html" -o "$BACKUP/admin-served-check.html"
grep -q 'Akira Connected Admin Preview' "$BACKUP/admin-served-check.html" ||
  { echo 'Admin Panel not served from current website root'; exit 1; }
curl -fsS --max-time 15 "$WEB_ORIGIN/" -o "$BACKUP/index-served-check.html"
grep -q 'seller-directory.js' "$BACKUP/index-served-check.html" ||
  { echo 'Updated seller directory script not in live website HTML'; exit 1; }
curl -fsS --max-time 15 "$WEB_ORIGIN/room.html" -o "$BACKUP/room-served-check.html"
grep -q 'src/room-live.js' "$BACKUP/room-served-check.html" ||
  { echo 'Real room seat UI not served'; exit 1; }
curl -fsS --max-time 15 "$WEB_ORIGIN/delete-account.html" -o "$BACKUP/deletion-served-check.html"
grep -q 'Akira Account Deletion' "$BACKUP/deletion-served-check.html" ||
  { echo 'Required account deletion page not served'; exit 1; }
DONE=1
echo "DEPLOYMENT AND READ-ONLY SMOKE TESTS PASSED. Backup: $BACKUP"
echo 'A real authorized seller-to-user coin transfer and voice/game device tests remain.'
