#!/usr/bin/env bash
# Apply only the secure Google auth route and configuration to a healthy API.
set -euo pipefail
cd /opt/akira
test "$(id -u)" -eq 0 || { echo 'Run as root on your Akira VPS'; exit 1; }
test -s /tmp/enable-akira-google-v7.mjs || { echo 'First download the reviewed patch to /tmp'; exit 1; }
node /tmp/enable-akira-google-v7.mjs
docker exec akira-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d akira_users"' | grep -q 'auth_subject' || { echo 'Google DB schema missing. Stopped without changes.'; exit 1; }
backup="$(mktemp -d /opt/akira/security-backups/20261027-google-v7.XXXXXX)"
chmod 700 "$backup"
cp -p server/src/server.mjs "$backup/server.mjs"
cp -p server/package.json "$backup/package.json"
cp -p server/compose.yaml "$backup/compose.yaml"
restore_google(){
  echo "Google deployment failed; restoring from $backup"
  cp -p "$backup/server.mjs" server/src/server.mjs
  cp -p "$backup/package.json" server/package.json
  cp -p "$backup/compose.yaml" server/compose.yaml
  docker compose -f server/compose.yaml up -d --build akira-api || true
}
trap restore_google ERR
node /tmp/enable-akira-google-v7.mjs --apply
docker compose -f server/compose.yaml config -q
docker compose -f server/compose.yaml up -d --build akira-api
healthy=0
for i in $(seq 1 24); do
  if curl -fsS --max-time 3 http://127.0.0.1:4301/health >/dev/null; then healthy=1; break; fi
  sleep 2
done
test "$healthy" -eq 1
curl -fsS http://127.0.0.1:4301/api/v1/auth/google/config | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{let j=JSON.parse(s);if(typeof j.enabled!=="boolean")process.exit(1);console.log("Google OAuth configured:",j.enabled)})'
test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4301/api/v1/admin/dashboard)" = 401
trap - ERR
echo "Google API ready; verified existing admin access control. Backup: $backup"
echo 'IMPORTANT: Google remains disabled until AKIRA_GOOGLE_WEB_CLIENT_ID is set in the Compose environment.'
