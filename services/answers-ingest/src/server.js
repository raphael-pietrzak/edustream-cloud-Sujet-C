import Fastify from 'fastify';
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';
import { config } from './config.js';
import { createProducer } from './producer.js';

collectDefaultMetrics();
const answersTotal = new Counter({
  name: 'answers_received_total',
  help: 'Total answers ingested',
  labelNames: ['quiz_id', 'outcome'],
});
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1],
});

export async function build(overrides = {}) {
  const cfg = { ...config, ...overrides };
  const app = Fastify({ logger: { level: cfg.logLevel } });
  const producer = await createProducer(cfg);

  app.addHook('onResponse', (req, reply, done) => {
    httpRequestDuration.observe(
      { method: req.method, route: req.routeOptions?.url ?? req.url, status: reply.statusCode },
      reply.elapsedTime / 1000,
    );
    done();
  });

  app.get('/health', async () => ({ status: 'ok', service: 'answers-ingest' }));
  app.get('/ready', async () => ({ status: producer.healthy ? 'ready' : 'not-ready' }));
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  app.post('/answers', async (req, reply) => {
    const { sessionId, quizId, questionId, studentId, choice, latencyMs } = req.body ?? {};
    if (!sessionId || !questionId || choice === undefined) {
      answersTotal.inc({ quiz_id: quizId ?? 'unknown', outcome: 'invalid' });
      return reply.code(400).send({ error: 'sessionId, questionId, choice required' });
    }
    const event = {
      sessionId, quizId, questionId, studentId: studentId ?? null,
      choice, latencyMs: latencyMs ?? null,
      receivedAt: new Date().toISOString(),
    };
    try {
      await producer.send(event);
      answersTotal.inc({ quiz_id: quizId ?? 'unknown', outcome: 'accepted' });
      reply.code(202);
      return { ok: true };
    } catch (err) {
      req.log.error({ err }, 'producer send failed');
      answersTotal.inc({ quiz_id: quizId ?? 'unknown', outcome: 'error' });
      return reply.code(503).send({ error: 'queue unavailable' });
    }
  });

  app.addHook('onClose', async () => { await producer.disconnect(); });

  // Expose producer for tests
  app.decorate('producer', producer);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build();
  app.listen({ port: config.port, host: '0.0.0.0' })
    .then(() => app.log.info(`answers-ingest listening on ${config.port}`))
    .catch((err) => { app.log.error(err); process.exit(1); });
}
