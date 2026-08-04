import { describe, expect, it } from 'vitest';
import type { PieceColor, Square } from '@chess/shared';
import { isSquareAttacked } from '../attacks.js';
import { parseFen } from '../fen.js';
import { legalMoves } from '../moves.js';

const attacked = (fen: string, square: Square, by: PieceColor) =>
  isSquareAttacked(parseFen(fen), square, by);

describe('isSquareAttacked', () => {
  it('sees a pawn covering its two diagonals, and nothing else', () => {
    const fen = '4k3/8/8/8/8/3P4/8/4K3 w - - 0 1';

    expect(attacked(fen, 'c4', 'w')).toBe(true);
    expect(attacked(fen, 'e4', 'w')).toBe(true);
    // Straight ahead is where it moves, not where it attacks.
    expect(attacked(fen, 'd4', 'w')).toBe(false);
    expect(attacked(fen, 'c2', 'w')).toBe(false);
  });

  it('covers an empty square, which is why it cannot ask the move generator', () => {
    // No white move reaches c4 — a pawn cannot move diagonally onto nothing —
    // yet c4 is attacked, so a king may not go there.
    const fen = '4k3/8/8/8/8/3P4/8/4K3 b - - 0 1';

    expect(legalMoves(parseFen('4k3/8/8/8/8/3P4/8/4K3 w - - 0 1')).map((m) => m.to)).not.toContain(
      'c4',
    );
    expect(attacked(fen, 'c4', 'w')).toBe(true);
  });

  it('reverses the pawn direction for black', () => {
    const fen = '4k3/8/8/3p4/8/8/8/4K3 w - - 0 1';

    expect(attacked(fen, 'c4', 'b')).toBe(true);
    expect(attacked(fen, 'e4', 'b')).toBe(true);
    expect(attacked(fen, 'c6', 'b')).toBe(false);
  });

  it('sees knights on their eight offsets', () => {
    const fen = '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1';

    for (const square of ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'] as Square[]) {
      expect(attacked(fen, square, 'w'), square).toBe(true);
    }
    expect(attacked(fen, 'd5', 'w')).toBe(false);
  });

  it('sees sliders along their rays and stops at the first piece', () => {
    const fen = '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1';

    expect(attacked(fen, 'd8', 'w')).toBe(true);
    expect(attacked(fen, 'h4', 'w')).toBe(true);
    expect(attacked(fen, 'e5', 'w')).toBe(false);

    // A blocker cuts the ray, but the blocker's own square is still attacked.
    const blocked = '4k3/8/8/3p4/3R4/8/8/4K3 w - - 0 1';
    expect(attacked(blocked, 'd5', 'w')).toBe(true);
    expect(attacked(blocked, 'd6', 'w')).toBe(false);
  });

  it('distinguishes rook rays from bishop rays', () => {
    expect(attacked('4k3/8/8/8/3B4/8/8/4K3 w - - 0 1', 'd8', 'w')).toBe(false);
    expect(attacked('4k3/8/8/8/3B4/8/8/4K3 w - - 0 1', 'g7', 'w')).toBe(true);
    expect(attacked('4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1', 'd8', 'w')).toBe(true);
    expect(attacked('4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1', 'g7', 'w')).toBe(true);
  });

  it('counts a king as an attacker, which is what keeps the kings apart', () => {
    const fen = '8/8/8/3k4/8/3K4/8/8 w - - 0 1';

    expect(attacked(fen, 'd4', 'b')).toBe(true);
    expect(attacked(fen, 'c4', 'b')).toBe(true);
    expect(attacked(fen, 'd3', 'b')).toBe(false);
  });

  it('is about coverage, not about ownership of the square', () => {
    // A defended piece stands on an attacked square; that is the point.
    const fen = '4k3/8/8/8/8/8/1P6/1R2K3 w - - 0 1';

    expect(attacked(fen, 'b2', 'w')).toBe(true);
    expect(attacked(fen, 'b1', 'b')).toBe(false);
  });
});
