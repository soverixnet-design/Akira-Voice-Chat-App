import {getPool} from './database.mjs';

const ID=/^\d{6}$/;
const THEMES=new Set(['mid','gold','ocean','rose','forest','sunset']);

export async function adminUpdateRoom(adminId,body,pool=getPool()){
  const publicId=String(body?.publicId??'');
  const hasLock=typeof body?.locked==='boolean';
  const hasSeats=body?.seatCount!==undefined;
  const hasTheme=body?.themeKey!==undefined;
  if(!ID.test(publicId)||(!hasLock&&!hasSeats&&!hasTheme)||
     (body?.locked!==undefined&&!hasLock)||
     (hasSeats&&![5,10,12].includes(body.seatCount))||
     (hasTheme&&(typeof body.themeKey!=='string'||!THEMES.has(body.themeKey))))
    return {status:400,body:{error:'invalid_room_update'}};
  const db=await pool.connect();
  try{
    await db.query('BEGIN');
    const selected=await db.query(
      'SELECT id,is_locked,seat_count,theme_key FROM akira_rooms WHERE public_id=$1 FOR UPDATE',[publicId]);
    if(!selected.rows.length){
      await db.query('ROLLBACK');
      return {status:404,body:{error:'room_not_found'}};
    }
    const before=selected.rows[0];
    const locked=hasLock?body.locked:before.is_locked;
    const seatCount=hasSeats?body.seatCount:Number(before.seat_count);
    const themeKey=hasTheme?body.themeKey:before.theme_key;
    if(hasSeats){
      await db.query('DELETE FROM akira_room_seats WHERE room_id=$1 AND seat_no >= $2',[before.id,seatCount]);
    }
    const changed=await db.query(
      'UPDATE akira_rooms SET is_locked=$2,seat_count=$3,theme_key=$4,updated_at=now() WHERE id=$1 RETURNING public_id::text AS id,is_locked AS "isLocked",seat_count AS "seatCount",theme_key AS "themeKey"',
      [before.id,locked,seatCount,themeKey]);
    await db.query(
      'INSERT INTO akira_admin_audit(actor_user_id,action,target_type,target_id) VALUES($1,$2,$3,$4)',
      [adminId,'room_settings_changed','room',publicId]);
    await db.query('COMMIT');
    return {status:200,body:{ok:true,room:changed.rows[0]}};
  }catch(err){await db.query('ROLLBACK');throw err}finally{db.release()}
}
