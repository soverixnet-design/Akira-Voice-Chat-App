import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.mjs';

test('Akira API identifies itself and blocks unapproved browser origins', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).app, 'akira');
    const status = await fetch(base + '/api/v1/status');
    assert.equal((await status.json()).productionReady, false);
    const rejected = await fetch(base + '/health', { headers: { origin: 'https://untrusted.example' } });
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get('access-control-allow-origin'), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
