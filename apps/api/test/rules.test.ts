import { describe, expect, it } from 'vitest';
import { applyMove, gameStatus, legalMoves, parseFen, STARTING_FEN } from '@chess/rules';

/**
 * `@chess/rules` exists as its own package because the server will need it —
 * move validation cannot live in the browser. This is the standing proof that
 * it imports and runs here under NodeNext resolution, not only under Vite.
 */
describe('@chess/rules from the API', () => {
  it('generates and plays moves from the starting position', () => {
    const start = parseFen(STARTING_FEN);
    expect(legalMoves(start)).toHaveLength(20);

    const opening = legalMoves(start).find((move) => move.from === 'e2' && move.to === 'e4');
    if (!opening) throw new Error('e2e4 should be legal from the starting position');

    const next = applyMove(start, opening);
    expect(next.turn).toBe('b');
    expect(next.board['e4']).toEqual({ type: 'p', color: 'w' });
    expect(gameStatus(next)).toEqual({ state: 'playing', check: false });
  });
});
