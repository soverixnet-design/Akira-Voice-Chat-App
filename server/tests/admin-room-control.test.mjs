import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminUpdateRoom} from '../src/admin-room-control.mjs';

function fixture(exists=true,failAudit=false){
 const log=[];let released=false;
 const client={async query(sql,args=[]){
  log.push({sql,args});
  if(sql.startsWith('SELECT id,is_locked'))return {rows:exists?[{id:'7',is_locked:false,seat_count:10,theme_key:'mid'}]:[]};
  if(sql.startsWith('UPDATE akira_rooms'))return {rows:[{id:'100010',isLocked:args[1],seatCount:args[2],themeKey:args[3]}]};
  if(failAudit&&sql.startsWith('INSERT INTO akira_admin_audit'))throw Error('audit_failure');
  return {rows:[]};
 },release(){released=true}};
 return {log,released:()=>released,pool:{async connect(){return client}}};
}
test('invalid room updates do not access database',async()=>{
 const f=fixture();
 for(const body of [{publicId:'abc',locked:true},{publicId:'100001',seatCount:21},{publicId:'100001',themeKey:'unknown'},{publicId:'100001'}]){
  const result=await adminUpdateRoom(1,body,f.pool);
  assert.equal(result.status,400);
 }
 assert.equal(f.log.length,0);
});
test('room lock and seat shrink save and audit together',async()=>{
 const f=fixture();
 const result=await adminUpdateRoom(9,{publicId:'100001',locked:true,seatCount:5,themeKey:'rose'},f.pool);
 assert.equal(result.status,200);
 assert.equal(result.body.room.isLocked,true);
 assert.equal(result.body.room.seatCount,5);
 assert(f.log.some(x=>x.sql.startsWith('DELETE FROM akira_room_seats')&&x.args[1]===5));
 assert(f.log.some(x=>x.sql.startsWith('INSERT INTO akira_admin_audit')&&x.args[1]==='room_settings_changed'));
 assert.equal(f.log.at(-1).sql,'COMMIT');
 assert.equal(f.released(),true);
});
test('missing room rolls back',async()=>{
 const f=fixture(false);
 const result=await adminUpdateRoom(9,{publicId:'100001',locked:true},f.pool);
 assert.equal(result.status,404);
 assert.equal(f.log.at(-1).sql,'ROLLBACK');
});
test('audit failure rolls back room changes',async()=>{
 const f=fixture(true,true);
 await assert.rejects(()=>adminUpdateRoom(9,{publicId:'100001',locked:true},f.pool),/audit_failure/);
 assert.equal(f.log.at(-1).sql,'ROLLBACK');
 assert.equal(f.released(),true);
});
