import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Square } from '@chess/shared';
import { GameBoard } from './GameBoard';
import { GameProvider } from '../../game';

function board(fen: string) {
  // The game lives in the provider now, so the starting position comes from
  // there rather than from a prop.
  return render(
    <GameProvider initialFen={fen}>
      <GameBoard theme="tournament-green" orientation="white" coordinates="inside" />
    </GameProvider>,
  );
}

function squareAt(square: Square) {
  const cell = document.querySelector(`[data-square="${square}"]`);
  if (!cell) throw new Error(`No square ${square} rendered`);
  return cell;
}

function pieceOn(square: Square) {
  const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-square]'));
  const index = cells.findIndex((cell) => cell.dataset.square === square);

  return Array.from(document.querySelectorAll<HTMLElement>('.chessboard__piece'))
    .find(
      (piece) =>
        piece.style.left === `${(index % 8) * 12.5}%` &&
        piece.style.top === `${Math.floor(index / 8) * 12.5}%`,
    )
    ?.querySelector('svg')
    ?.getAttribute('aria-label');
}

const chooser = () => screen.queryByRole('group', { name: /promotion/i });

describe('promotion', () => {
  const aboutToPromote = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';

  it('asks before promoting instead of picking a queen', async () => {
    const user = userEvent.setup();
    board(aboutToPromote);

    await user.click(squareAt('a7'));
    expect(chooser()).toBeNull();

    await user.click(squareAt('a8'));

    const group = chooser();
    expect(group).not.toBeNull();
    // Scoped to the chooser: the board also has its navigation buttons now.
    expect(within(group as HTMLElement).getAllByRole('button')).toHaveLength(4);
    // Nothing has moved yet.
    expect(pieceOn('a7')).toBe('White pawn');
  });

  it('promotes to the piece chosen, not always a queen', async () => {
    const user = userEvent.setup();
    board(aboutToPromote);

    await user.click(squareAt('a7'));
    await user.click(squareAt('a8'));
    await user.click(screen.getByRole('button', { name: /knight/i }));

    expect(pieceOn('a8')).toBe('White knight');
    expect(pieceOn('a7')).toBeUndefined();
    expect(chooser()).toBeNull();
  });

  it('abandons the promotion when the board is clicked instead', async () => {
    const user = userEvent.setup();
    board(aboutToPromote);

    await user.click(squareAt('a7'));
    await user.click(squareAt('a8'));
    await user.click(squareAt('e4'));

    expect(chooser()).toBeNull();
    expect(pieceOn('a7')).toBe('White pawn');
  });
});

describe('castling', () => {
  it('moves the rook with the king', async () => {
    const user = userEvent.setup();
    board('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');

    await user.click(squareAt('e1'));
    await user.click(squareAt('g1'));

    expect(pieceOn('g1')).toBe('White king');
    expect(pieceOn('f1')).toBe('White rook');
    expect(pieceOn('h1')).toBeUndefined();
  });
});

describe('terminal states', () => {
  it('names the draw reason rather than just stopping', () => {
    board('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(screen.getByRole('status')).toHaveTextContent('Draw — insufficient material');
  });

  it('reports stalemate separately from checkmate', () => {
    board('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(screen.getByRole('status')).toHaveTextContent('Stalemate');
  });

  it('reports a check while the game continues', () => {
    board('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1');
    expect(screen.getByRole('status')).toHaveTextContent('White to move — Check');
  });
});
