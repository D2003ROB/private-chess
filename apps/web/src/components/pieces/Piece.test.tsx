import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { STARTING_LAYOUT, type PieceColor, type PieceType } from '@chess/shared';
import { Chessboard } from '../board';
import { Piece } from './Piece';
import { meridian } from './sets/meridian';

const TYPES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];
const COLORS: PieceColor[] = ['w', 'b'];
const PAIRS = COLORS.flatMap((color) => TYPES.map((type) => ({ color, type })));

describe('meridian set', () => {
  it('exports exactly 12 components, one per (type, colour) pair', () => {
    const keys = Object.keys(meridian.components);
    expect(keys).toHaveLength(12);
    expect(new Set(keys)).toEqual(new Set(PAIRS.map(({ color, type }) => `${color}${type}`)));
  });

  it.each(PAIRS)('$color$type renders an svg on the shared viewBox', ({ color, type }) => {
    const { container } = render(<Piece type={type} color={color} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 45 45');
  });

  it.each(PAIRS)('$color$type uses path data only', ({ color, type }) => {
    const { container } = render(<Piece type={type} color={color} />);
    expect(container.querySelectorAll('image, text, [filter], defs')).toHaveLength(0);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it.each(PAIRS)('$color$type hardcodes no colours outside the fallbacks', ({ color, type }) => {
    const { container } = render(<Piece type={type} color={color} />);
    // Every paint must come from a custom property (a bare hex would not be
    // recolourable by --piece-*).
    for (const el of container.querySelectorAll('[fill], [stroke]')) {
      for (const attr of ['fill', 'stroke']) {
        const value = el.getAttribute(attr);
        if (value && value !== 'none') {
          expect(value).toMatch(/^var\(--piece-/);
        }
      }
    }
  });

  it.each(PAIRS)('$color$type is labelled for assistive technology', ({ color, type }) => {
    render(<Piece type={type} color={color} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label');
  });

  it.each(PAIRS)('$color$type matches its snapshot', ({ color, type }) => {
    const { container } = render(<Piece type={type} color={color} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('STARTING_LAYOUT', () => {
  const entries = Object.entries(STARTING_LAYOUT);

  it('has 32 entries, 16 per colour', () => {
    expect(entries).toHaveLength(32);
    expect(entries.filter(([, piece]) => piece?.color === 'w')).toHaveLength(16);
    expect(entries.filter(([, piece]) => piece?.color === 'b')).toHaveLength(16);
  });

  it('puts the kings on e1 and e8', () => {
    expect(STARTING_LAYOUT.e1).toEqual({ type: 'k', color: 'w' });
    expect(STARTING_LAYOUT.e8).toEqual({ type: 'k', color: 'b' });
  });

  it('has eight pawns per side on the second and seventh ranks', () => {
    const pawns = entries.filter(([, piece]) => piece?.type === 'p');
    expect(pawns).toHaveLength(16);
    expect(pawns.every(([square]) => square[1] === '2' || square[1] === '7')).toBe(true);
  });
});

describe('board integration', () => {
  it('renders 32 pieces for the starting layout', () => {
    const { container } = render(<Chessboard pieces={STARTING_LAYOUT} />);
    expect(container.querySelectorAll('.chessboard__piece')).toHaveLength(32);
  });

  it('renders no pieces when none are given', () => {
    const { container } = render(<Chessboard />);
    expect(container.querySelectorAll('.chessboard__piece')).toHaveLength(0);
  });

  it('keeps pieces on their squares when orientation flips', () => {
    const pieceSquare = (root: HTMLElement) => {
      const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-square]'));
      const index = cells.findIndex((cell) => cell.dataset.square === 'e1');
      return { row: Math.floor(index / 8), column: index % 8 };
    };

    const { container: white } = render(<Chessboard pieces={STARTING_LAYOUT} />);
    const { container: black } = render(
      <Chessboard pieces={STARTING_LAYOUT} orientation="black" />,
    );

    // e1 sits in a different cell after the flip, and the white king follows it.
    const whiteCell = pieceSquare(white);
    const blackCell = pieceSquare(black);
    expect(whiteCell).not.toEqual(blackCell);

    const kingAt = (root: HTMLElement, cell: { row: number; column: number }) => {
      const piece = root.querySelectorAll<HTMLElement>('.chessboard__piece');
      return Array.from(piece).find(
        (el) =>
          el.style.left === `${cell.column * 12.5}%` && el.style.top === `${cell.row * 12.5}%`,
      );
    };

    expect(kingAt(white, whiteCell)?.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'White king',
    );
    expect(kingAt(black, blackCell)?.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'White king',
    );
  });
});
