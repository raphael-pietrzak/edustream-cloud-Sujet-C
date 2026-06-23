import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../src/server.js';

process.env.STUB_PRODUCER = 'true';

test('GET /health → 200', async () => {
  const app = await build({ stubProducer: true });
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  await app.close();
});

test('POST /answers → 202 and message buffered', async () => {
  const app = await build({ stubProducer: true });
  const res = await app.inject({
    method: 'POST', url: '/answers',
    payload: { sessionId: 's1', quizId: 'q1', questionId: 'qq1', choice: 2, latencyMs: 1500 },
  });
  assert.equal(res.statusCode, 202);
  assert.equal(app.producer._buffer.length, 1);
  assert.equal(app.producer._buffer[0].choice, 2);
  await app.close();
});

test('POST /answers invalid → 400', async () => {
  const app = await build({ stubProducer: true });
  const res = await app.inject({ method: 'POST', url: '/answers', payload: { quizId: 'q1' } });
  assert.equal(res.statusCode, 400);
  await app.close();
});
