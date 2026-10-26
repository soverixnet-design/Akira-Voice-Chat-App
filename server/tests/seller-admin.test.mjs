import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {setSellerStatus} from '../src/seller-admin.mjs';

function dbFixture(userExists=true, failOnAudit=false) {
 const calls=[];let released=false;
 const client={
  async query(sql,params) {
   calls.push({sql,params});
   if(sql.startsWith('SELECT id FROM akira_users')) return {rows:userExists?[{id:'27'}]:[]};
   if(failOnAudit && sql.startsWith('INSERT INTO akira_admin_audit'))throw Error('audit_failure');
   return {rows:[]};
  },
  release(){released=true}
 };
 return {calls,pool:{async connect(){return client}},released:()=>released};
}
test('seller status validates ID and boolean before database write',async()=>{
 const f=dbFixture();
 assert.deepEqual(await setSellerStatus(1,'abc',true,f.pool),{status:400,error:'invalid_seller_status'});
 assert.deepEqual(await setSellerStatus(1,'100001','true',f.pool),{status:400,error:'invalid_seller_status'});
 assert.equal(f.calls.length,0);
});
test('disabling seller logs the change but does not debit wallets',async()=>{
 const f=dbFixture();
 const result=await setSellerStatus(9,'100001',false,f.pool);
 assert.equal(result.status,200);assert.equal(result.enabled,false);
 assert.equal(f.calls[0].sql,'BEGIN');
 assert.equal(f.calls.at(-1).sql,'COMMIT');
 assert(f.calls.some(x=>x.sql.startsWith('INSERT INTO akira_seller_wallets')&&x.params[1]===false));
 assert(f.calls.some(x=>x.sql.startsWith('INSERT INTO akira_admin_audit')&&x.params[1]==='seller_disabled'));
 assert(!f.calls.some(x=>/UPDATE akira_wallets|SET balance|DELETE FROM|TRUNCATE/i.test(x.sql)));
 assert.equal(f.released(),true);
});
test('missing seller account rolls back safely',async()=>{
 const f=dbFixture(false);
 assert.equal((await setSellerStatus(9,'100001',true,f.pool)).status,404);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.released(),true);
});
test('audit write failure rolls back seller permission',async()=>{
 const f=dbFixture(true,true);
 await assert.rejects(()=>setSellerStatus(9,'100001',true,f.pool),/audit_failure/);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.released(),true);
});
