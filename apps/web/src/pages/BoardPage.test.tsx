import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { STARTING_LAYOUT, type Square } from '@chess/shared';
import { movesFor } from '@chess/rules';
import { BoardPage } from './BoardPage';

function squareAt(square: Square) {
  const cell = document.querySelector(`[data-square="${square}"]`);
  if (!cell) throw new Error(`No square ${square} rendered`);
  return cell;
}

function dots() {
  return Array.from(document.querySelectorAll('[data-target]')).map(
    (dot) => dot.getAttribute('data-target') ?? '',
  );
}

describe('BoardPage move inspector', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows no dots until something is clicked', () => {
    render(<BoardPage />);
    expect(dots()).toEqual([]);
  });

  it('dots exactly the squares movesFor returns', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    for (const square of ['b1', 'g1', 'e2', 'a2'] as Square[]) {
      await user.click(squareAt(square));
      expect(dots().sort()).toEqual(movesFor(STARTING_LAYOUT, square));
    }
  });

  it('shows nothing for a fully blocked piece', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    await user.click(squareAt('e1'));
    expect(dots()).toEqual([]);
  });

  it('clears when the same piece is clicked again', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    await user.click(squareAt('b1'));
    expect(dots()).not.toEqual([]);

    await user.click(squareAt('b1'));
    expect(dots()).toEqual([]);
  });

  it('clears when an empty square is clicked', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    await user.click(squareAt('b1'));
    await user.click(squareAt('e4'));
    expect(dots()).toEqual([]);
  });

  it('leaves the pieces where they are', async () => {
    const user = userEvent.setup();
    render(<BoardPage />);

    const before = document.querySelectorAll('.chessboard__piece').length;
    await user.click(squareAt('b1'));
    await user.click(squareAt('a3'));

    expect(document.querySelectorAll('.chessboard__piece')).toHaveLength(before);
    expect(screen.getByRole('img', { name: /Chessboard/ })).toBeInTheDocument();
  });
});
