import { DEFAULT_PIECE_SET_ID, getPieceSet } from './pieceSets';
import type { PieceColor, PieceProps, PieceType } from './types';

const TYPE_NAMES: Record<PieceType, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const COLOR_NAMES: Record<PieceColor, string> = {
  w: 'White',
  b: 'Black',
};

/** e.g. "White knight". */
export function pieceLabel(color: PieceColor, type: PieceType): string {
  return `${COLOR_NAMES[color]} ${TYPE_NAMES[type]}`;
}

/**
 * Dispatches to the artwork for a (set, colour, type). It does not draw —
 * every path in the project lives in the twelve set components.
 *
 * The rendered SVG fills its container; sizing is the parent's job.
 */
export function Piece({ type, color, set = DEFAULT_PIECE_SET_ID, ...svgProps }: PieceProps) {
  const Art = getPieceSet(set).components[`${color}${type}`];

  return (
    <Art role="img" aria-label={pieceLabel(color, type)} width="100%" height="100%" {...svgProps} />
  );
}
