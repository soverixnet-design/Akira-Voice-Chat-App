import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const content=source('server/src/admin-content.mjs');
const economy=source('server/src/admin-economy.mjs');
const panel=source('server/src/admin-panel.mjs');
const control=source('server/src/control.mjs');
const schema=source('server/migrations/015_admin_live_modules.sql');
const app=source('web/src/app.js');
const adminUi=source('server/src/admin-v8.html');
const webAdminUi=source('web/admin.html');

test('all three uploaded live Admin modules parse as valid ESM',()=>{
  for(const [path,text] of [
    ['admin-content.mjs',content],['admin-economy.mjs',economy],['admin-panel.mjs',panel]]){
    const result=spawnSync(process.execPath,['--check','--input-type=module'],
      {input:text,encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,path+': '+result.stderr);
  }
});

test('Admin routes remain connected and protected by original role checks',()=>{
  assert.match(control,/optionalLiveModule\('\.\/admin-content\.mjs'\)/);
  assert.match(control,/optionalLiveModule\('\.\/admin-economy\.mjs'\)/);
  assert.match(content,/export async function adminContentRoutes/);
  assert.match(content,/await requireAdmin\(req\.headers\.authorization\)/);
  assert.match(content,/super_admin_required/);
  assert.match(economy,/export async function economyRoutes/);
  assert.match(economy,/await requireAdmin\(req\.headers\.authorization\)/);
  assert.match(economy,/super_admin_required/);
  assert.match(panel,/export function serveAdmin/);
  assert.match(panel,/content-security-policy/);
});

test('connected V8 admin UI is bundled separately from original production admin',()=>{
  assert.match(panel,/\['\/admin-v8','\/admin-v8\/'\]/);
  assert.match(panel,/file='\.\/admin-v8\.html'/);
  assert.equal(adminUi,webAdminUi);
  for(const section of ['tasksPage','promosPage','supportPage','contentPage']){
    assert(adminUi.includes(section),section+' was not connected');
  }
  const script=adminUi.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert(script,'admin V8 inline script missing');
  const result=spawnSync(process.execPath,['--check'],{input:script[1],encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('server-verified tasks credit real wallet once and use current daily reward proof',()=>{
  assert.match(economy,/SELECT balance FROM akira_wallets WHERE user_id=\$1 FOR UPDATE/);
  assert.match(economy,/akira_wallet_transactions/);
  assert.match(economy,/akira_daily_reward_claims WHERE user_id=\$1/);
  assert.match(economy,/akira_task_claims WHERE task_id=\$1 AND user_id=\$2/);
  assert.match(economy,/task_requirements_not_met/);
  assert.match(app,/appendVerifiedDailyTasks\(token\)/);
  assert.match(app,/api\/v1\/community\/tasks\/claim/);
  assert.match(app,/result\.duplicate/);
});

test('new Admin schema adds tables without destroying existing accounts or coins',()=>{
  for(const name of ['akira_admin_content','akira_support_tickets','akira_admin_promos',
                     'akira_promo_redemptions','akira_admin_tasks','akira_task_claims']){
    assert(schema.includes('CREATE TABLE IF NOT EXISTS '+name));
  }
  assert.match(schema,/BEGIN;/);
  assert.match(schema,/COMMIT;/);
  const statements=schema.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
  assert.doesNotMatch(statements,/\b(?:DROP|TRUNCATE|DELETE FROM akira_wallets|UPDATE akira_wallets)\b/i);
});
