import type { BoardFile, BoardRank, Square } from '@chess/shared';

/**
 * Squares are plain `{ file, rank }` integer pairs, 0-7 each, counted from a1.
 * Not 0x88, not bitboards: those are the right answer for an engine searching
 * millions of nodes and the wrong one for code a human has to verify by eye.
 *
 * These arrays are duplicated from `@chess/shared` rather than imported,
 * because importing them as values would put `@chess/shared` — and with it
 * Zod — in this package's runtime graph. Only types cross that boundary.
 */
const FILES: readonly BoardFile[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS: readonly BoardRank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

/** Thrown when a square name is not one of the sixty-four. */
export class InvalidSquareError extends Error {
  readonly square: string;

  constructor(square: string) {
    super(`Not a square name: ${JSON.stringify(square)}`);
    this.name = 'InvalidSquareError';
    this.square = square;
  }
}

/** A square as coordinates, or a step between two of them. */
export interface Coords {
  file: number;
  rank: number;
}

/** `"e4"` -> `{ file: 4, rank: 3 }`. Throws if the name is not a square. */
export function toCoords(square: string): Coords {
  const file = FILES.indexOf(square[0] as BoardFile);
  const rank = RANKS.indexOf(square[1] as BoardRank);

  if (square.length !== 2 || file === -1 || rank === -1) {
    throw new InvalidSquareError(square);
  }

  return { file, rank };
}

/**
 * `{ file: 4, rank: 3 }` -> `"e4"`, or `undefined` when the coordinates fall
 * off the board. Bounds checking lives here alone: out-of-range indices miss
 * the arrays, so every caller gets the same answer without repeating the test.
 */
export function toSquare({ file, rank }: Coords): Square | undefined {
  const fileName = FILES[file];
  const rankName = RANKS[rank];

  return fileName && rankName ? `${fileName}${rankName}` : undefined;
}
