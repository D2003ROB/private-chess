import { PrismaClient } from '@prisma/client';
import type { CreateGameInput, GameStatus } from '@chess/shared';

/** A game as it comes out of the database: dates are still `Date` objects. */
export interface GameRecord {
  id: string;
  whitePlayer: string;
  blackPlayer: string;
  status: GameStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The only database surface the routes are allowed to touch. Keeping it this
 * narrow is what lets the tests hand `buildApp` an in-memory implementation
 * instead of requiring a live Postgres.
 */
export interface Database {
  games: {
    list(): Promise<GameRecord[]>;
    findById(id: string): Promise<GameRecord | null>;
    create(input: CreateGameInput): Promise<GameRecord>;
  };
  /** Resolves if the database answers, rejects otherwise. Used by `/health`. */
  ping(): Promise<void>;
  disconnect(): Promise<void>;
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
}

export function createPrismaDatabase(client: PrismaClient): Database {
  return {
    games: {
      list: () => client.game.findMany({ orderBy: { createdAt: 'desc' } }),
      findById: (id) => client.game.findUnique({ where: { id } }),
      create: (input) => client.game.create({ data: input }),
    },
    ping: async () => {
      await client.$queryRaw`SELECT 1`;
    },
    disconnect: () => client.$disconnect(),
  };
}
