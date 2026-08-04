import { describe, expect, it } from 'vitest';
import { STARTING_LAYOUT } from '@chess/shared';
import { movesFor } from '@chess/rules';

/**
 * `@chess/rules` exists as its own package because the server will need it —
 * move validation cannot live in the browser. This is the standing proof that
 * it imports and runs here under NodeNext resolution, not only under Vite.
 */
describe('@chess/rules from the API', () => {
  it('generates moves from the starting position', () => {
    expect(movesFor(STARTING_LAYOUT, 'b1')).toEqual(['a3', 'c3']);
    expect(movesFor(STARTING_LAYOUT, 'e2')).toEqual(['e3', 'e4']);
    expect(movesFor(STARTING_LAYOUT, 'e1')).toEqual([]);
  });
});
