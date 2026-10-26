import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomSeats,setSeat,updateRoomSettings} from '../src/room-seats.mjs';

function fixture({member=true,owner='1',taken=false,seatCount=10,fail=false}={}){
 const queries=[],room={id:'12',seatCount,ownerId:owner,name:'Live Room',themeKey:'mid'};
 let placed= taken?{seat_no:1,user_id:'9'}:null;
 let released=false;
 const query=async(sql,args=[])=>{
  queries.push({sql,args});
  if(fail&&sql.startsWith('INSERT INTO akira_room_seats'))throw Error('test_db_failure');
  if(sql.startsWith('SELECT r.id,r.seat_count'))return {rows:[room]};
  if(sql.startsWith('SELECT 1 FROM akira_room_members'))return {rows:member?[{present:1}]:[]};
  if(sql.startsWith('SELECT user_id FROM akira_room_seats'))return {rows:placed&&placed.seat_no===args[1]?[{user_id:placed.user_id}]:[]};
  if(sql.startsWith('SELECT s.seat_no AS'))return {rows:placed?[{seatNo:placed.seat_no,publicId:'100010',displayName:'User',avatarUrl:null,accountId:placed.user_id}]:[]};
  if(sql.startsWith('DELETE FROM akira_room_seats')){
   if(args.length===3?placed?.user_id===args[1]&&placed?.seat_no!==args[2]:placed?.user_id===args[1])placed=null;
   return {rows:[]};
  }
  if(sql.startsWith('INSERT INTO akira_room_seats')){placed={seat_no:args[1],user_id:args[2]};return {rows:[]}};
  if(sql.startsWith('UPDATE akira_rooms SET'))return {rows:[{...room,seatCount:args[1],name:args[2],themeKey:args[3]}]};
  return {rows:[]};
 };
 return {queries,pool:{async connect(){return {query,release(){released=true}}}},released:()=>released};
}
test('room seats refuse unjoined accounts',async()=>{
 const f=fixture({member:false});
 const r=await roomSeats({id:'5'},'100001',f.pool);
 assert.equal(r.status,403);
 assert.equal(f.released(),true);
});
test('owner seat zero cannot be taken by a regular member',async()=>{
 const f=fixture();
 const r=await setSeat({id:'2'},'100001',{seatNo:0},f.pool);
 assert.equal(r.status,403);
 assert.equal(f.queries.at(-1).sql,'ROLLBACK');
});
test('owner can take reserved seat zero and commit',async()=>{
 const f=fixture();
 const r=await setSeat({id:'1'},'100001',{seatNo:0},f.pool);
 assert.equal(r.status,200);
 assert.equal(r.body.seats[0].seatNo,0);
 assert.equal(f.queries.at(-1).sql,'COMMIT');
});
test('two accounts cannot take an occupied seat',async()=>{
 const f=fixture({taken:true});
 const r=await setSeat({id:'2'},'100001',{seatNo:1},f.pool);
 assert.equal(r.status,409);
 assert.equal(r.body.error,'seat_taken');
 assert(!f.queries.some(x=>x.sql.startsWith('INSERT INTO akira_room_seats')));
});
test('taking a seat and leaving it are both transactional',async()=>{
 const f=fixture();
 const take=await setSeat({id:'2'},'100001',{seatNo:1},f.pool);
 assert.equal(take.status,200);
 const leave=await setSeat({id:'2'},'100001',{leave:true},f.pool);
 assert.equal(leave.status,200);
 assert.deepEqual(leave.body.seats,[]);
});
test('owner alone can change seat preset; count is validated',async()=>{
 const f=fixture();
 assert.equal((await updateRoomSettings({id:'2'},'100001',{seatCount:5},f.pool)).status,403);
 assert.equal((await updateRoomSettings({id:'1'},'100001',{seatCount:21},f.pool)).status,400);
 const r=await updateRoomSettings({id:'1'},'100001',{seatCount:12,themeKey:'ocean'},f.pool);
 assert.equal(r.status,200);assert.equal(r.body.seatCount,12);assert.equal(r.body.themeKey,'ocean');
});
test('seat SQL failure rolls back without partially committing',async()=>{
 const f=fixture({fail:true});
 await assert.rejects(()=>setSeat({id:'2'},'100001',{seatNo:1},f.pool),/test_db_failure/);
 assert.equal(f.queries.at(-1).sql,'ROLLBACK');
 assert.equal(f.released(),true);
});
