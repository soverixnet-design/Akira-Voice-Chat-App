#!/usr/bin/env bash
# Akira V6 protected live source + Android APK update.
set -Eeuo pipefail
umask 077
APP=/opt/akira
REF=f3f1d7a61db5b826c03d7cd2686332604ef517b2
BASE=https://raw.githubusercontent.com/soverixnet-design/Akira-Voice-Chat-App
mkdir -p /opt/akira/security-backups
BACKUP=$(mktemp -d /opt/akira/security-backups/20261026-v6.XXXXXX)
STAGE=$(mktemp -d /opt/akira/security-backups/.v6-stage.XXXXXX)
DONE=0
ALTERED=0
cd "$APP"
echo "Akira V6 protected deployment"
echo "Backup: $BACKUP"
sha_file(){
  local file="$1" hash="$2" actual
  test -s "$file" || { echo "Missing: $file" >&2; return 1; }
  actual=$(git hash-object "$file")
  if [[ "$actual" != "$hash" ]]; then
    echo "Hash mismatch: $file" >&2
    echo "Expected $hash; got $actual" >&2
    return 1
  fi
}
grab(){
  local path="$1" hash="$2" dest
  dest="$STAGE/$path"
  mkdir -p "$(dirname "$dest")"
  curl -fLsS --connect-timeout 12 --max-time 80 "$BASE/$REF/$path" -o "$dest"
  sha_file "$dest" "$hash"
}
restore(){
  local status=$?
  if [[ "$DONE" != 1 ]]; then
    if [[ "$ALTERED" == 1 ]]; then
      echo "V6 failed: restoring original live source and APK from $BACKUP" >&2
      for f in web/index.html web/room.html web/src/app.js web/src/room.js web/src/room-live.js web/food-wheel/game.js web/jackpot-fruit/index.html web/Akira-Voice-Chat.apk dist/Akira-Voice-Chat.apk; do
        if [[ -f "$BACKUP/$f" ]]; then
          mkdir -p "$(dirname "$APP/$f")"
          cp -a "$BACKUP/$f" "$APP/$f"
        fi
      done
      for f in web/src/game-overlay-v6.js web/src/wallet-v6.js web/src/room-v6-permission.js web/src/room-v6-giftbox.js web/vendor/livekit-client.umd.min.js; do
        if [[ -f "$BACKUP/$f" ]]; then
          cp -a "$BACKUP/$f" "$APP/$f"
        elif [[ -f "$APP/$f" ]]; then
          rm -- "$APP/$f"
        fi
      done
      if [[ -d "$BACKUP/dist-original" ]]; then
        if [[ -d "$APP/dist" ]]; then mv "$APP/dist" "$BACKUP/dist-failed"; fi
        cp -a "$BACKUP/dist-original" "$APP/dist"
      fi
      if [[ -d "$BACKUP/native-public" ]]; then
        if [[ -d "$APP/android/app/src/main/assets/public" ]]; then
          mv "$APP/android/app/src/main/assets/public" "$BACKUP/native-public-failed"
        fi
        cp -a "$BACKUP/native-public" "$APP/android/app/src/main/assets/public"
      fi
      echo "Original application restored" >&2
    else
      echo "Validation failed; no live files changed" >&2
    fi
  fi
  exit "$status"
}
trap restore EXIT
sha_file web/src/app.js 5f7fa8c12351d038f9d60d03fc288b6fcfa9a58a
sha_file web/src/room.js 53c2762eb744aeff9c4a87b6c7613ba3ef76ab38
sha_file web/src/room-live.js bf06bd2b4cc0cf92e7f8c5458ec84239f6fa1e54
sha_file web/food-wheel/game.js e446d3aa78a636ccec2720d4c1317bfd2ea56308
sha_file web/jackpot-fruit/index.html 6890f941c12e0dfaca567afa49879999cb7719a0
grab web/src/game-overlay-v6.js 0d4ada56677af53ea55948f5909239032bd4e8b2
grab web/src/wallet-v6.js 18a85c0d85d34dfe07cadbf26086b3aa3ac6a629
grab web/src/room-v6-permission.js ba1f040bc505815a65461553d94bd9a06fc04fab
grab web/src/room-v6-giftbox.js 4531e0937f5febf56a95d4cd2cd071e13fa0b3de
grab security-delivery/akira-v6-live-patch.cjs cc1ea8c016a447a0386086bade7f5f424b913d35
mkdir -p "$STAGE/web/vendor"
curl -fLsS --connect-timeout 12 --max-time 120 https://cdn.jsdelivr.net/npm/livekit-client@2.15.1/dist/livekit-client.umd.min.js -o "$STAGE/web/vendor/livekit-client.umd.min.js"
echo "3f6c725e299407e5d24c55735f66d77713777719171f15ed792ad37650a04644  $STAGE/web/vendor/livekit-client.umd.min.js" | sha256sum -c -
for f in web/src/game-overlay-v6.js web/src/wallet-v6.js web/src/room-v6-permission.js web/src/room-v6-giftbox.js security-delivery/akira-v6-live-patch.cjs; do
  node --check "$STAGE/$f"
