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
const allowedOrigins = new Set((process.env.AKIRA_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean));

export const requestHandler = async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
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
  // Mint short-lived, room-scoped LiveKit credentials only for authenticated members.
  const voiceMatch = url.pathname.match(/^\\/api\\/v1\\/rooms\\/(\\d{1,18})\\/voice-token$/);
  if (req.method === 'POST' && voiceMatch) {
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401,{error:'unauthorized'});
      const key = process.env.AKIRA_LIVEKIT_API_KEY;
      const secret = process.env.AKIRA_LIVEKIT_API_SECRET;
      const wsUrl = process.env.AKIRA_LIVEKIT_URL;
      if (!key || !secret || !/^wss:\\/\\//.test(wsUrl || '')) return send(503,{error:'voice_not_configured'});
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
  const roomWrite = req.method === 'POST' && (url.pathname === '/api/v1/rooms' || /^\\/api\\/v1\\/rooms\\/\\d{1,18}\\/(join|leave)$/.test(url.pathname));
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
      const match = url.pathname.match(/^\\/api\\/v1\\/rooms\\/(\\d{1,18})\\/(join|leave)$/);
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
  return send(404, { error: 'not_found', app: appId });
};
export const server = http.createServer(requestHandler);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(port, host, () => console.log('Akira API listening on ' + host + ':' + port));
}
