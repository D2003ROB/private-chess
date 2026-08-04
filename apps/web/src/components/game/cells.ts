import { FILES, RANKS, type BoardFile, type BoardRank, type Square } from '@chess/shared';
import type { Orientation } from '../board';

/**
 * Where a square is drawn — the inverse of the board's own cell -> name
 * mapping. Markers position themselves against the same 8x8 grid the pieces
 * use, so the two can never drift apart.
 */
export function squareToCell(square: Square, orientation: Orientation) {
  const file = FILES.indexOf(square[0] as BoardFile);
  const rank = RANKS.indexOf(square[1] as BoardRank);

  return {
    column: orientation === 'white' ? file : 7 - file,
    row: orientation === 'white' ? 7 - rank : rank,
  };
}
