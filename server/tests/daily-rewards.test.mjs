import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DAILY_AMOUNTS,claimDailyReward,dailyRewardStatus} from '../src/daily-rewards.mjs';

function fixture({today='2026-10-26',last=null,balance=2000,failLedger=false}={}){
 const calls=[];let released=false,claim=last,coins=balance;
 const client={async query(sql,args=[]){
  calls.push({sql,args});
  if(sql.includes('AS today'))return {rows:[{today}]};
  if(sql.startsWith('SELECT reward_date::text'))return {rows:claim?[claim]:[]};
  if(sql.startsWith('SELECT balance FROM akira_wallets'))return {rows:[{balance:coins}]};
  if(sql.startsWith('INSERT INTO akira_daily_reward_claims')){
   claim={reward_date:args[1],streak:args[2],amount:args[3]};
  }
  if(sql.startsWith('UPDATE akira_wallets'))coins=args[1];
  if(failLedger&&sql.startsWith('INSERT INTO akira_wallet_transactions'))throw Error('test_ledger_failure');
  return {rows:[]};
 },release(){released=true}};
 return {calls,pool:{connect:async()=>client,query:(...args)=>client.query(...args)},balance:()=>coins,released:()=>released};
}
test('new user earns 100 coins in the original wallet and ledger',async()=>{
 const f=fixture();
 const r=await claimDailyReward(7,f.pool);
 assert.equal(r.status,200);assert.equal(r.body.amount,100);assert.equal(r.body.wallet.balance,2100);
 assert(f.calls.some(x=>x.sql.startsWith('INSERT INTO akira_wallet_transactions')&&x.args[3]==='daily_reward'));
 assert.equal(f.calls.at(-1).sql,'COMMIT');
 assert(f.released());
});
test('same UTC day is idempotent; cannot credit twice',async()=>{
 const f=fixture();
 await claimDailyReward(7,f.pool);
 const twice=await claimDailyReward(7,f.pool);
 assert.equal(twice.body.alreadyClaimed,true);
 assert.equal(f.balance(),2100);
 assert.equal(f.calls.filter(x=>x.sql.startsWith('INSERT INTO akira_daily_reward_claims')).length,1);
});
test('consecutive UTC days advance the reward',async()=>{
 const f=fixture({today:'2026-10-26',last:{reward_date:'2026-10-25',streak:4,amount:300}});
 const r=await claimDailyReward(7,f.pool);
 assert.equal(r.body.streak,5);assert.equal(r.body.amount,400);
});
test('nonconsecutive days reset streak',async()=>{
 const f=fixture({today:'2026-10-26',last:{reward_date:'2026-10-22',streak:7,amount:1000}});
 const r=await claimDailyReward(7,f.pool);
 assert.equal(r.body.streak,1);
});
test('7 days wraps to 1 on next day',async()=>{
 const f=fixture({today:'2026-10-26',last:{reward_date:'2026-10-25',streak:7,amount:1000}});
 const r=await claimDailyReward(7,f.pool);
 assert.equal(r.body.streak,1);assert.deepEqual(DAILY_AMOUNTS,[100,150,200,300,400,600,1000]);
});
test('status endpoint never changes wallet',async()=>{
 const f=fixture({today:'2026-10-26',last:{reward_date:'2026-10-26',streak:3,amount:200}});
 const r=await dailyRewardStatus(7,f.pool);
 assert.equal(r.body.claimed,true);assert.equal(r.body.nextReward,300);
 assert(!f.calls.some(x=>/^INSERT|^UPDATE|^DELETE/.test(x.sql)));
});
test('failed ledger credit rolls back the transaction',async()=>{
 const f=fixture({failLedger:true});
 await assert.rejects(()=>claimDailyReward(7,f.pool),/test_ledger_failure/);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');
 assert.equal(f.released(),true);
});
