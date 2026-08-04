import type { Board, Square } from '@chess/shared';
import type { ReactNode } from 'react';
import type { PieceSetId } from '../pieces';
import type { BoardThemeId } from './themes';

/**
 * `Square`, `Board` and the piece vocabulary come from `@chess/shared`; the
 * board component owns only how a position is *drawn*.
 */

/** Which side sits at the bottom of the board. Purely visual. */
export type Orientation = 'white' | 'black';

/** How file/rank labels are drawn. */
export type CoordinateMode = 'inside' | 'outside' | 'none';

/** Colour of a single square. */
export type SquareColor = 'light' | 'dark';

/**
 * A board colour scheme. `lightCoord` is the label colour used on a light
 * square and `darkCoord` the one used on a dark square — by default the
 * opposite square's colour, so labels read as part of the board.
 */
export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
  lightCoord: string;
  darkCoord: string;
  border: string;
  /** Used only to group themes in a picker. */
  scheme: 'light' | 'dark';
}

export interface ChessboardProps {
  /** Theme id from the registry in `themes.ts`. */
  theme?: BoardThemeId;
  orientation?: Orientation;
  coordinates?: CoordinateMode;
  /** Board edge length: a number (px) or any CSS length. Omitted fills the container. */
  size?: number | string;
  /** Extra class on the board root. */
  className?: string;
  /**
   * Pieces to draw, keyed by square. Rendered into the overlay layer and
   * positioned by grid cell, so a change here never reflows the squares.
   */
  pieces?: Board;
  /** Piece set used for `pieces`. Defaults to the registry default. */
  pieceSet?: PieceSetId;
  /**
   * Called with the square a click landed on. The board stays presentational:
   * it reports the square and holds no selection state of its own.
   */
  onSquareClick?: (square: Square) => void;
  /**
   * Rendered into the same absolutely-positioned layer as the pieces, above
   * them in paint order.
   */
  children?: ReactNode;
}
