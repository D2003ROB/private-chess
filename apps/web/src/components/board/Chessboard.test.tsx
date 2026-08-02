import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chessboard } from './Chessboard';
import { BOARD_THEMES } from './themes';

const HEX = /^#[0-9A-Fa-f]{6}$/;

function squares(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-square]'));
}

describe('Chessboard', () => {
  it('renders exactly 64 squares', () => {
    const { container } = render(<Chessboard />);
    expect(squares(container)).toHaveLength(64);
  });

  it('puts a1 bottom-left with white at the bottom', () => {
    const { container } = render(<Chessboard orientation="white" />);
    // Cells render row-major from the top-left, so the last one is bottom-left.
    expect(squares(container)[56]?.dataset.square).toBe('a1');
  });

  it('puts h8 bottom-left with black at the bottom', () => {
    const { container } = render(<Chessboard orientation="black" />);
    expect(squares(container)[56]?.dataset.square).toBe('h8');
  });

  it('keeps every square name when orientation flips', () => {
    const { container: white } = render(<Chessboard orientation="white" />);
    const { container: black } = render(<Chessboard orientation="black" />);

    const names = (root: HTMLElement) =>
      squares(root)
        .map((el) => el.dataset.square)
        .sort();
    expect(names(white)).toEqual(names(black));
  });

  it('colours a1 dark and h1 light', () => {
    const { container } = render(<Chessboard />);
    expect(container.querySelector('[data-square="a1"]')?.getAttribute('data-color')).toBe('dark');
    expect(container.querySelector('[data-square="h1"]')?.getAttribute('data-color')).toBe('light');
  });

  it('alternates colours across the whole board', () => {
    const { container } = render(<Chessboard />);
    const dark = squares(container).filter((el) => el.dataset.color === 'dark');
    expect(dark).toHaveLength(32);
  });

  it('renders no labels when coordinates are off', () => {
    const { container } = render(<Chessboard coordinates="none" />);
    expect(container.querySelectorAll('.chessboard__label')).toHaveLength(0);
  });

  it('renders 16 labels in inside mode', () => {
    const { container } = render(<Chessboard coordinates="inside" />);
    expect(container.querySelectorAll('.chessboard__label')).toHaveLength(16);
  });

  it('renders 16 gutter labels in outside mode', () => {
    const { container } = render(<Chessboard coordinates="outside" />);
    expect(container.querySelectorAll('.chessboard__label--outside')).toHaveLength(16);
  });

  it('describes its orientation for assistive technology', () => {
    render(<Chessboard orientation="black" />);
    expect(screen.getByRole('img', { name: 'Chessboard, black at bottom' })).toBeInTheDocument();
  });

  it('renders overlay children above the squares', () => {
    const { container } = render(
      <Chessboard>
        <span data-testid="overlay-child" />
      </Chessboard>,
    );
    expect(container.querySelector('.chessboard__overlay')?.firstChild).toBe(
      screen.getByTestId('overlay-child'),
    );
  });

  it('matches the default board snapshot', () => {
    const { container } = render(<Chessboard />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('board themes', () => {
  it('registers all ten themes in order', () => {
    expect(BOARD_THEMES.map((theme) => theme.id)).toEqual([
      'tournament-green',
      'boxwood',
      'walnut',
      'slate',
      'glacier',
      'amethyst',
      'terracotta',
      'marble',
      'midnight',
      'neon',
    ]);
  });

  it.each(BOARD_THEMES)('$id has every field populated and valid', (theme) => {
    expect(theme.name.length).toBeGreaterThan(0);
    expect(theme.light).toMatch(HEX);
    expect(theme.dark).toMatch(HEX);
    expect(theme.lightCoord).toMatch(HEX);
    expect(theme.darkCoord).toMatch(HEX);
    expect(theme.border).toMatch(HEX);
    expect(['light', 'dark']).toContain(theme.scheme);
  });

  it('applies the active theme as custom properties on the root', () => {
    const { container } = render(<Chessboard theme="neon" />);
    const root = container.querySelector<HTMLElement>('.chessboard');
    expect(root?.style.getPropertyValue('--board-light')).toBe('#232946');
    expect(root?.style.getPropertyValue('--board-dark-coord')).toBe('#7DF9E1');
  });
});
