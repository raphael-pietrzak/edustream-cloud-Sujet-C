import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../src/server.js';

process.env.USE_IN_MEMORY = 'true';

test('GET /health → 200 ok', async () => {
  const app = await build();
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, 'ok');
  await app.close();
});

test('POST /courses → 201 returns course', async () => {
  const app = await build();
  const res = await app.inject({ method: 'POST', url: '/courses', payload: { title: 'Kubernetes 101' } });
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().title, 'Kubernetes 101');
  await app.close();
});

test('POST /courses without title → 400', async () => {
  const app = await build();
  const res = await app.inject({ method: 'POST', url: '/courses', payload: {} });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test('GET /metrics exposes prom counters', async () => {
  const app = await build();
  await app.inject({ method: 'GET', url: '/health' });
  const res = await app.inject({ method: 'GET', url: '/metrics' });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /http_requests_total/);
  await app.close();
});
