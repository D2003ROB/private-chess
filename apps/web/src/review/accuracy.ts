import type { Classification, MoveReport } from './types';

/**
 * Per-move accuracy from win-percentage loss.
 *
 * The constants are Lichess's, taken from `AccuracyPercent.scala` rather than
 * from memory:
 *
 *   raw = 103.1668100711649 * exp(-0.04354415386753951 * winDiff)
 *         - 3.166924740191411 + 1,  clamped to [0, 100]
 *
 * The `+ 1` matters and is easy to drop: without it a flawless move scores
 * 99.99991 rather than 100.
 */
const SCALE = 103.1668100711649;
const DECAY = -0.04354415386753951;
const OFFSET = -3.166924740191411;

export function moveAccuracy(winPctLoss: number): number {
  const loss = Math.max(0, winPctLoss);
  const raw = SCALE * Math.exp(DECAY * loss) + OFFSET + 1;

  return Math.min(100, Math.max(0, raw));
}

/** Book and forced moves say nothing about the player, so they do not count. */
const EXCLUDED: readonly Classification[] = ['book', 'forced'];

export function countsForAccuracy(classification: Classification): boolean {
  return !EXCLUDED.includes(classification);
}

/**
 * A plain mean of the counted moves, to one decimal.
 *
 * Lichess weights each move by the volatility of the position around it, which
 * stops one blunder in a dead-drawn game from dominating the score. That is a
 * reasonable follow-up and deliberately not done here.
 */
export function averageAccuracy(reports: readonly MoveReport[]): number {
  const scored = reports
    .map((report) => report.accuracy)
    .filter((value): value is number => value !== null);

  if (scored.length === 0) return 100;

  const mean = scored.reduce((total, value) => total + value, 0) / scored.length;
  return Math.round(mean * 10) / 10;
}
