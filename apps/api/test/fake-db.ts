import type { CreateGameInput } from '@chess/shared';
import type { Database, GameRecord } from '../src/db.js';

export interface FakeDatabase extends Database {
  /** Flip to make `ping()` reject, simulating a stopped Postgres container. */
  setReachable(reachable: boolean): void;
  records: GameRecord[];
}

/**
 * In-memory stand-in for the Prisma-backed `Database`. Keeps `pnpm test`
 * hermetic: no Docker, no migrations, no network.
 */
export function createFakeDatabase(seed: GameRecord[] = []): FakeDatabase {
  const records: GameRecord[] = [...seed];
  let reachable = true;
  let counter = 0;

  return {
    records,
    setReachable(next) {
      reachable = next;
    },
    games: {
      list: async () => [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      findById: async (id) => records.find((record) => record.id === id) ?? null,
      create: async (input: CreateGameInput) => {
        counter += 1;
        const now = new Date();
        const record: GameRecord = {
          id: `game_${counter}`,
          whitePlayer: input.whitePlayer,
          blackPlayer: input.blackPlayer,
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        };
        records.push(record);
        return record;
      },
    },
    ping: async () => {
      if (!reachable) {
        throw new Error('connection refused');
      }
    },
    disconnect: async () => {},
  };
}
