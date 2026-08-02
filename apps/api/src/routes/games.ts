import type { FastifyInstance } from 'fastify';
import {
  createGameInputSchema,
  gameIdParamsSchema,
  type ApiErrorBody,
  type Game,
} from '@chess/shared';
import type { Database, GameRecord } from '../db.js';

/** Database record -> wire format. Dates become ISO-8601 strings. */
function toGameDto(record: GameRecord): Game {
  return {
    id: record.id,
    whitePlayer: record.whitePlayer,
    blackPlayer: record.blackPlayer,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function registerGameRoutes(app: FastifyInstance, db: Database): void {
  app.get('/api/games', async () => {
    const games = await db.games.list();
    return games.map(toGameDto);
  });

  app.get('/api/games/:id', async (request, reply) => {
    const params = gameIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      const body: ApiErrorBody = {
        error: 'BadRequest',
        message: 'Invalid game id.',
      };
      return reply.status(400).send(body);
    }

    const game = await db.games.findById(params.data.id);

    if (!game) {
      const body: ApiErrorBody = {
        error: 'NotFound',
        message: `No game with id "${params.data.id}".`,
      };
      return reply.status(404).send(body);
    }

    return reply.status(200).send(toGameDto(game));
  });

  app.post('/api/games', async (request, reply) => {
    const parsed = createGameInputSchema.safeParse(request.body);

    if (!parsed.success) {
      const body: ApiErrorBody = {
        error: 'ValidationError',
        message: 'The request body is invalid.',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
      return reply.status(400).send(body);
    }

    const game = await db.games.create(parsed.data);
    return reply.status(201).send(toGameDto(game));
  });
}
