import http from 'node:http';
import { listRooms, getRoom } from './database.mjs';
import { randomUUID } from 'node:crypto';
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
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-max-age': '600',
    });
    return res.end();
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    return send(200, { ok: true, app: appId, service: 'api', startedAt });
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/status') {
    return send(200, { app: appId, status: 'foundation-only', productionReady: false,
      enabled: ['health', 'status'], pending: ['auth', 'database', 'rooms', 'voice', 'wallet', 'gifts', 'admin'] });
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
