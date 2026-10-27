#!/usr/bin/env bash
# Read-only Akira V8 readiness snapshot. Never displays credentials or wallet data.
set -u
cd /opt/akira || { echo 'ERROR: /opt/akira missing'; exit 1; }
echo 'AKIRA READ-ONLY PREFLIGHT'
echo '------------------------'
if [ -s dist/vendor/livekit-client.umd.min.js ]; then
  echo 'Built LiveKit JS: PRESENT'
else
  echo 'Built LiveKit JS: MISSING (website and APK distribution need checking)'
fi
if [ -s web/vendor/livekit-client.umd.min.js ]; then
  echo 'Live web-source SDK: PRESENT'
else
  echo 'Live web-source SDK: MISSING (normal if only dist is served)'
fi
if docker ps --format '{{.Names}}' | grep -Fxq 'server-akira-api-1'; then
  echo 'Akira API container: RUNNING'
  docker exec server-akira-api-1 /bin/sh -c '
    test -n "${AKIRA_GOOGLE_WEB_CLIENT_ID:-}" && echo "Google Web OAuth ID: SET" || echo "Google Web OAuth ID: NOT SET"
    test -n "${AKIRA_LIVEKIT_URL:-}" && echo "LiveKit URL: SET" || echo "LiveKit URL: NOT SET"
    test -n "${AKIRA_LIVEKIT_API_KEY:-}" && echo "LiveKit API key: SET" || echo "LiveKit API key: NOT SET"
    test "${AKIRA_GAME_ENGINE_ENABLED:-}" = "true" && echo "Game flag: ENABLED" || echo "Game flag: DISABLED"
  ' 2>/dev/null || echo 'Container environment: could not inspect'
else
  echo 'Akira API container: NOT RUNNING'
fi
for endpoint in \
  https://api.soverixnet.online/health \
  https://api.soverixnet.online/api/v1/auth/google/config \
  https://voice.soverixnet.online/room.html \
  https://voice.soverixnet.online/vendor/livekit-client.umd.min.js; do
  code=$(curl --silent --location --max-time 7 --output /dev/null --write-out '%{http_code}' "$endpoint") || code=ERROR
  echo "$endpoint : $code"
done
echo 'No server files, wallets or user accounts were modified.'
