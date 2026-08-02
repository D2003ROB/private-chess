import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { createPrismaClient, createPrismaDatabase } from './db.js';
import { loadEnv } from './env.js';

// Load `apps/api/.env` when present. Resolved relative to this file so it works
// the same from `src` (tsx) and `dist` (node).
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const env = loadEnv();

const prisma = createPrismaClient(env.DATABASE_URL);
const db = createPrismaDatabase(prisma);

const app = await buildApp({
  db,
  webOrigin: env.WEB_ORIGIN,
  logger: true,
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void (async () => {
      app.log.info(`${signal} received, shutting down`);
      await app.close();
      await db.disconnect();
      process.exit(0);
    })();
  });
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`API listening on http://localhost:${env.PORT}`);
} catch (error) {
  app.log.error({ err: error }, 'failed to start API');
  process.exit(1);
}
