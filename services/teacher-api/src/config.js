export const config = {
  port: Number(process.env.PORT ?? 3004),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  pollMs: Number(process.env.POLL_MS ?? 2000),
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://mongo.data.svc.cluster.local:27017',
    db: process.env.MONGO_DB ?? 'edustream',
    collection: process.env.MONGO_COLLECTION ?? 'session_stats',
  },
  stubMongo: process.env.STUB_MONGO === 'true',
};
