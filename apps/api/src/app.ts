import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { ApiErrorBody } from '@chess/shared';
import type { Database } from './db.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerGameRoutes } from './routes/games.js';

export interface BuildAppOptions {
  /** The data layer. Production passes a Prisma-backed one, tests a fake. */
  db: Database;
  /** Allowed CORS origin. Defaults to the Vite dev server. */
  webOrigin?: string;
  /** Pass `false` in tests to keep the output quiet. */
  logger?: boolean;
}

/**
 * Builds a fully wired Fastify instance without listening on a port, so tests
 * can drive it through `app.inject()`.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { db, webOrigin = 'http://localhost:5173', logger = true } = options;

  const app = Fastify({ logger });

  await app.register(cors, { origin: webOrigin });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiErrorBody = {
      error: 'NotFound',
      message: `Route ${request.method} ${request.url} not found.`,
    };
    return reply.status(404).send(body);
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'unhandled error');
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    const body: ApiErrorBody = {
      error: status === 500 ? 'InternalServerError' : error.name,
      message: status === 500 ? 'Something went wrong.' : error.message,
    };
    return reply.status(status).send(body);
  });

  registerHealthRoutes(app, db);
  registerGameRoutes(app, db);

  return app;
}
