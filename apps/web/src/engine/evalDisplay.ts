import type { Score } from './types';

/** Typographic minus, so `−1.20` aligns with `+1.20` rather than sitting short. */
const MINUS = '−';

/** Beyond this the bar stops moving: +10 and +24 are both simply winning. */
const CLAMP_CP = 1000;

/** Lichess's constant. Fitted to real games, and it feels right on a bar. */
const SIGMOID_K = 0.00368208;

/**
 * White's winning chances, 0-100.
 *
 * Filling the bar by raw centipawns is useless: linear scaling spends most of
 * its range on differences nobody can act on, while the interesting region
 * either side of level barely moves. A sigmoid puts the resolution where the
 * game is actually decided.
 */
export function winPercent(score: Score): number {
  if (score.kind === 'mate') return score.value > 0 ? 100 : 0;

  const cp = Math.max(-CLAMP_CP, Math.min(CLAMP_CP, score.value));
  return 50 + 50 * (2 / (1 + Math.exp(-SIGMOID_K * cp)) - 1);
}

/**
 * `+0.34`, `−1.20`, `0.00`, `M5`, `−M3`. Always White-relative, whoever is to
 * move and whichever way the board is facing.
 */
export function formatScore(score: Score): string {
  if (score.kind === 'mate') {
    return score.value < 0 ? `${MINUS}M${Math.abs(score.value)}` : `M${score.value}`;
  }

  const pawns = score.value / 100;
  if (pawns === 0) return '0.00';

  return `${pawns > 0 ? '+' : MINUS}${Math.abs(pawns).toFixed(2)}`;
}

/**
 * The single place a principal variation becomes text. Long algebraic for now;
 * swapping in SAN when the notation ticket lands is a change to this function
 * and nothing else.
 */
export function formatPv(moves: string[], limit = 6): string {
  return moves.slice(0, limit).join(' ');
}
