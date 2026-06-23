import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../src/server.js';

test('GET /health → ok', async () => {
  const app = await build({ stubMongo: true });
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  await app.close();
});

test('GET /sessions/:id/stats → array', async () => {
  const app = await build({ stubMongo: true });
  app.stats._seed({ _id: 's1:q1', sessionId: 's1', questionId: 'q1', total: 5, correct: 3 });
  const res = await app.inject({ method: 'GET', url: '/sessions/s1/stats' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].total, 5);
  await app.close();
});
