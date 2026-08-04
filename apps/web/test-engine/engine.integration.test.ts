import { afterEach, describe, expect, it } from 'vitest';
import { EngineClient } from '../src/engine/EngineClient';
import type { Evaluation } from '../src/engine/types';
import { createProcessPort } from './processPort';

/**
 * The real engine, end to end. Excluded from `pnpm test` — it loads 7 MB of
 * WebAssembly and searches for real. Run it with `pnpm test:engine`.
 *
 * These assertions are deliberately loose. The point is that the protocol
 * plumbing and the perspective normalisation hold against the actual engine,
 * not that Stockfish returns a particular number.
 */

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
/** Black to move: Ra8-a1 is mate on the back rank, the king walled in by its own pawns. */
const BLACK_MATES_IN_ONE = 'r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1';

let client: EngineClient | null = null;

afterEach(() => {
  client?.dispose();
  client = null;
});

async function analyse(fen: string, depth: number): Promise<Evaluation> {
  const engine = new EngineClient({ createPort: createProcessPort, multiPv: 3 });
  client = engine;

  const evaluations: Evaluation[] = [];
  engine.on('eval', (evaluation) => evaluations.push(evaluation));

  await engine.init();
  engine.analyse(fen, { depth });

  await new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (engine.getState() === 'ready' && evaluations.length > 0) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - started > 90_000) {
        clearInterval(poll);
        reject(new Error('The engine did not finish searching'));
      }
    }, 50);
  });

  const last = evaluations.at(-1);
  if (!last) throw new Error('The engine produced no evaluation');
  return last;
}

describe('the real engine', () => {
  it('reaches readyok and evaluates the starting position as roughly level', async () => {
    const evaluation = await analyse(START, 10);

    expect(evaluation.score.kind).toBe('cp');
    expect(Math.abs(evaluation.score.value)).toBeLessThanOrEqual(60);
    expect(evaluation.depth).toBeGreaterThanOrEqual(10);
    expect(evaluation.fen).toBe(START);
  });

  it('returns three candidate lines', async () => {
    const evaluation = await analyse(START, 10);

    expect(evaluation.lines).toHaveLength(3);
    expect(evaluation.lines.map((line) => line.multipv)).toEqual([1, 2, 3]);
    for (const line of evaluation.lines) expect(line.moves[0]).toMatch(/^[a-h][1-8][a-h][1-8]/);
  });

  it('reports a mate for Black as negative, not positive', async () => {
    // The engine reports `mate 1` from Black's perspective here. If the sign
    // normalisation were missing, this would read as White mating.
    const evaluation = await analyse(BLACK_MATES_IN_ONE, 6);

    expect(evaluation.score.kind).toBe('mate');
    expect(evaluation.score.value).toBeLessThan(0);
    expect(Math.abs(evaluation.score.value)).toBe(1);
  });
});
