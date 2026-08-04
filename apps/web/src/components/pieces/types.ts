import type { PieceColor, PieceType } from '@chess/shared';
import type { ReactElement, SVGProps } from 'react';
import type { PieceSetId } from './pieceSets';

/**
 * Artwork-side types only. What a piece *is* — `PieceType`, `PieceColor`,
 * `Piece`, `Board` — lives in `@chess/shared`, because `@chess/rules` and the
 * API need the same vocabulary and cannot import from `apps/`.
 */

/** Key into a set's component map, e.g. `wn` for the white knight. */
export type PieceKey = `${PieceColor}${PieceType}`;

/** Props every piece artwork component accepts and spreads onto its `<svg>`. */
export type PieceArtProps = SVGProps<SVGSVGElement>;

export type PieceArtComponent = (props: PieceArtProps) => ReactElement;

/**
 * A complete set: twelve components, one per (type, colour) pair. Structured
 * like the board theme registry so a second set is a folder plus one line.
 */
export interface PieceSet {
  id: string;
  name: string;
  components: Record<PieceKey, PieceArtComponent>;
}

export interface PieceProps extends PieceArtProps {
  type: PieceType;
  color: PieceColor;
  /** Set id from the registry in `pieceSets.ts`. */
  set?: PieceSetId;
}
