import { FILES, RANKS, type Square } from '@chess/shared';
import type { CSSProperties, MouseEvent } from 'react';
import { Piece } from '../pieces';
import { getTheme, DEFAULT_THEME_ID } from './themes';
import type { ChessboardProps, CoordinateMode, Orientation, SquareColor } from './types';
import './Chessboard.css';

/**
 * Maps a grid cell to the board square it shows.
 *
 * Grid cells run row-major from the top-left. With white at the bottom the top
 * row is rank 8 and the left column is file a; flipping the board reverses both
 * axes. `fileIndex`/`rankIndex` are always 0-based from a/1, so the square's
 * name never depends on orientation — only where it is drawn does.
 */
function squareAt(row: number, column: number, orientation: Orientation) {
  const fileIndex = orientation === 'white' ? column : 7 - column;
  const rankIndex = orientation === 'white' ? 7 - row : row;

  return {
    fileIndex,
    rankIndex,
    // Both indices are derived from a 0-7 grid position, so the pair is always
    // a real square name.
    name: `${FILES[fileIndex]}${RANKS[rankIndex]}` as Square,
    // a1 (0,0) is dark and h1 (7,0) is light, so an even sum is a dark square.
    color: ((fileIndex + rankIndex) % 2 === 0 ? 'dark' : 'light') satisfies SquareColor,
  };
}

function boardSizeStyle(size: number | string | undefined): CSSProperties {
  if (size === undefined) return {};
  return { '--board-size': typeof size === 'number' ? `${size}px` : size } as CSSProperties;
}

/**
 * A presentational 8x8 board: squares, coordinates and theme colours. It holds
 * no game state and knows nothing about pieces or rules.
 */
export function Chessboard({
  theme = DEFAULT_THEME_ID,
  orientation = 'white',
  coordinates = 'inside',
  size,
  className,
  pieces,
  pieceSet,
  onSquareClick,
  children,
}: ChessboardProps) {
  const activeTheme = getTheme(theme);

  /**
   * One delegated listener rather than 64 handlers: every square already
   * carries its name, so the click is resolved by walking up to the nearest
   * `[data-square]`. Nothing about the DOM or the accessibility tree changes —
   * squares stay `aria-hidden` and the board stays a single `role="img"`.
   */
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onSquareClick) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-square]');
    const square = cell?.dataset['square'];
    if (square) onSquareClick(square as Square);
  };

  // The five variables every square and label style reads. Switching themes is
  // this object changing — nothing else re-computes.
  const themeStyle: CSSProperties = {
    '--board-light': activeTheme.light,
    '--board-dark': activeTheme.dark,
    '--board-light-coord': activeTheme.lightCoord,
    '--board-dark-coord': activeTheme.darkCoord,
    '--board-border': activeTheme.border,
    ...boardSizeStyle(size),
  } as CSSProperties;

  const cells = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const column = index % 8;
    return { index, row, column, ...squareAt(row, column, orientation) };
  });

  const rootClassName = ['chessboard', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName} data-coordinates={coordinates} style={themeStyle}>
      {coordinates === 'outside' ? (
        <OutsideCoordinates orientation={orientation} axis="rank" />
      ) : null}

      <div
        className="chessboard__board"
        role="img"
        aria-label={`Chessboard, ${orientation} at bottom`}
        onClick={handleClick}
      >
        {cells.map((cell) => (
          <div
            key={cell.name}
            className="chessboard__square"
            data-square={cell.name}
            data-color={cell.color}
            aria-hidden="true"
            // Drives the staggered colour fade only; theme colours come from
            // the root variables, never from a per-square style.
            style={{ '--square-index': cell.index } as CSSProperties}
          >
            {coordinates === 'inside' && cell.column === 0 ? (
              <span className="chessboard__label chessboard__label--rank">
                {RANKS[cell.rankIndex]}
              </span>
            ) : null}
            {coordinates === 'inside' && cell.row === 7 ? (
              <span className="chessboard__label chessboard__label--file">
                {FILES[cell.fileIndex]}
              </span>
            ) : null}
          </div>
        ))}

        <div className="chessboard__overlay">
          {pieces
            ? cells.map((cell) => {
                const piece = pieces[cell.name];
                if (!piece) return null;
                return (
                  <div
                    key={cell.name}
                    className="chessboard__piece"
                    // Positioned by grid cell rather than placed in flow, so
                    // changing the piece map never reflows the board.
                    style={{ left: `${cell.column * 12.5}%`, top: `${cell.row * 12.5}%` }}
                  >
                    <Piece
                      type={piece.type}
                      color={piece.color}
                      {...(pieceSet ? { set: pieceSet } : {})}
                    />
                  </div>
                );
              })
            : null}
          {children}
        </div>
      </div>

      {coordinates === 'outside' ? (
        <OutsideCoordinates orientation={orientation} axis="file" />
      ) : null}
    </div>
  );
}

interface OutsideCoordinatesProps {
  orientation: Orientation;
  axis: 'rank' | 'file';
}

/** The gutter labels used by `coordinates="outside"`. */
function OutsideCoordinates({ orientation, axis }: OutsideCoordinatesProps) {
  const source = axis === 'rank' ? RANKS : FILES;
  // Ranks run bottom-to-top in the gutter, so they render reversed for white.
  const shouldReverse = axis === 'rank' ? orientation === 'white' : orientation === 'black';
  const labels = shouldReverse ? [...source].reverse() : [...source];

  return (
    <div className={`chessboard__gutter chessboard__gutter--${axis}`} aria-hidden="true">
      {labels.map((label) => (
        <span key={label} className="chessboard__label chessboard__label--outside">
          {label}
        </span>
      ))}
    </div>
  );
}

export type { ChessboardProps, CoordinateMode, Orientation };
