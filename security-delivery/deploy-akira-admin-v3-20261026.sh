#!/usr/bin/env bash
# Akira Admin V3 guarded deployment. Changes only the Akira API/admin files.
set -Eeuo pipefail
umask 077
if [[ "$(id -u)" != "0" ]]; then echo "Run on the server as root."; exit 1; fi
CODE=/opt/akira/server/src
STACK=/opt/akira/server
STAGE=/opt/akira/security-staging-admin-v3-20261026
RAW=https://raw.githubusercontent.com/soverixnet-design/Akira-Voice-Chat-App/2ce8f2cc9a8e8b50fc44571286b3b51a57105697/security-delivery
BASE=https://raw.githubusercontent.com/soverixnet-design/Akira-Voice-Chat-App/e03bfcaedb39cf696da67ef4ddb88781abdbcf72/security-delivery
mkdir -p "$STAGE" /opt/akira/security-backups
echo "[1/7] Downloading pinned sources..."
curl -fLsS "$RAW/akira-admin-content-v3.mjs" -o "$STAGE/admin-content.mjs"
curl -fLsS "$RAW/akira-admin-content-schema-v3.sql" -o "$STAGE/admin-content-schema.sql"
curl -fLsS "$RAW/akira-control-admin-v3.mjs" -o "$STAGE/control-v3.mjs"
curl -fLsS "$RAW/Akira-Admin-Control-Center-V3-20261026.html" -o "$STAGE/admin-v3.html"
curl -fLsS "$BASE/akira-control-admin-v2.mjs" -o "$STAGE/control-v2-baseline.mjs"
echo "[2/7] Checking file integrity and active source..."
[[ "$(git hash-object "$STAGE/admin-content.mjs")" == "099ca5e73c665af05d8c6eb2846eada8e913d744" ]]
[[ "$(git hash-object "$STAGE/admin-content-schema.sql")" == "34d5742e63324d15309df5c29c905dcc6d3eade0" ]]
[[ "$(git hash-object "$STAGE/control-v3.mjs")" == "3a053c6f34ac0af413efa4f0f27dc03f16c0a16d" ]]
[[ "$(git hash-object "$STAGE/admin-v3.html")" == "df9d76096758b5728441b255d16c16dccdc2c6a3" ]]
if ! cmp -s "$CODE/control.mjs" "$STAGE/control-v2-baseline.mjs"; then
  echo "STOP: Live control.mjs differs from the verified V2 version. Nothing was changed."; exit 2
fi
if [[ -e "$CODE/admin-content.mjs" ]]; then
  echo "STOP: admin-content.mjs already exists. Review it before replacing. Nothing was changed."; exit 2
fi
node --check "$STAGE/admin-content.mjs"
node --check "$STAGE/control-v3.mjs"
node -e 'const fs=require("fs"),vm=require("vm");const x=fs.readFileSync(process.argv[1],"utf8").match(/<script>([\s\S]*?)<\/script>/);if(!x)throw Error("missing script");new vm.Script(x[1])' "$STAGE/admin-v3.html"
curl -fsS -m 6 http://127.0.0.1:4301/health >/dev/null
BACKUP=$(mktemp -d /opt/akira/security-backups/20261026-admin-v3.XXXXXX)
cp -p "$CODE/control.mjs" "$BACKUP/control.mjs"
cp -p "$CODE/admin.html" "$BACKUP/admin.html"
cp -p "$CODE/admin-v2.html" "$BACKUP/admin-v2.html"
echo "[3/7] Backing up PostgreSQL..."
docker exec akira-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP/akira-db.dump"
test -s "$BACKUP/akira-db.dump"
docker exec -i akira-postgres pg_restore --list < "$BACKUP/akira-db.dump" >/dev/null
CHANGED=0
RESTARTED=0
SUCCESS=0
rollback(){
  local status=$?
  trap - EXIT
  if [[ "$SUCCESS" != "1" ]]; then
    echo "Deployment stopped, exit $status. Backup: $BACKUP"
    if [[ "$CHANGED" == "1" ]]; then
      install -m 644 "$BACKUP/control.mjs" "$CODE/control.mjs"
      install -m 644 "$BACKUP/admin.html" "$CODE/admin.html"
      install -m 644 "$BACKUP/admin-v2.html" "$CODE/admin-v2.html"
      if [[ "$RESTARTED" == "1" ]]; then
        echo "Restoring the previous Akira API image..."
        (cd "$STACK" && docker compose build akira-api && docker compose up -d --no-deps akira-api) || echo "Automatic restart failed; inspect the API and use the backup."
      fi
    fi
  fi
  exit "$status"
}
trap rollback EXIT
echo "[4/7] Adding non-monetary content/support tables..."
docker exec -i akira-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$STAGE/admin-content-schema.sql"
echo "[5/7] Installing readable files (mode 644)..."
CHANGED=1
install -m 644 "$STAGE/admin-content.mjs" "$CODE/admin-content.mjs"
install -m 644 "$STAGE/control-v3.mjs" "$CODE/control.mjs"
install -m 644 "$STAGE/admin-v3.html" "$CODE/admin.html"
install -m 644 "$STAGE/admin-v3.html" "$CODE/admin-v2.html"
echo "[6/7] Building and validating Docker image..."
cd "$STACK"
docker compose build akira-api
docker run --rm --network none --entrypoint node server-akira-api:latest --check /app/src/control.mjs
docker run --rm --network none --entrypoint node server-akira-api:latest --check /app/src/admin-content.mjs
docker run --rm --network none --entrypoint node server-akira-api:latest -e 'const fs=require("fs");for(const p of ["/app/src/control.mjs","/app/src/admin-content.mjs","/app/src/admin.html","/app/src/admin-v2.html"])fs.accessSync(p,fs.constants.R_OK);console.log("all files readable")'
echo "[7/7] Restarting only the Akira API..."
RESTARTED=1
docker compose up -d --no-deps akira-api
HEALTHY=0
for _ in {1..15}; do
  if curl -fsS -m 5 http://127.0.0.1:4301/health >/dev/null 2>&1; then HEALTHY=1; break; fi
  sleep 2
done
[[ "$HEALTHY" == "1" ]]
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/admin)" == "200" ]]
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/admin-v2)" == "200" ]]
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/api/v1/community/content)" == "200" ]]
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/api/v1/admin/content)" == "401" ]]
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/api/v1/admin/support)" == "401" ]]
SUCCESS=1
echo "AKIRA ADMIN V3 DEPLOYED. Backup: $BACKUP"
echo "Panel: https://api.soverixnet.online/admin"
