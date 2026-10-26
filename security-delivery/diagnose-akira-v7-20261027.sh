#!/usr/bin/env bash
# Read-only diagnosis for Akira V7. Never prints tokens, keys, passwords, user balances.
set -u
echo '=== AKIRA DIAG V7 (READ ONLY) ==='
date -u '+Time UTC: %Y-%m-%d %H:%M:%S'
printf '\n--- Containers ---\n'
docker ps --format '{{.Names}}: {{.Status}}' | grep -E 'akira|livekit|postgres' || true
printf '\n--- API/CORS ---\n'
curl --connect-timeout 4 --max-time 9 -s -o /dev/null -w 'API local /health: HTTP %{http_code}\n' http://127.0.0.1:4301/health || true
curl --connect-timeout 4 --max-time 9 -s -o /dev/null -w 'App origin https://localhost: HTTP %{http_code}\n' -H 'Origin: https://localhost' http://127.0.0.1:4301/health || true
curl --connect-timeout 4 --max-time 9 -s -o /dev/null -w 'App origin capacitor://localhost: HTTP %{http_code}\n' -H 'Origin: capacitor://localhost' http://127.0.0.1:4301/health || true
printf '\n--- Server feature switches (values hidden except ON/OFF) ---\n'
docker exec server-akira-api-1 sh -c '
 for k in AKIRA_GAME_ENGINE_ENABLED AKIRA_GAME_API_ENABLED; do
  v=$(printenv "$k" 2>/dev/null || true)
  if [ "$v" = true ]; then echo "$k: true"; else echo "$k: false/unset"; fi
 done
 for k in AKIRA_LIVEKIT_API_KEY AKIRA_LIVEKIT_API_SECRET AKIRA_LIVEKIT_URL; do
  if [ -n "$(printenv "$k" 2>/dev/null)" ]; then echo "$k: configured"; else echo "$k: NOT configured"; fi
 done
' || true
printf '\n--- Last rounds and enabled features (no user data) ---\n'
docker exec akira-postgres sh -c 'psql -X -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=0 -c "SELECT game,enabled FROM akira_control_games ORDER BY game" -c "SELECT '\''food-wheel'\'' AS game, count(*) AS rounds, coalesce(max(id),0) AS latest_id, coalesce(max(betting_ends_at)::text,'\''none'\'') AS latest_end FROM akira_food_rounds" -c "SELECT '\''jackpot-fruit'\'' AS game, count(*) AS rounds, coalesce(max(id),0) AS latest_id, coalesce(max(betting_ends_at)::text,'\''none'\'') AS latest_end FROM akira_jackpot_rounds" -c "SELECT kind,count(*) AS enabled_items FROM akira_control_catalog WHERE enabled=true GROUP BY kind ORDER BY kind"' || true
printf '\n--- Relevant API errors (last 60 minutes) ---\n'
docker logs --since 60m server-akira-api-1 2>&1 | grep -E 'game_engine_tick_failed|game_overview_failed|round_read_failed|round_advance_failed|game_bet_failed|voice_token_failed|voice_unavailable|cors|origin_not_allowed|wallet_read_failed|control_route_failed' | tail -35 || true
printf '\n--- Relevant LiveKit errors (last 30 minutes) ---\n'
docker logs --since 30m akira-livekit 2>&1 | grep -E -i 'error|failed|timeout|unauthor|invalid|permission|disconnect|turn|rtc' | tail -12 || true
echo '=== END AKIRA DIAG V7 ==='
