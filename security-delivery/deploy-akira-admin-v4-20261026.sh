#!/usr/bin/env bash
# V4 upgrades only admin API + panel. Safe when V3 matches exactly.
set -Eeuo pipefail
umask 077
[[ "$(id -u)" == "0" ]] || { echo "Run as root on the Akira server."; exit 1; }
CODE=/opt/akira/server/src
STACK=/opt/akira/server
STAGE=/opt/akira/security-staging-admin-v4-20261026
RAW=https://raw.githubusercontent.com/soverixnet-design/Akira-Voice-Chat-App/039cba512f2b751e1c7d0963c1e748f67ec4e4c0/security-delivery
BASE=https://raw.githubusercontent.com/soverixnet-design/Akira-Voice-Chat-App/2ce8f2cc9a8e8b50fc44571286b3b51a57105697/security-delivery
mkdir -p "$STAGE" /opt/akira/security-backups
echo "[1/7] Downloading verified Akira V4 patch..."
curl -fLsS "$RAW/akira-admin-economy-v4.mjs" -o "$STAGE/admin-economy.mjs"
curl -fLsS "$RAW/akira-admin-economy-schema-v4.sql" -o "$STAGE/economy.sql"
curl -fLsS "$RAW/akira-control-admin-v4.mjs" -o "$STAGE/control.mjs"
curl -fLsS "$RAW/Akira-Admin-Control-Center-V4-20261026.html" -o "$STAGE/admin.html"
curl -fLsS "$BASE/akira-control-admin-v3.mjs" -o "$STAGE/control-v3.mjs"
echo "[2/7] Checking integrity, syntax and safe upgrade base..."
[[ "$(git hash-object "$STAGE/admin-economy.mjs")" == "5d4edc241f4e44c7aafa12bfbc3a78b812d213dc" ]]
[[ "$(git hash-object "$STAGE/economy.sql")" == "e98df084bbc3bd0f0ac8fbe76b546bc15b5ec39a" ]]
[[ "$(git hash-object "$STAGE/control.mjs")" == "0b828b5ea68118025b82758bce5a9ac84f0aedc9" ]]
[[ "$(git hash-object "$STAGE/admin.html")" == "d47ffe29367e3b8f0379d7501d9440d3bbd81c0a" ]]
if ! cmp -s "$CODE/control.mjs" "$STAGE/control-v3.mjs"; then
 echo "STOP: Live control.mjs differs from deployed V3. No live file was touched."; exit 2
fi
if [[ -e "$CODE/admin-economy.mjs" ]]; then
 echo "STOP: Economy module exists already. No live file was touched."; exit 2
fi
node --check "$STAGE/admin-economy.mjs"
node --check "$STAGE/control.mjs"
node -e 'const fs=require("fs"),vm=require("vm");const x=fs.readFileSync(process.argv[1],"utf8").match(/<script>([\s\S]*?)<\/script>/);if(!x)throw Error("missing script");new vm.Script(x[1])' "$STAGE/admin.html"
curl -fsS -m 6 http://127.0.0.1:4301/health >/dev/null
BACKUP=$(mktemp -d /opt/akira/security-backups/20261026-admin-v4.XXXXXX)
cp -p "$CODE/control.mjs" "$BACKUP/control.mjs"
cp -p "$CODE/admin.html" "$BACKUP/admin.html"
cp -p "$CODE/admin-v2.html" "$BACKUP/admin-v2.html"
echo "[3/7] Backing up Akira wallet database..."
docker exec akira-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP/akira-db.dump"
test -s "$BACKUP/akira-db.dump"
docker exec -i akira-postgres pg_restore --list < "$BACKUP/akira-db.dump" >/dev/null
CHANGED=0
RESTARTED=0
SUCCESS=0
rollback(){
 local result=$?
 trap - EXIT
 if [[ "$SUCCESS" != "1" ]]; then
  echo "V4 not completed (exit $result). Backup: $BACKUP"
  if [[ "$CHANGED" == "1" ]]; then
   install -m 644 "$BACKUP/control.mjs" "$CODE/control.mjs"
   install -m 644 "$BACKUP/admin.html" "$CODE/admin.html"
   install -m 644 "$BACKUP/admin-v2.html" "$CODE/admin-v2.html"
   if [[ "$RESTARTED" == "1" ]]; then
    (cd "$STACK" && docker compose build akira-api && docker compose up -d --no-deps akira-api) || echo "Manual API recovery required; original source is in backup."
   fi
  fi
 fi
 exit "$result"
}
trap rollback EXIT
echo "[4/7] Adding promotion & task tables (no existing wallet updates)..."
docker exec -i akira-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$STAGE/economy.sql"
echo "[5/7] Installing API, preserving application design..."
CHANGED=1
install -m 644 "$STAGE/admin-economy.mjs" "$CODE/admin-economy.mjs"
install -m 644 "$STAGE/control.mjs" "$CODE/control.mjs"
install -m 644 "$STAGE/admin.html" "$CODE/admin.html"
install -m 644 "$STAGE/admin.html" "$CODE/admin-v2.html"
echo "[6/7] Building and checking API image..."
cd "$STACK"
docker compose build akira-api
docker run --rm --network none --entrypoint node server-akira-api:latest --check /app/src/admin-economy.mjs
docker run --rm --network none --entrypoint node server-akira-api:latest --check /app/src/control.mjs
docker run --rm --network none --entrypoint node server-akira-api:latest -e 'const fs=require("fs");for(const p of ["/app/src/admin-economy.mjs","/app/src/admin-content.mjs","/app/src/control.mjs","/app/src/admin-v2.html"])fs.accessSync(p,fs.constants.R_OK);console.log("FILES READABLE")'
echo "[7/7] Restarting only Akira API..."
RESTARTED=1
docker compose up -d --no-deps akira-api
HEALTHY=0
for _ in {1..15}; do
 if curl -fsS -m 5 http://127.0.0.1:4301/health >/dev/null 2>&1; then HEALTHY=1; break; fi
 sleep 2
done
[[ "$HEALTHY" == "1" ]]
curl -fsS -m 6 http://127.0.0.1:4301/admin-v2 -o "$STAGE/live-admin-check.html"
grep -q 'Promotional coin codes' "$STAGE/live-admin-check.html"
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/api/v1/admin/promos)" == "401" ]]
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/api/v1/community/tasks)" == "401" ]]
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/api/v1/admin/support)" == "401" ]]
SUCCESS=1
echo "AKIRA ADMIN V4 DEPLOYED. Backup: $BACKUP"
echo "NEW PANEL: https://api.soverixnet.online/admin-v2"
