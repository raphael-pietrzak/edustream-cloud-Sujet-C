import Fastify from 'fastify';
import { MongoClient } from 'mongodb';
import { register, collectDefaultMetrics, Histogram, Counter } from 'prom-client';
import { config } from './config.js';

collectDefaultMetrics();
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
});
const sseConnections = new Counter({ name: 'sse_connections_total', help: 'Total SSE connections opened' });

export async function build(overrides = {}) {
  const cfg = { ...config, ...overrides };
  const app = Fastify({ logger: { level: cfg.logLevel } });
  const stats = cfg.stubMongo ? stubStats() : await connectMongo(cfg);

  app.addHook('onResponse', (req, reply, done) => {
    if (req.url.startsWith('/sessions/') && req.url.endsWith('/stream')) return done();
    httpRequestDuration.observe(
      { method: req.method, route: req.routeOptions?.url ?? req.url, status: reply.statusCode },
      reply.elapsedTime / 1000,
    );
    done();
  });

  app.get('/health', async () => ({ status: 'ok', service: 'teacher-api' }));
  app.get('/ready', async () => ({ status: 'ready' }));
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  app.get('/sessions/:sessionId/stats', async (req) => stats.bySession(req.params.sessionId));

  app.get('/sessions/:sessionId/stream', async (req, reply) => {
    sseConnections.inc();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    let closed = false;
    req.raw.on('close', () => { closed = true; });
    while (!closed) {
      const docs = await stats.bySession(req.params.sessionId);
      reply.raw.write(`data: ${JSON.stringify(docs)}\n\n`);
      await new Promise((r) => setTimeout(r, cfg.pollMs));
    }
  });

  app.decorate('stats', stats);
  return app;
}

async function connectMongo(cfg) {
  const client = new MongoClient(cfg.mongo.uri);
  await client.connect();
  const col = client.db(cfg.mongo.db).collection(cfg.mongo.collection);
  return {
    async bySession(sessionId) {
      return col.find({ sessionId }).toArray();
    },
  };
}

function stubStats() {
  const docs = new Map();
  return {
    _seed(doc) { docs.set(doc._id, doc); },
    async bySession(sessionId) { return [...docs.values()].filter((d) => d.sessionId === sessionId); },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build();
  app.listen({ port: config.port, host: '0.0.0.0' })
    .then(() => app.log.info(`teacher-api listening on ${config.port}`))
    .catch((err) => { app.log.error(err); process.exit(1); });
}
