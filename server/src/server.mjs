import http from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT || 4301);
const host = process.env.HOST || '127.0.0.1';
const appId = 'akira';
const startedAt = new Date().toISOString();
const requestHandler = (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const send = (status, body) => {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-request-id': randomUUID(),
    });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'GET' && url.pathname === '/health') {
    return send(200, { ok: true, app: appId, service: 'api', startedAt });
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/status') {
    return send(200, { app: appId, status: 'foundation-only', productionReady: false,
      enabled: ['health', 'status'], pending: ['auth', 'database', 'rooms', 'voice', 'wallet', 'gifts', 'admin'] });
  }
  return send(404, { error: 'not_found', app: appId });
};
export const server = http.createServer(requestHandler);
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, host, () => console.log('Akira API listening on ' + host + ':' + port));
}