done
AKIRA_V6_VALIDATE=1 node "$STAGE/security-delivery/akira-v6-live-patch.cjs"
curl -fsS --max-time 15 http://127.0.0.1:4301/health | grep -q '"ok":true'
for f in web/index.html web/room.html web/src/app.js web/src/room.js web/src/room-live.js web/food-wheel/game.js web/jackpot-fruit/index.html web/Akira-Voice-Chat.apk dist/Akira-Voice-Chat.apk web/src/game-overlay-v6.js web/src/wallet-v6.js web/src/room-v6-permission.js web/src/room-v6-giftbox.js web/vendor/livekit-client.umd.min.js; do
  if [[ -f "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
if [[ -d dist ]]; then cp -a dist "$BACKUP/dist-original"; fi
if [[ -d android/app/src/main/assets/public ]]; then
  cp -a android/app/src/main/assets/public "$BACKUP/native-public"
fi
ALTERED=1
for f in web/src/game-overlay-v6.js web/src/wallet-v6.js web/src/room-v6-permission.js web/src/room-v6-giftbox.js; do
  install -m 0644 "$STAGE/$f" "$APP/$f"
done
install -d -m 0755 "$APP/web/vendor"
install -m 0644 "$STAGE/web/vendor/livekit-client.umd.min.js" "$APP/web/vendor/livekit-client.umd.min.js"
node "$STAGE/security-delivery/akira-v6-live-patch.cjs"
for f in web/src/room.js web/src/room-live.js web/food-wheel/game.js web/src/game-overlay-v6.js web/src/wallet-v6.js web/src/room-v6-giftbox.js web/src/room-v6-permission.js; do
  node --check "$f"
done
npm run build
npx cap copy android
(cd android && ./gradlew :app:assembleDebug --no-daemon --max-workers=2)
APK=android/app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
for f in assets/public/src/wallet-v6.js assets/public/src/game-overlay-v6.js assets/public/src/room-v6-giftbox.js assets/public/src/room-v6-permission.js assets/public/vendor/livekit-client.umd.min.js; do
  if ! unzip -Z1 "$APK" | grep -Fx "$f" >/dev/null; then
    echo "APK is missing expected asset: $f" >&2
    exit 1
  fi
  echo "Verified APK asset: $f"
done
install -m 0644 "$APK" web/Akira-Voice-Chat.apk
install -m 0644 "$APK" dist/Akira-Voice-Chat.apk
DONE=1
echo "AKIRA V6 FRONTEND + APK DEPLOYED"
echo "APK: https://voice.soverixnet.online/Akira-Voice-Chat.apk?v=game-wallet-v6-20261026"
echo "Admin: https://api.soverixnet.online/admin-v2"
echo "Backup: $BACKUP"
echo "Game-engine availability:"
docker exec server-akira-api-1 sh -c 'if [ "$AKIRA_GAME_ENGINE_ENABLED" = true ]; then echo "AKIRA_GAME_ENGINE_ENABLED=true"; else echo "AKIRA_GAME_ENGINE_ENABLED=false (server games remain disabled)"; fi' || true
docker ps --filter name=server-akira-api-1 --format 'API: {{.Status}}'
