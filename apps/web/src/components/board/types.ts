import type { ReactNode } from 'react';
import type { PieceRef, PieceSetId } from '../pieces';
import type { BoardThemeId } from './themes';

/** Which side sits at the bottom of the board. Purely visual. */
export type Orientation = 'white' | 'black';

export type BoardFile = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type BoardRank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

/** Algebraic square name, e.g. `e4`. Independent of orientation. */
export type Square = `${BoardFile}${BoardRank}`;

/** What sits on which square. Sparse — absent means empty. */
export type PiecePlacement = Partial<Record<Square, PieceRef>>;

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
  pieces?: PiecePlacement;
  /** Piece set used for `pieces`. Defaults to the registry default. */
  pieceSet?: PieceSetId;
  /**
   * Rendered into the same absolutely-positioned layer as the pieces, above
   * them in paint order.
   */
  children?: ReactNode;
}
