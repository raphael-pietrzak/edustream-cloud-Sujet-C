export const config = {
  port: Number(process.env.PORT ?? 3001),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  pg: {
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'edustream',
    password: process.env.PGPASSWORD ?? 'edustream',
    database: process.env.PGDATABASE ?? 'edustream',
  },
  useInMemory: process.env.USE_IN_MEMORY === 'true' || !process.env.PGHOST,
};
