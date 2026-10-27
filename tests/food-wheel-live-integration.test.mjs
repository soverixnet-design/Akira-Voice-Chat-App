import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const wheel=readFileSync(new URL('../web/food-wheel/game.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../server/src/server.mjs',import.meta.url),'utf8');

test('Food Wheel keeps original visual game and parses',()=>{
 const checked=spawnSync(process.execPath,['--check'],{input:wheel,encoding:'utf8',timeout:10000});
 assert.equal(checked.status,0,checked.stderr);
 for(const name of ['buildWheel','buildChips','animateSpin','renderBets','placeBet'])assert(wheel.includes(name),name);
});
test('production Food Wheel never boots a fake game round or mints local prize coins',()=>{
 const boot=wheel.slice(wheel.indexOf('/* ---------------- BOOT ---------------- */'));
 assert.match(boot,/S\.mode = 'akira'/);
 assert.doesNotMatch(boot,/demoStartBetting\(\)/);
 assert.doesNotMatch(boot,/pickRandom\(\)/);
 assert.match(wheel,/akiraServerClockOffset/);
 assert.match(wheel,/\/games\/food-wheel\/round/);
 assert.match(wheel,/\/games\/food-wheel\/bets/);
 assert.match(wheel,/akiraBetsBusy/);
 assert.match(wheel,/receipt\.balance/);
 assert.match(wheel,/previousMyResult/);
 assert.match(wheel,/e\.source !== window\.parent \|\| e\.origin !== location\.origin/);
});
test('authenticated API returns real wallet and round bet totals with explicit engine status',()=>{
 assert.match(api,/AKIRA_GAME_ENGINE_ENABLED/);
 assert.match(api,/bettingEnabled:engineOn&&gameEnabled/);
 assert.match(api,/reason:!engineOn\?'game_engine_disabled':!gameEnabled\?'game_disabled'/);
 assert.match(api,/SUM\(amount\)::text AS total/);
 assert.match(api,/COUNT\(DISTINCT user_id\)::int AS players/);
 assert.match(api,/previousMyResult/);
 assert.match(api,/await placeGameBet\(user\.id,betMatch\[1\],body\)/);
});
