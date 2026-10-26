#!/usr/bin/env bash
# Akira V7 client rollout. Default: read-only preflight; --apply: backup, build, verify, rollback.
set -Eeuo pipefail
umask 077
APP=/opt/akira
BRANCH=feature/akira-v7-voice-games-wallet-20261027
REF=4888765e43d2810b2f2cd51913cea191ed6f90c7
MODE="${1:---check}"
[[ "$MODE" == --check || "$MODE" == --apply ]] || { echo 'Usage: bash deploy-akira-v7-client-20261027.sh [--check|--apply]' >&2; exit 2; }
[[ "$(id -u)" == 0 ]] || { echo 'Must run as root on the Akira VPS' >&2; exit 2; }
cd "$APP"
for f in web/index.html web/room.html web/src/app.js web/src/room.js web/src/room-live.js web/src/game-overlay-v6.js web/src/wallet-v6.js web/src/admin-v4-app.js android/app/build.gradle android/app/src/main/java/com/akira/voice/MainActivity.java; do
  [[ -f "$f" ]] || { echo "Missing current live file: $f. Stopped safely." >&2; exit 2; }
done
grep -Fq 'src/wallet-v6.js' web/index.html || { echo 'Live HTML is not the verified V6 layout. Stopped; review current HTML first.' >&2; exit 2; }
grep -Fq 'src/admin-v4-app.js' web/index.html || { echo 'Live admin hook missing. Stopped to preserve admin.' >&2; exit 2; }
grep -Fq 'vendor/livekit-client.umd.min.js' web/room.html || { echo 'Bundled LiveKit loader missing. Stopped for voice safety.' >&2; exit 2; }
grep -Fq 'android.permission.RECORD_AUDIO' android/app/src/main/AndroidManifest.xml || { echo 'Android RECORD_AUDIO permission missing. Stopped.' >&2; exit 2; }
[[ -s web/vendor/livekit-client.umd.min.js ]] || { echo 'Bundled LiveKit library is missing. Stopped.' >&2; exit 2; }
curl -fsS --max-time 8 http://127.0.0.1:4301/health | grep -Fq '"ok":true' || { echo 'Live API is unhealthy. Stopped.' >&2; exit 2; }
[[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:4301/api/v1/games/overview)" == 401 ]] || { echo 'Game overview did not require login (HTTP 401 expected); stopped for wallet safety.' >&2; exit 2; }

echo 'Fetching pinned, CI-tested V7 client source into a separate staging area...'
git fetch --no-tags origin "$BRANCH"
git merge-base --is-ancestor "$REF" FETCH_HEAD || { echo 'Verified V7 revision is not in the fetched branch. Stopped.' >&2; exit 2; }
mkdir -p "$APP/security-backups"
STAGE=$(mktemp -d "$APP/security-backups/.v7-client-stage.XXXXXX")
BACKUP=''
CHANGED=0
DONE=0
declare -a COPY_FILES=(
  web/src/game-overlay.js
  web/src/game-overlay-v6.js
  web/src/wallet-v7.js
  web/src/google-login-v7.js
  web/food-wheel/game.js
  web/jackpot-fruit/index.html
  android/app/src/main/java/com/akira/voice/AkiraGoogleLoginPlugin.java
)
for asset in shrimp fish chicken steak cabbage corn carrot tomato salad pizza; do
  COPY_FILES+=("web/food-wheel/img/$asset.webp")
done
stage_file(){
  local path="$1" target="$STAGE/$1"
  mkdir -p "$(dirname "$target")"
  git show "$REF:$path" > "$target"
  [[ "$(git hash-object "$target")" == "$(git rev-parse "$REF:$path")" ]] || { echo "Staged asset mismatch: $path" >&2; exit 2; }
}
for file in "${COPY_FILES[@]}"; do stage_file "$file"; done
mkdir -p "$STAGE/web" "$STAGE/android/app/src/main/java/com/akira/voice" "$STAGE/android/app"
cp -p web/index.html "$STAGE/web/index.html"
cp -p android/app/build.gradle "$STAGE/android/app/build.gradle"
cp -p android/app/src/main/java/com/akira/voice/MainActivity.java "$STAGE/android/app/src/main/java/com/akira/voice/MainActivity.java"
node - "$STAGE" <<'NODE'
const fs=require('fs'), stage=process.argv[2];
function edit(p,fn){const file=stage+'/'+p;fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')))}
function once(source,oldText,newText,label){
 const n=source.split(oldText).length-1;
 if(n!==1)throw Error(label+': expected exactly one live anchor, found '+n);
 return source.replace(oldText,newText);
}
edit('web/index.html',s=>{
 s=once(s,'<script src="src/wallet-v6.js"></script>','<script src="src/google-login-v7.js"></script>\n<script src="src/wallet-v7.js"></script>','wallet replacement');
 if(s.includes('src/google-login-v7.js')&&s.split('src/google-login-v7.js').length!==2)throw Error('duplicate Google login');
 if(s.includes('src/game-overlay.js?v=restore20261025'))throw Error('stale duplicate game overlay script');
 s=s.replace('id="rf" title="Voice room"></iframe>','id="rf" title="Voice room" allow="microphone; autoplay"></iframe>');
 return s;
});
edit('android/app/build.gradle',s=>{
 const deps=["implementation 'androidx.credentials:credentials:1.6.0'","implementation 'androidx.credentials:credentials-play-services-auth:1.6.0'","implementation 'com.google.android.libraries.identity.googleid:googleid:1.2.1'"];
 const missing=deps.filter(x=>!s.includes(x));
 if(!s.includes('dependencies {'))throw Error('Android dependencies anchor missing');
 return s.replace('dependencies {','dependencies {\n    '+missing.join('\n    '));
});
edit('android/app/src/main/java/com/akira/voice/MainActivity.java',s=>{
 if(s.includes('registerPlugin(AkiraGoogleLoginPlugin.class);'))return s;
 const classOpen=/public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/;
 if(!classOpen.test(s))throw Error('MainActivity does not extend BridgeActivity; review before altering');
 if(/\bonCreate\s*\(/.test(s)){
   const supers=[...s.matchAll(/super\.onCreate\([^;]*\);/g)];
   if(supers.length!==1)throw Error('MainActivity onCreate override must call super exactly once');
   return s.replace(supers[0][0],'registerPlugin(AkiraGoogleLoginPlugin.class);\n        '+supers[0][0]);
 }
 return s.replace(classOpen,m=>m+'\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(AkiraGoogleLoginPlugin.class);\n        super.onCreate(savedInstanceState);\n    }');
});
NODE
for f in web/src/game-overlay.js web/src/game-overlay-v6.js web/src/wallet-v7.js web/src/google-login-v7.js web/food-wheel/game.js; do
  node --check "$STAGE/$f"
done
if [[ "$MODE" == --check ]]; then
  echo 'V7 PRECHECK PASSED. No live application files were changed.'
  echo "Pinned revision: $REF"
  echo "Current APK SHA256: $(sha256sum dist/Akira-Voice-Chat.apk 2>/dev/null | awk '{print $1}')"
  echo 'Next step when ready: run the same script with --apply. It backs up and rolls back on failure.'
  exit 0
fi

BACKUP=$(mktemp -d "$APP/security-backups/20261027-v7-client.XXXXXX")
echo "Backup: $BACKUP"
declare -a TARGETS=("${COPY_FILES[@]}" web/index.html android/app/build.gradle android/app/src/main/java/com/akira/voice/MainActivity.java web/Akira-Voice-Chat.apk dist/Akira-Voice-Chat.apk)
for file in "${TARGETS[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$BACKUP/original/$(dirname "$file")"
    cp -p "$file" "$BACKUP/original/$file"
  fi
done
[[ ! -d dist ]] || cp -a dist "$BACKUP/dist-original"
[[ ! -d android/app/src/main/assets/public ]] || cp -a android/app/src/main/assets/public "$BACKUP/native-public-original"
rollback(){
  local result=$?
  if [[ "$DONE" != 1 && "$CHANGED" == 1 ]]; then
    echo "V7 build/verification failed; restoring original live files from $BACKUP" >&2
    for file in "${TARGETS[@]}"; do
      if [[ -f "$BACKUP/original/$file" ]]; then
        mkdir -p "$(dirname "$file")"; cp -p "$BACKUP/original/$file" "$file"
      else
        rm -f -- "$file"
      fi
    done
    if [[ -d "$BACKUP/dist-original" ]]; then
      if [[ -d dist ]]; then mv dist "$BACKUP/failed-dist"; fi
      cp -a "$BACKUP/dist-original" dist
    fi
    if [[ -d "$BACKUP/native-public-original" ]]; then
      if [[ -d android/app/src/main/assets/public ]]; then mv android/app/src/main/assets/public "$BACKUP/failed-native-public"; fi
      cp -a "$BACKUP/native-public-original" android/app/src/main/assets/public
    fi
    echo 'Previous live web assets and published APK restored.' >&2
  fi
  return "$result"
}
trap rollback EXIT
CHANGED=1
for file in "${COPY_FILES[@]}" web/index.html android/app/build.gradle android/app/src/main/java/com/akira/voice/MainActivity.java; do
  install -D -m 0644 "$STAGE/$file" "$APP/$file"
done
npm run build
npx cap copy android
(cd android && ./gradlew :app:assembleDebug --no-daemon --max-workers=2)
APK=android/app/build/outputs/apk/debug/app-debug.apk
[[ -s "$APK" ]] || { echo 'APK build missing' >&2; exit 1; }
for file in src/wallet-v7.js src/google-login-v7.js src/game-overlay.js food-wheel/game.js jackpot-fruit/index.html vendor/livekit-client.umd.min.js; do
  unzip -Z1 "$APK" | grep -Fx "assets/public/$file" >/dev/null || { echo "APK missing $file" >&2; exit 1; }
done
install -m 0644 "$APK" web/Akira-Voice-Chat.apk
install -m 0644 "$APK" dist/Akira-Voice-Chat.apk
curl -fsS --max-time 8 http://127.0.0.1:4301/health | grep -Fq '"ok":true'
DONE=1
echo 'Akira V7 client and Android APK deployed. Server, database, wallet transactions, and admin panel were NOT modified.'
echo "APK: https://voice.soverixnet.online/Akira-Voice-Chat.apk?v=v7-client-20261027"
echo "Backup: $BACKUP"
echo 'Google sign-in additionally requires the server Google OAuth endpoint and the configured Web OAuth client ID.'
