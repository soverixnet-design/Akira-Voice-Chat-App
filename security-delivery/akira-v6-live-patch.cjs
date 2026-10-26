/* Akira V6 surgical live patch. Original designs, DB and API untouched. */
'use strict';
const fs = require('node:fs');
const files = new Map();
function current(path) {
  if (!files.has(path)) files.set(path, fs.readFileSync(path, 'utf8'));
  return files.get(path);
}
function one(path, from, to) {
  const body = current(path);
  const n = body.split(from).length - 1;
  if (n !== 1) throw Error(path + ': expected one anchor, got ' + n + ': ' + from.slice(0, 80));
  files.set(path, body.replace(from, to));
}
function replaceRegex(path, rx, to) {
  const body = current(path);
  const matches = [...body.matchAll(rx)];
  if (matches.length !== 1) throw Error(path + ': expected 1 regex match, got ' + matches.length);
  files.set(path, body.replace(rx, to));
}
const home = 'web/src/app.js';
const originalHome = current(home);
const foundCoinLabels = originalHome.match(/bn\(coins\(\)\)/g) || [];
if (foundCoinLabels.length !== 3) throw Error('Home coin labels changed; not patching');
files.set(home, originalHome.replaceAll('bn(coins())',
  '(window.akiraCompactCoins?window.akiraCompactCoins(coins()):bn(coins()))'));
const index = 'web/index.html';
one(index, '<script src="src/game-overlay.js?v=restore20261025"></script>', '');
one(index, '<script src="src/admin-v4-app.js"></script>', '<script src="src/admin-v4-app.js"></script>\n<script src="src/wallet-v6.js"></script>\n<script src="src/game-overlay-v6.js"></script>');
const room = 'web/room.html';
one(room, '<script src="src/room-v5-integrity.js"></script>', '<script src="src/room-v5-integrity.js"></script>\n<script src="src/room-v6-permission.js"></script>\n<script src="src/room-v6-giftbox.js"></script>');
one(room, '<script src="https://cdn.jsdelivr.net/npm/livekit-client@2.15.1/dist/livekit-client.umd.min.js"></script>', '<script src="vendor/livekit-client.umd.min.js"></script>');
one('web/src/room.js', 'await room.localParticipant.setMicrophoneEnabled(!myMute);', 'await room.localParticipant.setMicrophoneEnabled(Boolean(window.__akiraVoiceSeatActive && !myMute));');
one('web/src/room-live.js',
  "try{await akiraVoiceRoom.localParticipant.setMicrophoneEnabled(allowed)}",
  "try{if(allowed&&typeof window.akiraEnsureMicPermission==='function'){const permission=await window.akiraEnsureMicPermission();if(!permission)throw Error('microphone_permission_denied')};await akiraVoiceRoom.localParticipant.setMicrophoneEnabled(allowed)}");
const food = 'web/food-wheel/game.js';
one(food, 'chips: [10, 100, 1000, 5000, 10000],', 'chips: [1000, 10000, 100000, 1000000, 10000000],');
one(food, 'maxBetPerRound: 1000000,', 'maxBetPerRound: Number.MAX_SAFE_INTEGER,');
one(food, 'startBalance: 50000,', 'startBalance: 0,');
one(food, 'if (!akiraToken || !akiraLiveActive) return true;', "if (!akiraToken || !akiraLiveActive) { toast('Live game server unavailable'); return false; }");
one(food, "akiraLiveActive = false;\n        return true;", "akiraLiveActive = false;\n        toast('Server betting round not open');\n        return false;");
one(food, 'if (!(result >= 0 && result < OUT.length)) result = pickRandom();',
  "if (!(result >= 0 && result < OUT.length)) { if (akiraToken) { S.phase = 'connecting'; renderHub(); toast('Waiting for verified server result'); setTimeout(demoStartBetting, 3500); return; } result = pickRandom(); }");
one(food, 'if (!window.__akiraServerSettled) {\n      S.balance += winAmt;\n    }',
  'if (!akiraToken && !window.__akiraServerSettled) {\n      S.balance += winAmt;\n    }');
one(food, 'S.lastWin = winAmt; recordDailyWin(winAmt);',
  'S.lastWin = winAmt; if (!akiraToken) recordDailyWin(winAmt);');
const jackpot='web/jackpot-fruit/index.html';
one(jackpot, 'CH=[100,1000,10000,100000]', 'CH=[1000,10000,100000,1000000,10000000]');
one(jackpot, "['🔵','🟡','🟠','🟣'][i]", "['🔵','🟡','🟠','🟣','🔴'][i]");
one(jackpot, 'let bal=12450,akiraToken=', 'let bal=0,akiraToken=');
one(jackpot, 'rd=1500,td=0,jp=21817399', 'rd=1500,td=0,jp=0');
one(jackpot, "  bal-=chip;bets[i]+=chip;jp+=chip*.05;snd(520,.06);ui();",
  "  return msg('Live game server unavailable');");
one(jackpot, "async function spin(){phase='spin';ui();",
  "async function spin(){if(!akiraToken||!akiraLive){phase='bet';t=20;msg('Live game server unavailable');syncAkiraWallet();ui();return;}phase='spin';ui();");
one(jackpot, "let p=Math.floor(Math.random()*8),n=24+",
  "if(!serverSettled){phase='bet';t=20;msg('Waiting for server result');syncAkiraWallet();ui();return;}\nlet p=Math.floor(Math.random()*8),n=24+");
one(jackpot, 'if(serverSettled){serverSettled=false;syncAkiraWallet();}else{bal+=g;td+=g;}',
  'if(serverSettled){serverSettled=false;syncAkiraWallet();}else{g=0;syncAkiraWallet();}');
one(jackpot, 'jp+=Math.random()*30;if(phase', 'if(phase');
for (const [path, data] of files) {
  if (process.env.AKIRA_V6_VALIDATE === '1') {
    console.log('Validated ' + path + ' (' + data.length + ' chars)');
  } else {
    fs.writeFileSync(path, data);
    console.log('Patched ' + path);
  }
}
