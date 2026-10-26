#!/usr/bin/env bash
# Guarded Akira V5 frontend rollout from the Oct 26 live export.
set -Eeuo pipefail
umask 077
APP=/opt/akira
REF=d2c598d10e90a8f134cdc06e9d628866e560286a
REPO=https://raw.githubusercontent.com/soverixnet-design/Akira-Voice-Chat-App
BACKUP_BASE=/opt/akira/security-backups
mkdir -p "$BACKUP_BASE"
BACKUP=$(mktemp -d "$BACKUP_BASE/20261026-web-v5.XXXXXX")
TMP=$(mktemp -d "$BACKUP_BASE/.web-v5-stage.XXXXXX")
COMPLETED=0
cd "$APP"
echo "Backup directory: $BACKUP"
need_blob(){
 local file="$1" expected="$2" actual
 test -f "$file" || { echo "Missing: $file" >&2; return 1; }
 actual=$(git hash-object "$file")
 if [[ "$actual" != "$expected" ]]; then
   echo "Live file differs from verified export: $file" >&2
   echo "Expected: $expected" >&2
   echo "Actual:   $actual" >&2
   echo "Stopped without overwriting your changes." >&2
   return 1
 fi
}
download(){
 local relative="$1" expected="$2" dest="$TMP/$relative"
 mkdir -p "$(dirname "$dest")"
 curl -fLsS --connect-timeout 12 --max-time 60 "$REPO/$REF/$relative" -o "$dest"
 need_blob "$dest" "$expected"
}
rollback(){
 local result=$?
 if [[ "$COMPLETED" != 1 ]]; then
   echo "Deployment failed. Restoring previous live files from: $BACKUP" >&2
   for file in web/index.html web/room.html web/src/room-live.js; do
      if [[ -f "$BACKUP/$file" ]]; then cp -a "$BACKUP/$file" "$APP/$file"; fi
   done
   for file in web/Akira-Voice-Chat.apk dist/Akira-Voice-Chat.apk; do
      if [[ -f "$BACKUP/$file" ]]; then cp -a "$BACKUP/$file" "$APP/$file"; fi
   done
   if [[ -d "$BACKUP/dist" ]]; then
      if [[ -d "$APP/dist" ]]; then mv "$APP/dist" "$BACKUP/failed-dist-$(date +%s)"; fi
      cp -a "$BACKUP/dist" "$APP/dist"
   fi
   if [[ -d "$BACKUP/native-public" ]]; then
      if [[ -d "$APP/android/app/src/main/assets/public" ]]; then
       mv "$APP/android/app/src/main/assets/public" "$BACKUP/failed-native-public-$(date +%s)"
      fi
      cp -a "$BACKUP/native-public" "$APP/android/app/src/main/assets/public"
   fi
   echo "Restored original HTML, room gift guard, build assets and APK." >&2
 fi
 exit "$result"
}
trap rollback EXIT
# Refuse to deploy if original app.js changed after the user's export.
need_blob web/src/app.js 5f7fa8c12351d038f9d60d03fc288b6fcfa9a58a
if ! grep -Fq 'src/admin-v4-app.js' web/index.html; then
 need_blob web/index.html 0ae691c53db2bdfbe2e9471d38633f5e884035a5
fi
if ! grep -Fq 'src/room-v5-integrity.js' web/room.html; then
 need_blob web/room.html 40e81b3fb6ddf652e99561f6f0e13cc3029b8fff
fi
current_room=$(git hash-object web/src/room-live.js)
if [[ "$current_room" != f6d12b4fde1a9a2fa9d7560dd3dae9407b350e37 && "$current_room" != bf06bd2b4cc0cf92e7f8c5458ec84239f6fa1e54 ]]; then
 echo "Room code changed: refusing to replace it." >&2; exit 1
fi
for file in \
 "web/src/admin-v4-app.js:b48ca4de034a27f9e2ca5335ccb0f6eac2175434" \
 "web/src/room-v5-integrity.js:29ba4b46f3462cb5c316f9f4b0647a937640f407"; do
 IFS=: read -r relative expected <<< "$file"
 if [[ -f "$relative" ]]; then need_blob "$relative" "$expected"; fi
done
download web/src/admin-v4-app.js b48ca4de034a27f9e2ca5335ccb0f6eac2175434
download web/src/room-v5-integrity.js 29ba4b46f3462cb5c316f9f4b0647a937640f407
download web/src/room-live.js bf06bd2b4cc0cf92e7f8c5458ec84239f6fa1e54
node --check "$TMP/web/src/admin-v4-app.js"
node --check "$TMP/web/src/room-v5-integrity.js"
node --check "$TMP/web/src/room-live.js"
curl --max-time 12 -fsS http://127.0.0.1:4301/health | grep -q '"ok":true'
for file in web/index.html web/room.html web/src/room-live.js web/Akira-Voice-Chat.apk dist/Akira-Voice-Chat.apk; do
 if [[ -f "$file" ]]; then
   mkdir -p "$BACKUP/$(dirname "$file")"
   cp -a "$file" "$BACKUP/$file"
 fi
done
if [[ -d dist ]]; then cp -a dist "$BACKUP/dist"; fi
if [[ -d android/app/src/main/assets/public ]]; then
 cp -a android/app/src/main/assets/public "$BACKUP/native-public"
fi
install -m 0644 "$TMP/web/src/admin-v4-app.js" web/src/admin-v4-app.js
install -m 0644 "$TMP/web/src/room-v5-integrity.js" web/src/room-v5-integrity.js
install -m 0644 "$TMP/web/src/room-live.js" web/src/room-live.js
node <<'NODE'
const fs=require('node:fs');
const changes=[
 ['web/index.html','<script src="src/account-deletion-ui.js"></script>','<script src="src/admin-v4-app.js"></script>'],
 ['web/room.html','<script src="src/profile-room.js"></script>','<script src="src/room-v5-integrity.js"></script>']
];
for(const [file,anchor,addition] of changes){
 const before=fs.readFileSync(file,'utf8');
 if(before.includes(addition))continue;
 if(before.split(anchor).length!==2)throw Error('Expected single insertion anchor in '+file);
 fs.writeFileSync(file,before.replace(anchor,anchor+'\n'+addition),'utf8');
}
NODE
npm run build
npx cap copy android
(cd android && ./gradlew :app:assembleDebug --no-daemon --max-workers=2)
APK=android/app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
unzip -Z1 "$APK" | grep -Fxq assets/public/src/admin-v4-app.js
unzip -Z1 "$APK" | grep -Fxq assets/public/src/room-v5-integrity.js
install -m 0644 "$APK" web/Akira-Voice-Chat.apk
install -m 0644 "$APK" dist/Akira-Voice-Chat.apk
COMPLETED=1
echo "AKIRA LIVE WEB V5 + APK SUCCESSFUL"
echo "Backup: $BACKUP"
echo "Admin: https://api.soverixnet.online/admin-v2"
echo "App: https://voice.soverixnet.online"
echo "APK: https://voice.soverixnet.online/Akira-Voice-Chat.apk?v=admin-v5-20261026"
