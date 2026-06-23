import Fastify from 'fastify';
import { Kafka, logLevel } from 'kafkajs';
import { MongoClient } from 'mongodb';
import { register, collectDefaultMetrics, Counter, Gauge } from 'prom-client';
import { config } from './config.js';
import { createAggregator } from './aggregator.js';

collectDefaultMetrics();
const eventsConsumed = new Counter({ name: 'events_consumed_total', help: 'Events consumed', labelNames: ['outcome'] });
const flushBuckets = new Gauge({ name: 'flush_buckets', help: 'Buckets per flush' });

export async function build(overrides = {}) {
  const cfg = { ...config, ...overrides };
  const app = Fastify({ logger: { level: cfg.logLevel } });

  const mongo = cfg.stubMongo ? stubMongoCollection() : await connectMongo(cfg);
  const aggregator = createAggregator();
  let consumerHandle = null;

  if (!cfg.stubConsumer) consumerHandle = await startConsumer(cfg, aggregator, app.log);

  const flushTimer = setInterval(async () => {
    const docs = aggregator.snapshot();
    flushBuckets.set(docs.length);
    if (docs.length === 0) return;
    try {
      const ops = docs.map((d) => ({
        updateOne: { filter: { _id: d._id }, update: { $set: d }, upsert: true },
      }));
      await mongo.bulkWrite(ops);
      aggregator.reset();
    } catch (err) {
      app.log.error({ err }, 'mongo flush failed');
    }
  }, cfg.windowSeconds * 1000);
  flushTimer.unref?.();

  app.get('/health', async () => ({ status: 'ok', service: 'stats-aggregator', buckets: aggregator.size() }));
  app.get('/ready', async () => ({ status: 'ready' }));
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  app.addHook('onClose', async () => {
    clearInterval(flushTimer);
    if (consumerHandle) await consumerHandle.stop();
  });

  app.decorate('aggregator', aggregator);
  app.decorate('mongo', mongo);
  return app;

  async function startConsumer(cfg, agg, log) {
    const kafka = new Kafka({ clientId: cfg.kafka.clientId, brokers: cfg.kafka.brokers, logLevel: logLevel.WARN });
    const consumer = kafka.consumer({ groupId: cfg.kafka.groupId });
    const producer = kafka.producer();
    await Promise.all([consumer.connect(), producer.connect()]);
    await consumer.subscribe({ topic: cfg.kafka.topic, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await agg.ingest(event);
          eventsConsumed.inc({ outcome: 'ok' });
        } catch (err) {
          log.warn({ err: err.message }, 'invalid event → DLQ');
          eventsConsumed.inc({ outcome: 'dlq' });
          await producer.send({ topic: cfg.kafka.dlqTopic, messages: [{ value: message.value, headers: { error: err.message } }] });
        }
      },
    });
    return { async stop() { await consumer.disconnect(); await producer.disconnect(); } };
  }
}

async function connectMongo(cfg) {
  const client = new MongoClient(cfg.mongo.uri);
  await client.connect();
  return client.db(cfg.mongo.db).collection(cfg.mongo.collection);
}

function stubMongoCollection() {
  const docs = new Map();
  return {
    async bulkWrite(ops) {
      for (const op of ops) {
        if (op.updateOne) docs.set(op.updateOne.filter._id, op.updateOne.update.$set);
      }
    },
    _docs: docs,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build();
  app.listen({ port: config.port, host: '0.0.0.0' })
    .then(() => app.log.info(`stats-aggregator listening on ${config.port}`))
    .catch((err) => { app.log.error(err); process.exit(1); });
}
