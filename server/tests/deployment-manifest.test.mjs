import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const script=read('scripts/deploy-akira-seller-safe.sh');
const server=read('server/src/server.mjs');
const manifest=script.match(/\bFILES=\(([\s\S]*?)\)\s*\nSAVE=/)?.[1];
test('production deploy manifest exists and includes every new server dependency',()=>{
 assert.ok(manifest);
 for(const module of ['seller-wallet','seller-admin','room-seats','rooms','account-deletion','daily-rewards','google-auth','game-bets']){
  assert.match(server,new RegExp("from './"+module+"\\.mjs'"));
  const filename='server/src/'+module+'.mjs';
  assert.ok(existsSync(resolve(root,filename)),filename+' exists');
  assert.ok(manifest.includes(filename),filename+' present in rollout manifest');
 }
});
test('npm dependencies used by new live API are in deployed package manifest',()=>{
 const pkg=JSON.parse(read('server/package.json'));
 assert.ok(manifest.includes('server/package.json'),'deploy updated package.json before API image build');
 assert.ok(pkg.dependencies['google-auth-library'],'Google OIDC dependency is installed by Dockerfile');
 assert.match(read('server/Dockerfile'),/COPY package\.json/);
});
test('every additive schema migration required by current APIs is applied by rollout',()=>{
 for(const number of ['011_room_seats','012_deletion_requests','013_user_safety','014_daily_rewards']){
  const filename='server/migrations/'+number+'.sql';
  assert.ok(existsSync(resolve(root,filename)),filename+' exists');
  assert.ok(manifest.includes(filename),filename+' included in copy manifest');
  assert.ok(script.includes('< "$REVIEW/'+filename+'"'),filename+' applied before starting API');
 }
});
test('read-only staging probes are inside Docker container rather than unreliable host forwarding',()=>{
 assert.match(script,/docker exec "\$CONTAINER" node -e/);
 assert.match(script,/docker exec -i -e AKIRA_API_BASE=http:\/\/127\.0\.0\.1:4301/);
 assert.doesNotMatch(script,/127\.0\.0\.1:\$\{?STAGE_PORT/);
});
test('rollout preserves original app and known financial/service settings',()=>{
 assert.doesNotMatch(manifest,/web\/src\/app\.js|web\/admin\.html|server\/src\/control\.mjs|\.apk/);
 assert.match(script,/RESTORING previous API and UI/);
 assert.match(script,/pg_dump -U akira -d akira_db -Fc/);
 assert.match(script,/AKIRA_LIVEKIT_API_SECRET/);
 assert.match(script,/AKIRA_GOOGLE_WEB_CLIENT_ID/);
 assert.match(script,/AKIRA_GAME_ENGINE_ENABLED/);
});
