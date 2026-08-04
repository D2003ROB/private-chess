import { describe, expect, it } from 'vitest';
import type { Position } from '@chess/shared';
import { applyMove } from '../apply.js';
import { parseFen } from '../fen.js';
import { legalMoves } from '../moves.js';
import { perft } from '../perft.js';
import { PERFT_POSITIONS } from './positions.js';

/**
 * Depth 4, run by `pnpm test:perft` rather than `pnpm test`.
 *
 * Every node copies the whole position, so this takes minutes. That is the
 * deliberate trade from the ticket: a correct engine that copies is worth more
 * than a fast one that miscounts Kiwipete by four.
 */

/**
 * Sums the root moves one at a time, yielding between them.
 *
 * `perft` itself is synchronous and stays that way — but a single 60-second
 * synchronous call starves the event loop, and Vitest's reporter gives up on
 * the worker mid-test. Counting per root move is the same number with somewhere
 * for the runtime to breathe.
 */
async function perftYielding(position: Position, depth: number): Promise<number> {
  let nodes = 0;

  for (const move of legalMoves(position)) {
    nodes += perft(applyMove(position, move), depth - 1);
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }

  return nodes;
}

describe('perft at depth 4', () => {
  it.each(PERFT_POSITIONS)('$name — $targets', async ({ fen, nodes }) => {
    expect(await perftYielding(parseFen(fen), 4)).toBe(nodes[3]);
  });
});
