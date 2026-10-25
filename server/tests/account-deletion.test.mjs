import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deletionRequestStatus,submitDeletionRequest} from '../src/account-deletion.mjs';

function fixture(){
 const calls=[];
 return {calls,pool:{async query(sql,args){calls.push({sql,args});return {rows:[{status:'pending',requestedAt:'2026-10-25T12:00:00Z'}]}}}};
}
test('account deletion request needs explicit user confirmation',async()=>{
 const f=fixture();
 assert.equal((await submitDeletionRequest(5,{},f.pool)).status,400);
 assert.equal((await submitDeletionRequest(5,{confirm:'delete'},f.pool)).status,400);
 assert.equal(f.calls.length,0);
});
test('only requester user id and optional reason are stored',async()=>{
 const f=fixture();
 const response=await submitDeletionRequest(5,{confirm:'DELETE',reason:'privacy'},f.pool);
 assert.equal(response.status,200);
 assert.deepEqual(f.calls[0].args,[5,'privacy']);
 assert.match(f.calls[0].sql,/ON CONFLICT/);
});
test('request status is read only',async()=>{
 const f=fixture();
 const response=await deletionRequestStatus(5,f.pool);
 assert.equal(response.status,200);
 assert.match(f.calls[0].sql,/SELECT status,requested_at/);
 assert.deepEqual(f.calls[0].args,[5]);
});
test('deletion request does not touch wallet balances or sessions',async()=>{
 const f=fixture();
 await submitDeletionRequest(5,{confirm:'DELETE'},f.pool);
 assert.doesNotMatch(f.calls[0].sql,/UPDATE akira_wallets|DELETE FROM akira_sessions|DELETE FROM akira_users/i);
});
