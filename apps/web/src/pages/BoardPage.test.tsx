import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Square } from '@chess/shared';
import { legalMovesFrom, parseFen, STARTING_FEN } from '@chess/rules';
import { BoardPage } from './BoardPage';

function squareAt(square: Square) {
  const cell = document.querySelector(`[data-square="${square}"]`);
  if (!cell) throw new Error(`No square ${square} rendered`);
  return cell;
}

/** The squares currently marked as legal destinations. */
function markers(kind?: string) {
  const selector = kind ? `[data-marker="${kind}"]` : '[data-marker]';
  return Array.from(document.querySelectorAll(selector))
    .map((marker) => marker.getAttribute('data-square-marker') ?? '')
    .sort();
}

function pieceOn(square: Square) {
  const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-square]'));
  const index = cells.findIndex((cell) => cell.dataset.square === square);
  const left = `${(index % 8) * 12.5}%`;
  const top = `${Math.floor(index / 8) * 12.5}%`;

  return Array.from(document.querySelectorAll<HTMLElement>('.chessboard__piece'))
    .find((piece) => piece.style.left === left && piece.style.top === top)
    ?.querySelector('svg')
    ?.getAttribute('aria-label');
}

describe('BoardPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts from the initial position with nothing selected', () => {
    render(<BoardPage />);

    expect(markers()).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('White to move');
    expect(pieceOn('e1')).toBe('White king');
  });

  it('marks exactly the squares legalMovesFrom returns', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);
    const position = parseFen(STARTING_FEN);

    for (const square of ['b1', 'e2', 'a2'] as Square[]) {
      await user.click(squareAt(square));
      const expected = [...new Set(legalMovesFrom(position, square).map((move) => move.to))].sort();
      expect(markers('move')).toEqual(expected);
    }
  });

  it('rings a capture instead of dotting it', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    // 1. e4 d5, and now the pawn on e4 can take on d5.
    await user.click(squareAt('e2'));
    await user.click(squareAt('e4'));
    await user.click(squareAt('d7'));
    await user.click(squareAt('d5'));
    await user.click(squareAt('e4'));

    expect(markers('capture')).toEqual(['d5']);
    expect(markers('move')).toEqual(['e5']);
  });

  it('plays the move when a destination is clicked', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    await user.click(squareAt('e2'));
    await user.click(squareAt('e4'));

    expect(pieceOn('e4')).toBe('White pawn');
    expect(pieceOn('e2')).toBeUndefined();
    expect(screen.getByRole('status')).toHaveTextContent('Black to move');
    expect(markers()).toEqual([]);
  });

  it('will not move a piece on an illegal click', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    await user.click(squareAt('b1'));
    // d2 is occupied by a friendly pawn and is not a knight destination.
    await user.click(squareAt('d2'));

    expect(pieceOn('b1')).toBe('White knight');
    expect(screen.getByRole('status')).toHaveTextContent('White to move');
  });

  it('refuses to select the side that is not to move', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    await user.click(squareAt('e7'));

    expect(markers()).toEqual([]);
  });

  it('clears the selection when the same piece is clicked again', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    await user.click(squareAt('b1'));
    expect(markers('move')).not.toEqual([]);

    await user.click(squareAt('b1'));
    expect(markers()).toEqual([]);
  });

  it('reports check and checkmate in the status line', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    // Fool's mate: 1. f3 e5 2. g4 Qh4#
    const foolsMate: [Square, Square][] = [
      ['f2', 'f3'],
      ['e7', 'e5'],
      ['g2', 'g4'],
      ['d8', 'h4'],
    ];

    for (const [from, to] of foolsMate) {
      await user.click(squareAt(from));
      await user.click(squareAt(to));
    }

    expect(screen.getByRole('status')).toHaveTextContent('Checkmate — Black wins');
  });
});
