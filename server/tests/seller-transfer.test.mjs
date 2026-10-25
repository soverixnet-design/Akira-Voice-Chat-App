import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sellerSend,sellerCredit} from '../src/seller-wallet.mjs';
const req='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function fixture(options={}) {
 const calls=[];
 let released=false;
 const query=async(sql,args)=>{
  calls.push({sql,args});
  if(sql.startsWith('SELECT balance,enabled FROM akira_seller_wallets'))
   return {rows:options.sellerEnabled===false?[]:[{balance:options.sellerBalance??100,enabled:true}]};
  if(sql.startsWith('SELECT recipient_id,amount FROM akira_seller_transfers'))
   return {rows:options.previousTransfer?[{recipient_id:'4',amount:25}]:[]};
  if(sql.startsWith('SELECT id FROM akira_users'))
   return {rows:options.missingUser?[]:[{id:'4'}]};
  if(sql.startsWith('SELECT balance FROM akira_wallets'))
   return {rows:[{balance:options.walletBalance??10}]};
  if(sql.startsWith('INSERT INTO akira_wallet_transactions')&&options.failLedger)throw Error('simulated_ledger_failure');
  if(sql.startsWith('SELECT balance FROM akira_seller_wallets WHERE'))
   return {rows:[{balance:options.sellerBalance??100}]};
  if(sql.startsWith('SELECT seller_id,amount FROM akira_seller_allocations'))
   return {rows:options.previousAllocation?[{seller_id:'4',amount:25}]:[]};
  return {rows:[]};
 };
 return {calls,pool:{async connect(){return {query,release(){released=true}}}},released:()=>released};
}
test('successful seller send credits recipient original wallet atomically',async()=>{
 const f=fixture();
 const result=await sellerSend('3','100004',25,req,f.pool);
 assert.deepEqual(result,{status:200,balance:75,recipientBalance:35,duplicate:false});
 assert.equal(f.calls[0].sql,'BEGIN');
 assert.equal(f.calls.at(-1).sql,'COMMIT');
 assert.equal(f.calls.some(x=>x.sql.startsWith('UPDATE akira_seller_wallets')&&x.args[1]===75),true);
 assert.equal(f.calls.some(x=>x.sql.startsWith('UPDATE akira_wallets')&&x.args[1]===35),true);
 assert.equal(f.calls.some(x=>x.sql.startsWith('INSERT INTO akira_wallet_transactions')&&x.args[3]==='seller_recharge'),true);
 assert.equal(f.calls.some(x=>x.sql.startsWith('INSERT INTO akira_seller_transfers')),true);
 assert.equal(f.released(),true);
});
test('duplicate request does not pay twice',async()=>{
 const f=fixture({previousTransfer:true,sellerBalance:75});
 const result=await sellerSend('3','100004',25,req,f.pool);
 assert.equal(result.duplicate,true);
 assert.equal(result.balance,75);
 assert.equal(f.calls.at(-1).sql,'COMMIT');
 assert.equal(f.calls.filter(x=>/^UPDATE|^INSERT INTO akira_wallet/.test(x.sql)).length,0);
});
test('insufficient inventory leaves both wallets unchanged',async()=>{
 const f=fixture({sellerBalance:10});
 const result=await sellerSend('3','100004',25,req,f.pool);
 assert.equal(result.status,409);
 assert.equal(result.error,'insufficient_seller_balance');
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');
 assert.equal(f.calls.some(x=>x.sql.startsWith('UPDATE')),false);
});
test('cannot send to banned or missing user',async()=>{
 const f=fixture({missingUser:true});
 const result=await sellerSend('3','100004',25,req,f.pool);
 assert.equal(result.status,404);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');
 assert.equal(f.calls.some(x=>x.sql.startsWith('INSERT INTO akira_wallets')),false);
});
test('failed ledger write rolls back seller debit and recipient credit',async()=>{
 const f=fixture({failLedger:true});
 await assert.rejects(()=>sellerSend('3','100004',25,req,f.pool),/simulated_ledger_failure/);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');
 assert.equal(f.released(),true);
});
test('invalid amounts and identifiers never start a transaction',async()=>{
 const f=fixture();
 assert.equal((await sellerSend('3','abc',25,req,f.pool)).status,400);
 assert.equal((await sellerSend('3','100004',0,req,f.pool)).status,400);
 assert.equal((await sellerCredit('1','100004',-1,req,f.pool)).status,400);
 assert.equal(f.calls.length,0);
});
