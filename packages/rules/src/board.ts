import type { Board, BoardFile, BoardRank, Piece, PieceColor, Square } from '@chess/shared';

/**
 * Squares are plain `{ file, rank }` integer pairs, 0-7 each, counted from a1.
 * Not 0x88, not bitboards: those are the right answer for an engine searching
 * millions of nodes and the wrong one for code a human has to verify by eye.
 *
 * These arrays are duplicated from `@chess/shared` rather than imported,
 * because importing them as values would put `@chess/shared` — and with it
 * Zod — in this package's runtime graph. Only types cross that boundary.
 */
export const FILES: readonly BoardFile[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS: readonly BoardRank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

/** All sixty-four squares in ascending algebraic order, `a1` … `h8`. */
export const ALL_SQUARES: readonly Square[] = FILES.flatMap((file) =>
  RANKS.map((rank) => `${file}${rank}` as Square),
);

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

export function isSquare(value: string): value is Square {
  return (
    value.length === 2 &&
    FILES.includes(value[0] as BoardFile) &&
    RANKS.includes(value[1] as BoardRank)
  );
}

/** `"e4"` -> `{ file: 4, rank: 3 }`. Throws if the name is not a square. */
export function toCoords(square: string): Coords {
  if (!isSquare(square)) throw new InvalidSquareError(square);

  return {
    file: FILES.indexOf(square[0] as BoardFile),
    rank: RANKS.indexOf(square[1] as BoardRank),
  };
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

/** `a` + `b`, without bounds checking — `toSquare` is what rejects the result. */
export function step(from: Coords, by: Coords): Coords {
  return { file: from.file + by.file, rank: from.rank + by.rank };
}

export function opponent(color: PieceColor): PieceColor {
  return color === 'w' ? 'b' : 'w';
}

/** The square the given side's king stands on, or `undefined` in a kingless test position. */
export function findKing(board: Board, color: PieceColor): Square | undefined {
  return ALL_SQUARES.find((square) => {
    const piece: Piece | undefined = board[square];
    return piece?.type === 'k' && piece.color === color;
  });
}

/** Light or dark, which is all that matters for the two-bishop draw rule. */
export function squareColor(square: Square): 'light' | 'dark' {
  const { file, rank } = toCoords(square);
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}
