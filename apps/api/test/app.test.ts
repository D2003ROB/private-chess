import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { gameListSchema, gameSchema, healthSchema, apiErrorSchema } from '@chess/shared';
import { buildApp } from '../src/app.js';
import { createFakeDatabase, type FakeDatabase } from './fake-db.js';

describe('API', () => {
  let app: FastifyInstance;
  let db: FakeDatabase;

  beforeEach(async () => {
    db = createFakeDatabase();
    app = await buildApp({ db, logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with db: "ok" when the database answers', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(healthSchema.parse(response.json())).toMatchObject({ status: 'ok', db: 'ok' });
    });

    it('returns 503 with db: "down" when the database is unreachable', async () => {
      db.setReachable(false);

      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      expect(healthSchema.parse(response.json())).toMatchObject({
        status: 'degraded',
        db: 'down',
      });
    });
  });

  describe('GET /api/games', () => {
    it('returns an empty list when there are no games', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/games' });

      expect(response.statusCode).toBe(200);
      expect(gameListSchema.parse(response.json())).toEqual([]);
    });
  });

  describe('POST /api/games', () => {
    it('returns 201 and the created game for valid input', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: { whitePlayer: 'Ada', blackPlayer: 'Alan' },
      });

      expect(response.statusCode).toBe(201);

      const game = gameSchema.parse(response.json());
      expect(game).toMatchObject({
        whitePlayer: 'Ada',
        blackPlayer: 'Alan',
        status: 'PENDING',
      });

      const list = await app.inject({ method: 'GET', url: '/api/games' });
      expect(gameListSchema.parse(list.json())).toHaveLength(1);
    });

    it('returns 400 and creates nothing for an empty player name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: { whitePlayer: '', blackPlayer: 'Alan' },
      });

      expect(response.statusCode).toBe(400);

      const body = apiErrorSchema.parse(response.json());
      expect(body.error).toBe('ValidationError');
      expect(body.details?.[0]?.path).toBe('whitePlayer');
      expect(db.records).toHaveLength(0);
    });

    it('returns 400 when a field is missing entirely', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: { whitePlayer: 'Ada' },
      });

      expect(response.statusCode).toBe(400);
      expect(db.records).toHaveLength(0);
    });
  });

  describe('GET /api/games/:id', () => {
    it('returns 404 for an unknown id', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/games/does-not-exist' });

      expect(response.statusCode).toBe(404);
      expect(apiErrorSchema.parse(response.json()).error).toBe('NotFound');
    });

    it('returns 200 and the game for a known id', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: { whitePlayer: 'Ada', blackPlayer: 'Alan' },
      });
      const { id } = gameSchema.parse(created.json());

      const response = await app.inject({ method: 'GET', url: `/api/games/${id}` });

      expect(response.statusCode).toBe(200);
      expect(gameSchema.parse(response.json()).id).toBe(id);
    });
  });
});
