import { getPool, getRoom } from './database.mjs';

export async function createRoom(user, body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = body.description === undefined ? '' : body.description;
  const seatCount = body.seatCount === undefined ? 10 : body.seatCount;
  if (!name || name.length > 100 || typeof description !== 'string' || description.length > 500 || ![5,10,12].includes(seatCount)) {
    return {status:400,body:{error:'invalid_room'}};
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)',[user.id]);
    const existingRoom=await client.query('SELECT public_id FROM akira_rooms WHERE owner_id=$1 LIMIT 1',[user.id]);
    if(existingRoom.rows.length){await client.query('ROLLBACK');return {status:409,body:{error:'already_has_room',roomId:String(existingRoom.rows[0].public_id)}};}
    const {rows} = await client.query(
      'INSERT INTO akira_rooms(owner_id,name,description,seat_count) VALUES($1,$2,$3,$4) RETURNING public_id',
      [user.id,name,description,seatCount]);
    await client.query('INSERT INTO akira_room_members(room_id,user_id,role) SELECT id,$2,$3 FROM akira_rooms WHERE public_id=$1',
      [rows[0].public_id,user.id,'host']);
    await client.query('COMMIT');
    return {status:201,body:{app:'akira',room:await getRoom(rows[0].public_id)}};
  } catch(err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {client.release();}
}

export async function joinRoom(user, publicId) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const {rows} = await client.query('SELECT id,is_locked,owner_id FROM akira_rooms WHERE public_id=$1 FOR UPDATE',[publicId]);
    if (!rows[0]) { await client.query('ROLLBACK'); return {status:404,body:{error:'room_not_found'}}; }
    const room = rows[0];
    const existing = await client.query('SELECT 1 FROM akira_room_members WHERE room_id=$1 AND user_id=$2',[room.id,user.id]);
    if (room.is_locked && !existing.rows.length && String(room.owner_id)!==String(user.id)) {
      await client.query('ROLLBACK'); return {status:403,body:{error:'room_locked'}};
    }
    await client.query("INSERT INTO akira_room_members(room_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT(room_id,user_id) DO NOTHING",[room.id,user.id]);
    await client.query('COMMIT');
    return {status:200,body:{ok:true,app:'akira',roomId:String(publicId),joined:true}};
  } catch(err) { await client.query('ROLLBACK'); throw err; }
  finally {client.release();}
}

export async function leaveRoom(user, publicId) {
  const {rows} = await getPool().query('SELECT id FROM akira_rooms WHERE public_id=$1',[publicId]);
  if (!rows[0]) return {status:404,body:{error:'room_not_found'}};
  await getPool().query('DELETE FROM akira_room_members WHERE room_id=$1 AND user_id=$2',[rows[0].id,user.id]);
  return {status:200,body:{ok:true,app:'akira',roomId:String(publicId),joined:false}};
}
