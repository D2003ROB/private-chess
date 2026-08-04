import type { PieceColor, PlayedGame } from '@chess/shared';
import { moveKey } from '@chess/rules';
import { averageAccuracy, countsForAccuracy, moveAccuracy } from './accuracy';
import { classify, winPercentFor, winPercentLoss } from './classify';
import { CLASSIFICATIONS, type Classification, type GameReview, type MoveReport } from './types';
import type { PositionEval } from './types';
import { winPercent } from '../engine';

/** Every label at zero, ready to count into. */
function emptyCounts(): Record<Classification, number> {
  return Object.fromEntries(CLASSIFICATIONS.map((label) => [label, 0])) as Record<
    Classification,
    number
  >;
}

/**
 * Turns one pass of evaluations into a labelled game.
 *
 * Pure: hand it fixture evaluations and it is fully testable without an
 * engine, which is the only sane way to tune the thresholds.
 */
export function buildReview(
  game: PlayedGame,
  evals: readonly PositionEval[],
  depth: number,
): GameReview {
  const reports: MoveReport[] = [];

  for (const [ply, move] of game.moves.entries()) {
    const before = evals[ply];
    const after = evals[ply + 1];
    const position = game.positions[ply];
    const nextPosition = game.positions[ply + 1];

    // A cancelled review stops mid-game; the moves it reached are still valid.
    if (!before || !after || !position || !nextPosition) break;

    const input = {
      before,
      after,
      move,
      position,
      nextPosition,
      previousMove: ply > 0 ? (game.moves[ply - 1] ?? null) : null,
    };

    const classification = classify(input);
    const loss = winPercentLoss(input);
    const best = before.lines[0]?.moves[0] ?? null;

    reports.push({
      ply,
      move,
      color: position.turn,
      classification,
      winPctLoss: loss,
      accuracy: countsForAccuracy(classification) ? moveAccuracy(loss) : null,
      bestMove: best && best !== moveKey(move) ? best : null,
      winPctBefore: winPercent(before.score),
      winPctAfter: winPercent(after.score),
    });
  }

  const counts: Record<PieceColor, Record<Classification, number>> = {
    w: emptyCounts(),
    b: emptyCounts(),
  };

  for (const report of reports) counts[report.color][report.classification] += 1;

  return {
    moves: reports,
    accuracy: {
      w: averageAccuracy(reports.filter((report) => report.color === 'w')),
      b: averageAccuracy(reports.filter((report) => report.color === 'b')),
    },
    counts,
    evals: [...evals],
    depth,
  };
}

export { winPercentFor };
