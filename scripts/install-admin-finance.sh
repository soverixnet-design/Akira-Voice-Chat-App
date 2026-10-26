#!/usr/bin/env bash
# Add finance controls to the existing Akira admin without replacing the existing app.
# Does NOT send coins or overwrite any locally modified application source code.
set -Eeuo pipefail
ROOT="${AKIRA_ROOT:-/opt/akira}"
BASE="https://api.soverixnet.online"
BRANCH="fix/akira-ci-auth-20261025"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/backups/admin-finance-$STAMP"
TMP="$(mktemp)"
declare -a MODIFIED=()
INSTALLING=0
COMPLETE=0
cleanup() { rm -f -- "$TMP"; }
rollback(){
  echo "Finance page verification failed; restoring previous admin files." >&2
  for f in "${MODIFIED[@]}"; do
    if [[ -e "$BACKUP/files/$f" ]]; then
      cp -a "$BACKUP/files/$f" "$ROOT/$f"
    else
      rm -f "$ROOT/$f"
    fi
  done
}
on_exit(){
  local code=$?
  trap - EXIT
  if [[ "$code" -ne 0 && "$INSTALLING" == 1 && "$COMPLETE" == 0 ]]; then
    rollback || true
  fi
  cleanup
  exit "$code"
}
trap on_exit EXIT
[[ -d "$ROOT/.git" && -f "$ROOT/server/src/admin.html" && -d "$ROOT/web" ]] ||
  { echo 'Cannot find Akira server. No changes made.' >&2; exit 1; }
echo '=== CHECK FINANCE ENDPOINTS SAFELY (NO TOKEN, NO COIN CHANGES) ==='
for path in /api/v1/admin/wallet/recharge /api/v1/admin/sellers/allocate /api/v1/admin/sellers/status; do
  code="$(curl --max-time 12 --silent --show-error -o /dev/null -w '%{http_code}' \
    -X POST -H 'Content-Type: application/json' -d '{}' "$BASE$path")"
  echo "$path HTTP $code"
  if [[ "$code" != '401' ]]; then
    echo "STOP: $path did not reject an unauthenticated request as expected." >&2
    echo 'Do NOT deploy UI yet. The running API differs from the tested backend or is inaccessible.' >&2
    exit 1
  fi
done
echo '=== VERIFY EXISTING FINANCE DATABASE TABLES (READ ONLY) ==='
if ! docker container inspect akira-postgres >/dev/null 2>&1; then
  echo 'STOP: Existing akira-postgres database container not found. No changes made.' >&2
  exit 1
fi
SCHEMA_READY="$(docker exec akira-postgres psql -U akira -d akira_db -Atc \
  "SELECT to_regclass('public.akira_wallets') IS NOT NULL AND
   to_regclass('public.akira_seller_wallets') IS NOT NULL AND
   to_regclass('public.akira_seller_allocations') IS NOT NULL AND
   to_regclass('public.akira_seller_transfers') IS NOT NULL AND
   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='akira_seller_wallets' AND column_name='enabled');")"
if [[ "$SCHEMA_READY" != 't' ]]; then
  echo 'STOP: Seller wallet schema needs repair/migration first. No data changed.' >&2
  exit 1
fi
echo 'Verified original wallet and seller balances tables.'
echo '=== COPY REVIEWED GITHUB FINANCE PAGE ==='
git -C "$ROOT" fetch origin "$BRANCH"
git -C "$ROOT" show FETCH_HEAD:web/admin-finance.html > "$TMP"
grep -q 'Akira Wallet Recharge & Coin Seller Management' "$TMP" ||
  { echo 'Unexpected candidate file; aborting' >&2; exit 1; }
mkdir -p "$BACKUP/files"
# Record and back up only files that this script will touch.
for f in web/admin-finance.html dist/admin-finance.html server/src/admin.html web/admin.html dist/admin.html; do
  [[ "$f" == dist/* && ! -d "$ROOT/dist" ]] && continue
  [[ "$f" == web/admin.html && ! -f "$ROOT/$f" ]] && continue
  [[ "$f" == dist/admin.html && ! -f "$ROOT/$f" ]] && continue
  MODIFIED+=("$f")
  mkdir -p "$BACKUP/files/$(dirname "$f")"
  if [[ -f "$ROOT/$f" ]]; then cp -a "$ROOT/$f" "$BACKUP/files/$f"; fi
done
INSTALLING=1
install -m 0644 "$TMP" "$ROOT/web/admin-finance.html"
if [[ -d "$ROOT/dist" ]]; then install -m 0644 "$TMP" "$ROOT/dist/admin-finance.html"; fi
# Add one small finance link, leaving every existing admin component and handler intact.
python3 - "$ROOT" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1])
link='<a id="akira-finance-link-v1" href="/app/admin-finance.html" style="position:fixed;right:12px;bottom:12px;z-index:100000;padding:11px 14px;background:#8145c9;color:white;border-radius:14px;text-decoration:none;box-shadow:0 4px 20px #0008;font:700 14px system-ui">💰 Wallet Recharge · Coin Sellers</a>'
for relative in ('server/src/admin.html','web/admin.html','dist/admin.html'):
 p=root/relative
 if not p.is_file(): continue
 html=p.read_text()
 if 'akira-finance-link-v1' in html: continue
 idx=html.lower().rfind('</body>')
 if idx < 0:
  raise RuntimeError('Missing </body> in '+relative)
 p.write_text(html[:idx]+link+'\n'+html[idx:])
 print('Finance link added:',relative)
PY
echo '=== VERIFY PUBLIC FINANCE PAGE ==='
CHECK="$(mktemp)"
if ! curl --fail --silent --show-error --max-time 15 "$BASE/app/admin-finance.html" -o "$CHECK" ||
   ! grep -q 'Akira Wallet Recharge & Coin Seller Management' "$CHECK"; then
  rm -f "$CHECK"
  echo 'The server did not serve the new page from /app; no live coin data changed.' >&2
  exit 1
fi
rm -f "$CHECK"
COMPLETE=1
echo 'FINANCE PANEL INSTALLED; USER DATA AND WALLET BALANCES UNCHANGED.'
echo "Open: $BASE/app/admin-finance.html"
echo 'Open the existing /admin page to find Wallet Recharge / Coin Sellers button.'
echo "Backup: $BACKUP"
echo 'Test with one authorized Super Admin login and a controlled test account before real recharge.'
