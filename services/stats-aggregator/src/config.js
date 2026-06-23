export const config = {
  port: Number(process.env.PORT ?? 3003),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  windowSeconds: Number(process.env.WINDOW_SECONDS ?? 10),
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? 'redpanda.messaging.svc.cluster.local:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID ?? 'stats-aggregator',
    groupId: process.env.KAFKA_GROUP_ID ?? 'stats-aggregator-cg',
    topic: process.env.KAFKA_TOPIC ?? 'quiz.answers',
    dlqTopic: process.env.KAFKA_DLQ_TOPIC ?? 'quiz.answers.dlq',
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://mongo.data.svc.cluster.local:27017',
    db: process.env.MONGO_DB ?? 'edustream',
    collection: process.env.MONGO_COLLECTION ?? 'session_stats',
  },
  stubConsumer: process.env.STUB_CONSUMER === 'true',
  stubMongo: process.env.STUB_MONGO === 'true',
};
