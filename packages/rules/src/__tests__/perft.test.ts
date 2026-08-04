import { describe, expect, it } from 'vitest';
import { parseFen } from '../fen.js';
import { divide, perft } from '../perft.js';
import { PERFT_POSITIONS } from './positions.js';

/**
 * Depths 1-3 for all five standard positions. Depth 4 lives in
 * `perft-deep.perft.ts` and runs under `pnpm test:perft`, because it counts
 * nearly seven million leaves and this file has to stay fast enough to run on
 * every change.
 */
describe('perft', () => {
  describe.each(PERFT_POSITIONS)('$name — $targets', ({ fen, nodes }) => {
    const position = parseFen(fen);

    it.each([1, 2, 3])('matches at depth %i', (depth) => {
      expect(perft(position, depth)).toBe(nodes[depth - 1]);
    });
  });

  it('divides the root into per-move subtrees that sum to the total', () => {
    const position = parseFen(PERFT_POSITIONS[1]?.fen ?? '');
    const split = divide(position, 3);

    expect(split).toHaveLength(48);
    expect(split.reduce((total, entry) => total + entry.nodes, 0)).toBe(97_862);
    // Sorted by move, so a diff against a known-good source lines up.
    expect(split.map((entry) => entry.move)).toEqual([...split.map((entry) => entry.move)].sort());
  });
});
