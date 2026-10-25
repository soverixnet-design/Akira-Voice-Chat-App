import {getPool} from './database.mjs';

const validRoom = id => /^\d{6,18}$/.test(String(id??''));
const snapshotSql = `SELECT s.seat_no AS "seatNo", u.public_id::text AS "publicId",
 u.display_name AS "displayName",u.avatar_url AS "avatarUrl",
 s.user_id::text AS "accountId"
 FROM akira_room_seats s JOIN akira_users u ON u.id=s.user_id
 WHERE s.room_id=$1 ORDER BY s.seat_no`;
async function roomForMember(db,userId,publicId,locked=false) {
 const sql='SELECT r.id,r.seat_count AS "seatCount",r.owner_id AS "ownerId",r.name,r.theme_key AS "themeKey" FROM akira_rooms r WHERE r.public_id=$1'+(locked?' FOR UPDATE':'');
 const {rows}=await db.query(sql,[publicId]);
 if(!rows.length)return {status:404,body:{error:'room_not_found'}};
 const room=rows[0];
 const membership=await db.query('SELECT 1 FROM akira_room_members WHERE room_id=$1 AND user_id=$2',[room.id,userId]);
 if(!membership.rows.length)return {status:403,body:{error:'join_room_first'}};
 return {room};
}
async function listSeatSnapshot(db,room,publicId) {
 const {rows}=await db.query(snapshotSql,[room.id]);
 return {ok:true,roomId:String(publicId),seatCount:Number(room.seatCount),
   ownerId:String(room.ownerId),name:room.name,themeKey:room.themeKey||null,
   seats:rows.map(({accountId,...data})=>data)};
}
export async function roomSeats(user,publicId,pool=getPool()){
 if(!validRoom(publicId))return {status:400,body:{error:'invalid_room_id'}};
 const db=await pool.connect();
 try {
  const checked=await roomForMember(db,user.id,publicId);
  if(checked.status)return checked;
  return {status:200,body:await listSeatSnapshot(db,checked.room,publicId)};
 } finally {db.release();}
}
export async function setSeat(user,publicId,body,pool=getPool()){
 if(!validRoom(publicId)||!body||typeof body!=='object'||Array.isArray(body)||
    (body.leave!==true && (!Number.isInteger(body.seatNo)||body.seatNo<0||body.seatNo>11)))
  return {status:400,body:{error:'invalid_seat_request'}};
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const checked=await roomForMember(db,user.id,publicId,true);
  if(checked.status){await db.query('ROLLBACK');return checked}
  const room=checked.room;
  if(body.leave===true){
   await db.query('DELETE FROM akira_room_seats WHERE room_id=$1 AND user_id=$2',[room.id,user.id]);
  }else{
   const seat=body.seatNo;
   if(seat>=Number(room.seatCount)|| (seat===0 && String(room.ownerId)!==String(user.id)) ||
     (seat!==0 && String(room.ownerId)===String(user.id))){
    await db.query('ROLLBACK');return {status:403,body:{error:'seat_not_permitted'}};
   }
   const {rows}=await db.query('SELECT user_id FROM akira_room_seats WHERE room_id=$1 AND seat_no=$2',[room.id,seat]);
   if(rows.length&&String(rows[0].user_id)!==String(user.id)){
    await db.query('ROLLBACK');return {status:409,body:{error:'seat_taken'}};
   }
   await db.query('DELETE FROM akira_room_seats WHERE room_id=$1 AND user_id=$2 AND seat_no<>$3',[room.id,user.id,seat]);
   if(!rows.length)
    await db.query('INSERT INTO akira_room_seats(room_id,seat_no,user_id) VALUES($1,$2,$3)',[room.id,seat,user.id]);
  }
  const result=await listSeatSnapshot(db,room,publicId);
  await db.query('COMMIT');
  return {status:200,body:result};
 }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
}
export async function updateRoomSettings(user,publicId,body,pool=getPool()){
 if(!validRoom(publicId)||!body||typeof body!=='object'||Array.isArray(body)||
    (body.seatCount===undefined && body.name===undefined && body.themeKey===undefined))
  return {status:400,body:{error:'invalid_room_settings'}};
 if(body.seatCount!==undefined&&![5,10,12].includes(body.seatCount))
  return {status:400,body:{error:'invalid_seat_count'}};
 if(body.name!==undefined&&(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>100))
  return {status:400,body:{error:'invalid_room_name'}};
 if(body.themeKey!==undefined&&!['mid','gold','ocean','rose','forest','sunset'].includes(body.themeKey))
  return {status:400,body:{error:'invalid_room_theme'}};
 const db=await pool.connect();
 try {
  await db.query('BEGIN');
  const checked=await roomForMember(db,user.id,publicId,true);
  if(checked.status){await db.query('ROLLBACK');return checked}
  if(String(checked.room.ownerId)!==String(user.id)){
   await db.query('ROLLBACK');return {status:403,body:{error:'owner_required'}};
  }
  if(body.seatCount!==undefined){
   await db.query('DELETE FROM akira_room_seats WHERE room_id=$1 AND seat_no >= $2',[checked.room.id,body.seatCount]);
  }
  const {rows}=await db.query('UPDATE akira_rooms SET seat_count=$2,name=$3,theme_key=$4,updated_at=now() WHERE id=$1 RETURNING id,seat_count AS "seatCount",owner_id AS "ownerId",name,theme_key AS "themeKey"',
   [checked.room.id,body.seatCount??checked.room.seatCount,body.name?.trim()??checked.room.name,body.themeKey??checked.room.themeKey]);
  const result=await listSeatSnapshot(db,rows[0],publicId);
  await db.query('COMMIT');
  return {status:200,body:result};
 }catch(err){await db.query('ROLLBACK');throw err}finally{db.release()}
}
