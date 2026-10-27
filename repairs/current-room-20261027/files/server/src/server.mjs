import { roomSeats, setSeat, updateRoomSettings } from './room-seats.mjs';
import { controlRoutes } from './control.mjs';
import { serveAdmin } from './admin-panel.mjs';
import { getWallet, walletHistory } from './wallet.mjs';
import { placeGameBet } from './game-bets.mjs';
import { startGameEngine, advanceGameRound, gameIsEnabled } from './game-engine.mjs';
import { profileRoutes } from './profiles.mjs';
import { requireAdmin, adminStats } from './admin.mjs';
import http from 'node:http';
import { listRooms, getRoom, getPool } from './database.mjs';
import { register, login, authenticate, logout, profile } from './auth.mjs';
import { randomUUID, createHmac } from 'node:crypto';
import { createRoom, joinRoom, leaveRoom } from './rooms.mjs';
import { pathToFileURL } from 'node:url';

const port = Number(process.env.PORT || 4301);
const host = process.env.HOST || '127.0.0.1';
const appId = 'akira';
const startedAt = new Date().toISOString();
const allowedOrigins = new Set(['https://api.soverixnet.online', ...(process.env.AKIRA_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean)]);

export const requestHandler = async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (serveAdmin(req, res, url)) return;
  if (/^\/rooms\/\d{1,18}\/voice-token$/.test(url.pathname)) url.pathname = '/api/v1' + url.pathname;
  const origin = req.headers.origin;
  const originAllowed = Boolean(origin && allowedOrigins.has(origin));
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-request-id': randomUUID(),
    'vary': 'Origin',
  };
  if (originAllowed) headers['access-control-allow-origin'] = origin;
  const send = (status, body) => {
    res.writeHead(status, headers);
    res.end(JSON.stringify(body));
  };
  if (origin && !originAllowed) return send(403, { error: 'origin_not_allowed', app: appId });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...headers,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-max-age': '600',
    });
    return res.end();
  }
  if (await controlRoutes(req, url, send)) return;
  if (req.method === 'POST' && ['/api/v1/auth/register','/api/v1/auth/login'].includes(url.pathname)) {
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 8192) return send(413,{error:'payload_too_large'});
      }
      let body;
      try { body = JSON.parse(raw); } catch { return send(400,{error:'invalid_json'}); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400,{error:'invalid_json'});
      const result = url.pathname.endsWith('/register') ? await register(body) : await login(body);
      return send(result.status,result.body);
    } catch(err) {
      console.error('auth_failed',err.code || err.message);
      return send(503,{error:'auth_unavailable'});
    }
  }
  if (req.method === 'GET' && ['/api/v1/wallet','/api/v1/wallet/history'].includes(url.pathname)) {
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401,{error:'unauthorized'});
      if (url.pathname.endsWith('/history')) return send(200,{app:appId,transactions:await walletHistory(user.id)});
      return send(200,{app:appId,wallet:await getWallet(user.id)});
    } catch(err) { console.error('wallet_read_failed',err.message);return send(503,{error:'wallet_unavailable'}); }
  }
  // Shared wallet snapshot for both games; no client-controlled credits or outcomes.
  if (req.method === 'GET' && url.pathname === '/api/v1/games/overview') {
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401,{error:'unauthorized'});
      const pool = getPool();
      const [wallet, recent, winnings] = await Promise.all([
        getWallet(user.id),
        pool.query(`SELECT 'food-wheel' AS game,round_id,amount,payout,created_at FROM akira_food_bets WHERE user_id=$1
          UNION ALL SELECT 'jackpot-fruit' AS game,round_id,amount,payout,created_at FROM akira_jackpot_bets WHERE user_id=$1
          ORDER BY created_at DESC LIMIT 30`,[user.id]),
        pool.query(`SELECT COALESCE(SUM(payout),0)::text AS total FROM (
          SELECT payout FROM akira_food_bets WHERE user_id=$1 AND created_at>=now()-interval '24 hours'
          UNION ALL SELECT payout FROM akira_jackpot_bets WHERE user_id=$1 AND created_at>=now()-interval '24 hours'
        ) AS wins`,[user.id])
      ]);
      return send(200,{app:appId,wallet,games:['food-wheel','jackpot-fruit'],
        todayWinnings24h:Number(winnings.rows[0].total),recentBets:recent.rows,
        bettingEnabled:process.env.AKIRA_GAME_ENGINE_ENABLED==='true'});
    } catch(err) {console.error('game_overview_failed',err.message);return send(503,{error:'games_unavailable'}); }
  }
  const roundMatch=url.pathname.match(/^\/api\/v1\/games\/(food-wheel|jackpot-fruit)\/round$/);
  if(req.method==='GET' && roundMatch){
    try{
      const user=await authenticate(req.headers.authorization);
      if(!user)return send(401,{error:'unauthorized'});
      const game=roundMatch[1],table=game==='food-wheel'?'akira_food_rounds':'akira_jackpot_rounds';
      const resultCol=game==='food-wheel'?'result_id':'result_item';
      const pool=getPool();
      const engineOn=process.env.AKIRA_GAME_ENGINE_ENABLED==='true';
      const gameEnabled=await gameIsEnabled(game,pool);
      if(engineOn){
        await advanceGameRound(game,{createNext:gameEnabled}).catch(err=>console.error('round_advance_failed',err.message));
      }
      const {rows}=await pool.query(`SELECT id::text,starts_at AS "startsAt",betting_ends_at AS "endsAt",settled_at AS "settledAt",${resultCol} AS result FROM ${table} ORDER BY id DESC LIMIT 2`);
      return send(200,{game,round:rows[0]||null,previousRound:rows[1]||null,serverTime:new Date().toISOString(),bettingEnabled:engineOn&&gameEnabled});
    }catch(err){console.error('round_read_failed',err.message);return send(503,{error:'round_unavailable'});}
  }
  const betMatch = url.pathname.match(/^\/api\/v1\/games\/(food-wheel|jackpot-fruit)\/bets$/);
  if (req.method === 'POST' && betMatch) {
    try {
      const user=await authenticate(req.headers.authorization);
      if(!user) return send(401,{error:'unauthorized'});
      if(process.env.AKIRA_GAME_ENGINE_ENABLED!=='true')return send(503,{error:'game_engine_disabled'});
      if(!await gameIsEnabled(betMatch[1]))return send(403,{error:'game_disabled'});
      let raw='';
      for await (const chunk of req) {
        raw+=chunk;
        if(raw.length>4096) return send(413,{error:'payload_too_large'});
      }
      let body;
      try {body=JSON.parse(raw);} catch {return send(400,{error:'invalid_json'});}
      if(!body || typeof body!=='object' || Array.isArray(body)) return send(400,{error:'invalid_bet'});
      const result=await placeGameBet(user.id,betMatch[1],body);
      return send(result.status,result.body);
    } catch(err) {console.error('game_bet_failed',err.message);return send(503,{error:'bet_unavailable'});}
  }
  if (await profileRoutes(req, url.pathname, send, authenticate, getPool)) return;
  // Mint short-lived, room-scoped LiveKit credentials only for authenticated members.
  const voiceMatch = url.pathname.match(/^\/api\/v1\/rooms\/(\d{1,18})\/voice-token$/);
  if (req.method === 'POST' && voiceMatch) {
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401,{error:'unauthorized'});
      const key = process.env.AKIRA_LIVEKIT_API_KEY;
      const secret = process.env.AKIRA_LIVEKIT_API_SECRET;
      const wsUrl = process.env.AKIRA_LIVEKIT_URL;
      if (!key || !secret || !/^wss:\/\//.test(wsUrl || '')) return send(503,{error:'voice_not_configured'});
      const {rows} = await getPool().query(
        'SELECT 1 FROM akira_room_members m JOIN akira_rooms r ON r.id=m.room_id WHERE r.public_id=$1 AND m.user_id=$2',
        [voiceMatch[1],user.id]);
      if (!rows.length) return send(403,{error:'join_room_first'});
      const now = Math.floor(Date.now()/1000);
      const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const header = encoded({alg:'HS256',typ:'JWT'});
      const payload = encoded({
        iss:key,sub:String(user.public_id),iat:now,nbf:now,exp:now+600,
        name:user.display_name,video:{
          room:'akira-'+voiceMatch[1],roomJoin:true,canPublish:true,canSubscribe:true,
          canPublishData:true,canPublishSources:['microphone']
        }
      });
      const body = header+'.'+payload;
      const signature = createHmac('sha256',secret).update(body).digest('base64url');
      return send(200,{app:appId,url:wsUrl,token:body+'.'+signature,expiresIn:600});
    } catch(err) {console.error('voice_token_failed',err.message);return send(503,{error:'voice_unavailable'}); }
  }
  if (url.pathname === '/api/v1/auth/me' && req.method === 'GET') {
    try {
      const user = await authenticate(req.headers.authorization);
      return user ? send(200,{app:appId,user:profile(user)}) : send(401,{error:'unauthorized'});
    } catch(err) { console.error('auth_me_failed',err.message); return send(503,{error:'auth_unavailable'}); }
  }
  if (url.pathname === '/api/v1/auth/logout' && req.method === 'POST') {
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401,{error:'unauthorized'});
      await logout(req.headers.authorization);
      return send(200,{ok:true,app:appId});
    } catch(err) { console.error('logout_failed',err.message); return send(503,{error:'auth_unavailable'}); }
  }
  if (url.pathname === '/api/v1/account/deletion-request' && req.method === 'POST') {
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401,{error:'unauthorized'});
      await getPool().query(
        'INSERT INTO akira_control_reports(user_id,target_id,message) VALUES($1,$2,$3)',
        [user.id, user.public_id, 'ACCOUNT_DELETION_REQUEST: User requested account and personal data deletion']
      ).catch(()=>{});
      return send(200,{ok:true,status:'received',app:appId});
    } catch(err) { console.error('deletion_request_failed',err.message); return send(503,{error:'deletion_request_unavailable'}); }
  }
  const roomSeatRoute=url.pathname.match(/^\/api\/v1\/rooms\/(\d{6,18})\/(seats|seat|settings)$/);
  if(roomSeatRoute){
    try{
      const user=await authenticate(req.headers.authorization);
      if(!user)return send(401,{error:'unauthorized'});
      const [,roomId,action]=roomSeatRoute;
      if(action==='seats' && req.method==='GET'){
        const result=await roomSeats(user,roomId);
        return send(result.status,result.body);
      }
      if(req.method!=='POST'||action==='seats')return send(405,{error:'method_not_allowed'});
      let raw='';
      for await (const chunk of req){raw+=chunk;if(raw.length>4096)return send(413,{error:'payload_too_large'});}
      let body;try{body=JSON.parse(raw)}catch{return send(400,{error:'invalid_json'})}
      const result=action==='seat'?await setSeat(user,roomId,body):await updateRoomSettings(user,roomId,body);
      return send(result.status,result.body);
    }catch(e){console.error('room_seat_failed',e.code||e.message);return send(503,{error:'room_seats_unavailable'})}
  }
  const roomWrite = req.method === 'POST' && (url.pathname === '/api/v1/rooms' || /^\/api\/v1\/rooms\/\d{1,18}\/(join|leave)$/.test(url.pathname));
  if (roomWrite) {
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401,{error:'unauthorized',app:appId});
      if (url.pathname === '/api/v1/rooms') {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 8192) return send(413,{error:'payload_too_large'});
        }
        let body;
        try { body = JSON.parse(raw); } catch { return send(400,{error:'invalid_json'}); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400,{error:'invalid_json'});
        const result = await createRoom(user,body);
        return send(result.status,result.body);
      }
      const match = url.pathname.match(/^\/api\/v1\/rooms\/(\d{1,18})\/(join|leave)$/);
      const result = match[2] === 'join' ? await joinRoom(user,match[1]) : await leaveRoom(user,match[1]);
      return send(result.status,result.body);
    } catch(err) {
      console.error('room_write_failed',err.code || err.message);
      return send(503,{error:'room_unavailable',app:appId});
    }
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    return send(200, { ok: true, app: appId, service: 'api', startedAt });
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/status') {
    return send(200, { app: appId, status: 'voice-integration-beta', productionReady: false,
      enabled: ['health', 'status', 'database', 'room-read', 'room-create', 'room-join', 'room-leave', 'email-auth', 'voice-token'], pending: ['voice-provider-configuration', 'wallet', 'gifts', 'admin'] });
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/rooms') {
    try { return send(200, { app: appId, rooms: await listRooms() }); }
    catch (err) { console.error('room_list_failed', err.message); return send(503, { error: 'database_unavailable', app: appId }); }
  }
  const roomMatch = url.pathname.match(/^\/api\/v1\/rooms\/(\d{1,18})$/);
  if (req.method === 'GET' && roomMatch) {
    try { const room = await getRoom(roomMatch[1]); return room ? send(200, { app: appId, room }) : send(404, { error: 'room_not_found', app: appId }); }
    catch (err) { console.error('room_read_failed', err.message); return send(503, { error: 'database_unavailable', app: appId }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/admin/dashboard') {
    try {
      const admin = await requireAdmin(req.headers.authorization);
      if (admin.error) return send(admin.status, {error:admin.error});
      return send(200, {app:appId,role:admin.role,stats:await adminStats()});
    } catch(err) {
      console.error('admin_dashboard_failed',err.message);
      return send(503,{error:'admin_unavailable'});
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/admin/users/search') {
    try {
      const admin = await requireAdmin(req.headers.authorization);
      if (admin.error) return send(admin.status, {error:admin.error});
      const id = url.searchParams.get('id') || '';
      if (!/^\d{6}$/.test(id)) return send(400, {error:'invalid_user_id'});
      const {rows} = await getPool().query(
        'SELECT id,public_id,display_name,country_code,avatar_url,created_at FROM akira_users WHERE public_id=$1',
        [id]
      );
      return send(200, {user:rows[0] || null});
    } catch(err) {
      console.error('admin_user_search_failed',err.message);
      return send(503,{error:'admin_unavailable'});
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/admin/users') {
    try {
      const admin = await requireAdmin(req.headers.authorization);
      if (admin.error) return send(admin.status, {error:admin.error});
      const {rows} = await getPool().query(
        'SELECT public_id,display_name,country_code,avatar_url,created_at FROM akira_users ORDER BY id DESC LIMIT 100'
      );
      return send(200, {users:rows});
    } catch(err) {
      console.error('admin_users_failed',err.message);
      return send(503,{error:'admin_unavailable'});
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/admin/users/ban') {
    try {
      const admin = await requireAdmin(req.headers.authorization);
      if (admin.error) return send(admin.status, {error:admin.error});
      if (admin.role !== 'super_admin') return send(403,{error:'super_admin_required'});
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return send(413,{error:'request_too_large'});
      }
      let body;
      try { body = JSON.parse(raw); }
      catch { return send(400,{error:'invalid_json'}); }
      const id = String(body.publicId ?? '');
      if (!/^\d{6}$/.test(id) || typeof body.banned !== 'boolean')
        return send(400,{error:'invalid_request'});
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const target = await client.query(
          'SELECT id FROM akira_users WHERE public_id=$1 FOR UPDATE',[id]
        );
        if (!target.rows.length) {
          await client.query('ROLLBACK');
          return send(404,{error:'user_not_found'});
        }
        const uid = target.rows[0].id;
        const protectedRole = await client.query(
          'SELECT 1 FROM akira_admin_roles WHERE user_id=$1',[uid]
        );
        if (String(uid) === String(admin.user.id) || protectedRole.rows.length) {
          await client.query('ROLLBACK');
          return send(403,{error:'protected_admin_account'});
        }
        await client.query('UPDATE akira_users SET is_banned=$1 WHERE id=$2',[body.banned,uid]);
        if (body.banned) {
          await client.query('DELETE FROM akira_sessions WHERE user_id=$1',[uid]);
        }
        await client.query('COMMIT');
        return send(200,{ok:true,publicId:id,is_banned:body.banned});
      } catch(err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch(err) {
      console.error('admin_ban_failed',err.message);
      return send(503,{error:'admin_ban_unavailable'});
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/admin/roles') {
    try {
      const admin = await requireAdmin(req.headers.authorization);
      if (admin.error) return send(admin.status,{error:admin.error});
      if (admin.role !== 'super_admin') return send(403,{error:'super_admin_required'});
      const {rows} = await getPool().query(
        'SELECT u.public_id,u.display_name,r.role,r.granted_at FROM akira_admin_roles r JOIN akira_users u ON u.id=r.user_id ORDER BY r.granted_at DESC LIMIT 100'
      );
      return send(200,{roles:rows});
    } catch(err) { console.error('admin_roles_list_failed',err.message); return send(503,{error:'admin_unavailable'}); }
  }
  if (req.method === 'POST' && url.pathname === '/api/v1/admin/roles') {
    try {
      const admin = await requireAdmin(req.headers.authorization);
      if (admin.error) return send(admin.status,{error:admin.error});
      if (admin.role !== 'super_admin') return send(403,{error:'super_admin_required'});
      let raw='';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return send(413,{error:'request_too_large'});
      }
      let body;
      try { body=JSON.parse(raw); } catch { return send(400,{error:'invalid_json'}); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400,{error:'invalid_request'});
      const id=String(body.publicId ?? '');
      const role=body.role;
      if (!/^\d{6}$/.test(id) || !['admin','manager','moderator','remove'].includes(role))
        return send(400,{error:'invalid_role_or_user_id'});
      const client=await getPool().connect();
      try {
        await client.query('BEGIN');
        const target=await client.query('SELECT id FROM akira_users WHERE public_id=$1 FOR UPDATE',[id]);
        if (!target.rows.length) {await client.query('ROLLBACK');return send(404,{error:'user_not_found'});}
        const uid=target.rows[0].id;
        const existing=await client.query('SELECT role FROM akira_admin_roles WHERE user_id=$1 FOR UPDATE',[uid]);
        if (String(uid)===String(admin.user.id) || existing.rows[0]?.role==='super_admin') {
          await client.query('ROLLBACK');return send(403,{error:'protected_super_admin'});
        }
        if (role==='remove') await client.query('DELETE FROM akira_admin_roles WHERE user_id=$1',[uid]);
        else await client.query('INSERT INTO akira_admin_roles(user_id,role) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,granted_at=NOW()',[uid,role]);
        await client.query('INSERT INTO akira_admin_audit(actor_user_id,action,target_type,target_id) VALUES($1,$2,$3,$4)',[admin.user.id,role==='remove'?'role_removed':'role_set_'+role,'user',id]);
        await client.query('COMMIT');
        return send(200,{ok:true,publicId:id,role});
      } catch(err) {await client.query('ROLLBACK');throw err;} finally {client.release();}
    } catch(err) {console.error('admin_role_update_failed',err.message);return send(503,{error:'admin_unavailable'});}
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/admin/audit') {
    try {
      const admin=await requireAdmin(req.headers.authorization);
      if (admin.error) return send(admin.status,{error:admin.error});
      if (admin.role !== 'super_admin') return send(403,{error:'super_admin_required'});
      const {rows}=await getPool().query('SELECT a.action,a.target_type,a.target_id,a.created_at,u.public_id AS actor_public_id FROM akira_admin_audit a LEFT JOIN akira_users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 50');
      return send(200,{events:rows});
    } catch(err) {console.error('admin_audit_failed',err.message);return send(503,{error:'admin_unavailable'});}
  }
  return send(404, { error: 'not_found', app: appId });
};
export const server = http.createServer(requestHandler);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(port, host, () => {console.log('Akira API listening on ' + host + ':' + port);startGameEngine();});
}
