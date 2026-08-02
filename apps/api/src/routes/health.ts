import type { FastifyInstance } from 'fastify';
import type { Health } from '@chess/shared';
import type { Database } from '../db.js';

/**
 * `GET /health` — 200 with `db: "ok"` when Postgres answers, 503 with
 * `db: "down"` when it does not. A dead database must never crash the process.
 */
export function registerHealthRoutes(app: FastifyInstance, db: Database): void {
  app.get('/health', async (_request, reply) => {
    let dbUp = true;

    try {
      await db.ping();
    } catch (error) {
      dbUp = false;
      app.log.warn({ err: error }, 'health check: database unreachable');
    }

    const body: Health = {
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'ok' : 'down',
      uptime: Math.round(process.uptime()),
    };

    return reply.status(dbUp ? 200 : 503).send(body);
  });
}
