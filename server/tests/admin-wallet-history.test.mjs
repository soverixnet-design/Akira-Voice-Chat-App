import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminWalletHistory} from '../src/admin-wallet-history.mjs';
function fixture(admin={role:'super_admin'},exists=true){
 const calls=[];
 return {calls,deps:{requireAdmin:async()=>admin,getPool:()=>({query:async(sql,args)=>{calls.push({sql,args});return {rows:sql.includes('FROM akira_users')?(exists?[{id:7,public_id:100001,display_name:'Test'}]:[]):[{balance:'12345'}]}}}),walletHistory:async id=>{assert.equal(id,7);return [{delta:'-10',balanceAfter:'12345'}]}}};
}
test('unauthenticated and non-owner admins cannot read wallet data',async()=>{
 for(const admin of [{status:401,error:'unauthorized'},{role:'moderator'},{role:'admin'}]){
 const f=fixture(admin);const r=await adminWalletHistory('', '100001',f.deps);assert.ok([401,403].includes(r.status));assert.equal(f.calls.length,0);
 }
});
test('invalid IDs never reach the database',async()=>{
 const f=fixture();for(const id of [null,'1','100001 OR 1=1'])assert.equal((await adminWalletHistory('',id,f.deps)).status,400);assert.equal(f.calls.length,0);
});
test('missing users return 404',async()=>{const f=fixture(undefined,false);assert.equal((await adminWalletHistory('','100001',f.deps)).status,404)});
test('reads original balance and history without modifying the database',async()=>{
 const f=fixture();const r=await adminWalletHistory('','100001',f.deps);assert.equal(r.status,200);assert.equal(r.body.balance,'12345');assert.equal(r.body.transactions[0].delta,'-10');assert.deepEqual(f.calls[0].args,['100001']);assert.ok(f.calls.every(c=>c.sql.startsWith('SELECT')));
});
