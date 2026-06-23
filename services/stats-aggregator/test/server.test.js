import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../src/server.js';

test('GET /health → ok', async () => {
  const app = await build({ stubConsumer: true, stubMongo: true });
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().service, 'stats-aggregator');
  await app.close();
});

test('GET /metrics exposes counters', async () => {
  const app = await build({ stubConsumer: true, stubMongo: true });
  const res = await app.inject({ method: 'GET', url: '/metrics' });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /events_consumed_total/);
  await app.close();
});
