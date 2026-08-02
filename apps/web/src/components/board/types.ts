import type { ReactNode } from 'react';
import type { BoardThemeId } from './themes';

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
   * Rendered into an absolutely-positioned layer above the squares. Empty for
   * now; it exists so pieces can be mounted later without restructuring the DOM.
   */
  children?: ReactNode;
}
