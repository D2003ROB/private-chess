import { describe, expect, it } from 'vitest';
import type { Move, Square } from '@chess/shared';
import { applyMove } from '../apply.js';
import { parseFen, STARTING_FEN, toFen } from '../fen.js';
import { legalMoves, legalMovesFrom } from '../moves.js';
import { moveKey } from '../perft.js';

/** The one legal move from `from` to `to`, so tests name moves the way people do. */
function play(fen: string, from: Square, to: Square, promotion?: string) {
  const position = parseFen(fen);
  const move = legalMovesFrom(position, from).find(
    (candidate) =>
      candidate.to === to && (promotion === undefined || candidate.promotion === promotion),
  );

  if (!move) throw new Error(`${from}${to} is not legal in ${fen}`);
  return { before: position, move, after: applyMove(position, move) };
}

describe('applyMove', () => {
  it('is pure — the position it was given is deeply unchanged', () => {
    const position = parseFen(STARTING_FEN);
    const snapshot = structuredClone(position);

    for (const move of legalMoves(position)) applyMove(position, move);

    expect(position).toEqual(snapshot);
  });

  it('moves the piece and hands the turn over', () => {
    const { after } = play(STARTING_FEN, 'e2', 'e4');

    expect(after.board['e2']).toBeUndefined();
    expect(after.board['e4']).toEqual({ type: 'p', color: 'w' });
    expect(after.turn).toBe('b');
  });

  it('removes the captured piece', () => {
    const { after } = play('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', 'e4', 'd5');

    expect(after.board['d5']).toEqual({ type: 'p', color: 'w' });
  });
});

describe('clocks', () => {
  it('counts plies since the last capture or pawn move', () => {
    const { after } = play('4k3/8/1n6/8/8/8/8/4K2R w - - 7 30', 'h1', 'h5');
    expect(after.halfmoveClock).toBe(8);

    expect(play(STARTING_FEN, 'e2', 'e4').after.halfmoveClock).toBe(0);
    expect(play('4k3/8/8/3p4/4P3/8/8/4K3 w - - 9 30', 'e4', 'd5').after.halfmoveClock).toBe(0);
  });

  it('counts a full move only once black has replied', () => {
    const first = play(STARTING_FEN, 'e2', 'e4');
    expect(first.after.fullmoveNumber).toBe(1);

    const reply = applyMove(
      first.after,
      legalMovesFrom(first.after, 'e7').find((move) => move.to === 'e5') as Move,
    );
    expect(reply.fullmoveNumber).toBe(2);
  });
});

describe('en passant', () => {
  it('sets the target to the square the pawn skipped, and clears it otherwise', () => {
    const { after } = play(STARTING_FEN, 'e2', 'e4');
    expect(after.epTarget).toBe('e3');

    const next = play(toFen(after), 'b8', 'c6');
    expect(next.after.epTarget).toBeNull();
  });

  it('sets the target even when no pawn can take it', () => {
    // Standard FEN records the square unconditionally; perft counts depend on it.
    expect(play(STARTING_FEN, 'a2', 'a4').after.epTarget).toBe('a3');
  });

  it('removes the captured pawn from a square other than `to`', () => {
    const opening = play('4k3/8/8/8/4p3/8/3P4/4K3 w - - 0 1', 'd2', 'd4');
    expect(opening.after.epTarget).toBe('d3');

    const capture = play(toFen(opening.after), 'e4', 'd3');

    expect(capture.move.flags).toContain('ep');
    expect(capture.after.board['d3']).toEqual({ type: 'p', color: 'b' });
    // The ghost: the pawn that was taken stood on d4, not on d3.
    expect(capture.after.board['d4']).toBeUndefined();
    expect(capture.after.board['e4']).toBeUndefined();
  });

  it('refuses the capture when it would expose the king along the rank', () => {
    // White rook b4, black king h4: taking on g3 empties both f4 and g4 and
    // opens the rank. Handled by simulation, not by a pin rule.
    const afterPush = play('8/8/8/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 'g2', 'g4');

    expect(afterPush.after.epTarget).toBe('g3');
    expect(legalMoves(afterPush.after).map(moveKey)).not.toContain('f4g3');
  });

  it('allows the same capture when the rank is not exposed', () => {
    // The identical position with the white rook off the rank.
    const afterPush = play('8/8/8/KP5r/5p1k/8/4P1P1/8 w - - 0 1', 'g2', 'g4');

    expect(legalMoves(afterPush.after).map(moveKey)).toContain('f4g3');
  });
});

describe('castling', () => {
  it('moves the rook as well as the king', () => {
    const kingside = play('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', 'e1', 'g1');

    expect(kingside.after.board['g1']).toEqual({ type: 'k', color: 'w' });
    expect(kingside.after.board['f1']).toEqual({ type: 'r', color: 'w' });
    expect(kingside.after.board['h1']).toBeUndefined();

    const queenside = play('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', 'e1', 'c1');

    expect(queenside.after.board['c1']).toEqual({ type: 'k', color: 'w' });
    expect(queenside.after.board['d1']).toEqual({ type: 'r', color: 'w' });
    expect(queenside.after.board['a1']).toBeUndefined();
  });

  it('revokes both rights once the king has moved', () => {
    const { after } = play('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', 'e1', 'e2');

    expect(after.castling).toEqual({ wK: false, wQ: false, bK: false, bQ: false });
  });

  it('revokes one right when that rook moves', () => {
    const { after } = play('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'h1', 'g1');

    expect(after.castling).toMatchObject({ wK: false, wQ: true });
  });

  it('revokes the right of a rook captured on its home square', () => {
    // The half everyone forgets: the move that costs black the right is white's.
    const { after } = play('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'a1', 'a8');

    expect(after.castling).toEqual({ wK: true, wQ: false, bK: true, bQ: false });
  });
});

describe('promotion', () => {
  it('places the chosen piece, never the pawn', () => {
    for (const promotion of ['q', 'r', 'b', 'n']) {
      const { after } = play('7k/P7/8/8/8/8/8/K7 w - - 0 1', 'a7', 'a8', promotion);
      expect(after.board['a8']).toEqual({ type: promotion, color: 'w' });
    }
  });

  it('promotes on a capture too', () => {
    const { after } = play('1n5k/P7/8/8/8/8/8/K7 w - - 0 1', 'a7', 'b8', 'q');

    expect(after.board['b8']).toEqual({ type: 'q', color: 'w' });
    expect(after.board['a7']).toBeUndefined();
  });
});
