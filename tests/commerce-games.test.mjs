import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';

const food=readFileSync(new URL('../web/food-wheel/game.js',import.meta.url),'utf8');
const jackpot=readFileSync(new URL('../web/jackpot-fruit/index.html',import.meta.url),'utf8');
const overlay=readFileSync(new URL('../web/src/game-overlay.js',import.meta.url),'utf8');
const safe=readFileSync(new URL('../web/src/wallet-safety.js',import.meta.url),'utf8');

test('both original games use the HTTPS authenticated Akira API',()=>{
 assert.match(food,/akiraApi\('\/games\/overview'\)/);
 assert.match(jackpot,/akiraApi\('\/games\/overview'\)/);
 assert.match(food,/api\.soverixnet\.online/);
 assert.match(jackpot,/api\.soverixnet\.online/);
});
test('game overlay loads original game screens and keeps live room mounted',()=>{
 assert.match(overlay,/includes\(game\)/);
 assert.match(overlay,/food-wheel\/index\.html/);
 assert.match(overlay,/jackpot-fruit\/index\.html/);
 assert.doesNotMatch(overlay,/game-live\.html\?game=/);
 assert.doesNotMatch(overlay,/removeChild|replaceChildren|iframe\.remove/);
});
test('demo recharge and exchange cannot mint fake server coins',()=>{
 assert.match(safe,/originalAddCoins/);
 assert.match(safe,/window\.akiraToken/);
 assert.match(safe,/#rcp \[data-p\],#rcp \[data-e\]/);
 assert.match(safe,/stopImmediatePropagation/);
});
