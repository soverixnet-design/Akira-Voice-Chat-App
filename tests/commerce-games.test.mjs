import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';

const game=readFileSync(new URL('../web/game-live.html',import.meta.url),'utf8');
const overlay=readFileSync(new URL('../web/src/game-overlay.js',import.meta.url),'utf8');
const safe=readFileSync(new URL('../web/src/wallet-safety.js',import.meta.url),'utf8');

test('both games use HTTPS Akira API rather than Capacitor device origin',()=>{
 assert.match(game,/fetch\(\(window\.AKIRA_API_BASE\|\|'https:\/\/api\.soverixnet\.online'\)/);
 assert.doesNotMatch(game,/fetch\('\/api\/v1'/);
 assert.match(game,/jackpot-fruit/);
 assert.match(game,/food-wheel/);
});
test('game overlay supports both games and keeps room mounted',()=>{
 assert.match(overlay,/includes\(game\)/);
 assert.match(overlay,/jackpot-fruit/);
 assert.match(overlay,/game-live\.html\?game=/);
 assert.doesNotMatch(overlay,/removeChild|replaceChildren|iframe\.remove/);
});
test('demo recharge and exchange cannot mint fake server coins',()=>{
 assert.match(safe,/originalAddCoins/);
 assert.match(safe,/window\.akiraToken/);
 assert.match(safe,/#rcp \[data-p\],#rcp \[data-e\]/);
 assert.match(safe,/stopImmediatePropagation/);
});
