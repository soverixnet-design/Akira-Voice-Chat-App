import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Android Google sign-in requires server verified tokens',()=>{
  const native=file('android/app/src/main/java/com/akira/voice/AkiraGoogleLoginPlugin.java');
  const js=file('web/src/google-login-v7.js');
  const server=file('server/src/google-auth.mjs');
  assert.match(native,/CredentialManager\.create/);
  assert.match(native,/GoogleIdTokenCredential\.createFrom/);
  assert.match(js,/api\/v1\/auth\/google/);
  assert.match(js,/data\.token/);
  assert.match(server,/verifyIdToken/);
  assert.match(server,/auth_subject/);
});
test('wallet shows real balance and compact units without local minting',()=>{
  const js=file('web/src/wallet-v7.js');
  assert.match(js,/request\('\/api\/v1\/wallet'\)/);
  assert.match(js,/Exact balance:/);
  assert.match(js,/1000000n, 'M'/);
  assert.doesNotMatch(js,/\.coins\s*\+=/);
});
test('Food Wheel and Jackpot cannot spend offline demo coins',()=>{
  const food=file('web/food-wheel/game.js');
  const jackpot=file('web/jackpot-fruit/index.html');
  assert.match(food,/akiraApi\('\/games\/food-wheel\/bets'/);
  assert.doesNotMatch(food,/demoStartBetting\(\);\s*return/);
  assert.match(food,/akiraLiveActive/);
  assert.match(food,/maxBetPerRound: Number\.MAX_SAFE_INTEGER/);
  assert.match(jackpot,/if\(!akiraToken\|\|!akiraLive\)return msg\('Live game server unavailable'\)/);
  assert.match(jackpot,/if\(!serverSettled\)/);
  assert.doesNotMatch(jackpot,/bal-=chip/);
  assert.doesNotMatch(jackpot,/jp\+=Math\.random/);
});
test('LiveKit is packaged and microphone is requested before joining seats',()=>{
  const room=file('web/room.html');
  const build=file('scripts/build.mjs');
  const seat=file('web/src/room-live.js');
  assert.match(room,/vendor\/livekit-client\.umd\.min\.js/);
  assert.doesNotMatch(room,/cdn\.jsdelivr/);
  assert.match(build,/sdkSha/);
  assert.match(seat,/akiraEnsureMicPermission/);
});

test('verified ID seller transfers debit the real seller ledger',()=>{
  const ui=file('web/src/wallet-v7.js');
  const backend=file('server/src/server.mjs');
  const ledger=file('server/src/seller-wallet.mjs');
  assert.match(ui,/community\\/seller-recipient\\?id=/);
  assert.match(ui,/seller\\/wallet/);
  assert.match(ui,/seller\\/transfer/);
  assert.match(ui,/crypto\\.randomUUID\\(\\)/);
  assert.match(backend,/sellerSend\\(user\\.id,body\\.publicId,body\\.amount,body\\.requestId\\)/);
  assert.match(ledger,/INSERT INTO akira_wallet_transactions/);
});
test('room seat and Google login API routes are in the real server handler',()=>{
  const server=file('server/src/server.mjs');
  const control=file('server/src/control.mjs');
  assert.match(server,/auth\\/google\\/config/);
  assert.match(server,/const seatRoute/);
  assert.match(control,/publicPath&&section==='gift-policy'/);
});
