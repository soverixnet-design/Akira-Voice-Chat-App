export function validAvatar(value) {
  if (value === null || value === '') return true;
  if (typeof value !== 'string' || value.length > 200000) return false;
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export async function profileRoutes(req, path, send, authenticate, pool) {
  const members = path.match(/^\/api\/v1\/rooms\/(\d{1,18})\/members$/);
  if (!(path === '/api/v1/profile' && ['GET','POST'].includes(req.method)) && !(members && req.method === 'GET')) return false;
  try {
    const user = await authenticate(req.headers.authorization);
    if (!user) { send(401,{error:'unauthorized'}); return true; }
    if (members) {
      const access = await pool().query('SELECT 1 FROM akira_room_members m JOIN akira_rooms r ON r.id=m.room_id WHERE r.public_id=$1 AND m.user_id=$2',[members[1],user.id]);
      if (!access.rows.length) { send(403,{error:'join_room_first'}); return true; }
      const {rows} = await pool().query('SELECT u.public_id::text AS id,u.display_name AS name,u.avatar_url AS pic,u.bio,m.role,(u.id=r.owner_id) AS owner FROM akira_room_members m JOIN akira_rooms r ON r.id=m.room_id JOIN akira_users u ON u.id=m.user_id WHERE r.public_id=$1 ORDER BY m.joined_at,u.public_id',[members[1]]);
      send(200,{members:rows}); return true;
    }
    if (req.method === 'POST') {
      let raw=''; let size=0;
      for await (const chunk of req) { size+=Buffer.byteLength(chunk); if(size>210000){send(413,{error:'profile_too_large'});return true;} raw+=chunk; }
      let body; try {body=JSON.parse(raw);} catch {send(400,{error:'invalid_json'});return true;}
      if (!body || typeof body.name!=='string' || !body.name.trim() || body.name.trim().length>80 || typeof body.bio!=='string' || body.bio.length>500 || !validAvatar(body.pic)) {send(400,{error:'invalid_profile'});return true;}
      await pool().query('UPDATE akira_users SET display_name=$1,avatar_url=$2,bio=$3,updated_at=now() WHERE id=$4',[body.name.trim(),body.pic||null,body.bio,user.id]);
    }
    const {rows}=await pool().query('SELECT public_id::text AS id,display_name AS name,avatar_url AS pic,bio FROM akira_users WHERE id=$1',[user.id]);
    send(200,{profile:rows[0]});
  } catch {send(503,{error:'profiles_unavailable'});}
  return true;
}
