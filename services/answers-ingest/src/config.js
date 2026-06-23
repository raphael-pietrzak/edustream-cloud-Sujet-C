export const config = {
  port: Number(process.env.PORT ?? 3002),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? 'redpanda.messaging.svc.cluster.local:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID ?? 'answers-ingest',
    topic: process.env.KAFKA_TOPIC ?? 'quiz.answers',
  },
  stubProducer: process.env.STUB_PRODUCER === 'true',
};
