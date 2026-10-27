import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const api=read('server/src/server.mjs');
const admin=read('web/admin-connected.html');
const app=read('web/index.html');
const room=read('web/room.html');
const stage=read('scripts/deploy-akira-seller-safe.sh');
const android=read('android/variables.gradle');
test('original live Admin finance and safety routes are preserved and protected',()=>{
 const control=read('server/src/control.mjs');
 assert.match(api,/controlRoutes\(req, url, send\)/);
 assert.match(control,/requireAdmin\(req\.headers\.authorization\)/);
 for(const section of ["section==='wallet'","section==='sellers'","section==='seller-funds'","section==='reports'","section==='deletion-requests'"]){
  assert(control.includes(section),'Missing protected live Admin section '+section);
 }
 assert(api.includes('/api/v1/admin/sellers/status'));
 assert(api.includes('/api/v1/admin/sellers/allocate'));
 assert.match(admin,/function plannedPage\(/);
});
test('Akira loads authenticated wallet and seller scripts without replacing existing UI',()=>{
 for(const script of ['src/seller-panel.js','src/seller-directory.js','src/wallet-sync.js','src/wallet-safety.js','src/account-deletion-ui.js']){
  assert(app.includes(script),'Missing app feature script '+script);
 }
 for(const script of ['src/room.js','src/room-live.js']){
  assert(room.includes(script),'Missing room feature script '+script);
 }
});
test('voice mic seats, game debits and deletion requests are protected at server',()=>{
 for(const route of ['seatRoute','game_engine_disabled','/api/v1/account/deletion-request']){
  assert(api.includes(route),'Missing protected gate '+route);
 }
 const seats=read('server/src/room-seats.mjs');
 assert.match(seats,/BEGIN/);
 assert.match(seats,/seat_taken/);
 assert.match(seats,/owner_required/);
 assert.match(seats,/ROLLBACK/);
});
test('safe staging checks container health and avoids destructive Git commands',()=>{
 assert.match(stage,/docker exec "\$CONTAINER" node -e/);
 assert.match(stage,/--check/);
 assert.match(stage,/pg_dump/);
 assert.match(stage,/RESTORING previous API/);
 const executable=stage.split('\n').filter(line=>!line.trimStart().startsWith('#')).join('\n');
 assert(!stage.split('\n').some(line=>/^\s*(?:git reset --hard|git clean -fd|TRUNCATE|DROP TABLE)/.test(line)),'A destructive command is present');
});
test('Play target SDK is 36 but signed release is a separate step',()=>{
 assert.match(android,/targetSdkVersion = 36/);
 assert.match(read('android/app/build.gradle'),/versionCode 2/);
 assert.match(read('android/app/build.gradle'),/versionName "2.1.0"/);
 assert.match(read('web/admin.html'),/Akira Admin Control Center/);
});

test('live Admin handlers stay connected without requiring optional files in fresh CI',()=>{
 assert.match(api,/import \{ controlRoutes \} from '\.\/control\.mjs'/);
 assert.match(api,/import\('\.\/admin-panel\.mjs'\)/);
 assert.match(api,/if \(await controlRoutes\(req, url, send\)\) return/);
});
