import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';
import { config } from './config.js';
import { createStore } from './store.js';

collectDefaultMetrics();
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export async function build() {
  const app = Fastify({ logger: { level: config.logLevel } });
  const store = await createStore(config);

  app.addHook('onResponse', (req, reply, done) => {
    const route = req.routeOptions?.url ?? req.url;
    const labels = { method: req.method, route, status: reply.statusCode };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
    done();
  });

  app.get('/health', async () => ({ status: 'ok', service: 'courses-api' }));
  app.get('/ready', async () => {
    const ok = await store.ping();
    return ok ? { status: 'ready' } : { status: 'not-ready' };
  });
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  // CRUD courses
  app.get('/courses', async () => store.listCourses());
  app.post('/courses', async (req, reply) => {
    const { title, description } = req.body ?? {};
    if (!title) return reply.code(400).send({ error: 'title required' });
    const course = { id: randomUUID(), title, description: description ?? '', createdAt: new Date().toISOString() };
    await store.insertCourse(course);
    reply.code(201);
    return course;
  });
  app.get('/courses/:id', async (req, reply) => {
    const c = await store.getCourse(req.params.id);
    if (!c) return reply.code(404).send({ error: 'not found' });
    return c;
  });

  // Quizzes
  app.post('/courses/:id/quizzes', async (req, reply) => {
    const { title, questions } = req.body ?? {};
    if (!title || !Array.isArray(questions)) return reply.code(400).send({ error: 'title + questions[] required' });
    const quiz = { id: randomUUID(), courseId: req.params.id, title, questions, createdAt: new Date().toISOString() };
    await store.insertQuiz(quiz);
    reply.code(201);
    return quiz;
  });
  app.get('/quizzes/:id', async (req, reply) => {
    const q = await store.getQuiz(req.params.id);
    if (!q) return reply.code(404).send({ error: 'not found' });
    return q;
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build();
  app.listen({ port: config.port, host: '0.0.0.0' })
    .then(() => app.log.info(`courses-api listening on ${config.port}`))
    .catch((err) => { app.log.error(err); process.exit(1); });
}
