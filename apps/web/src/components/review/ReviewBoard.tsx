import type { Board, Square } from '@chess/shared';
import { isSquare } from '@chess/rules';
import { Chessboard, type BoardThemeId, type Orientation } from '../board';
import { squareToCell } from '../game/cells';
import { MoveBadge } from './MoveBadge';
import type { GameReview } from '../../review';

/**
 * The board as the review shows it: the position after the selected move, the
 * move played and the engine's preference drawn as arrows, and the label on
 * the destination square.
 */

interface ReviewBoardProps {
  review: GameReview;
  /** Index into `evals`: `0` is the start, `n` the position after move `n - 1`. */
  index: number;
  board: Board;
  theme: BoardThemeId;
  orientation: Orientation;
}

function centreOf(square: Square, orientation: Orientation) {
  const { row, column } = squareToCell(square, orientation);
  return { x: column + 0.5, y: row + 0.5 };
}

function parseUci(key: string): { from: Square; to: Square } | null {
  const from = key.slice(0, 2);
  const to = key.slice(2, 4);
  return isSquare(from) && isSquare(to) ? { from, to } : null;
}

export function ReviewBoard({ review, index, board, theme, orientation }: ReviewBoardProps) {
  const report = index > 0 ? review.moves[index - 1] : undefined;
  const best = report?.bestMove ? parseUci(report.bestMove) : null;

  return (
    <Chessboard theme={theme} orientation={orientation} coordinates="inside" pieces={board}>
      {report ? (
        <svg
          className="review-board__arrows"
          viewBox="0 0 8 8"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="played-head"
              markerWidth="3"
              markerHeight="3"
              refX="2"
              refY="1.5"
              orient="auto"
            >
              <path d="M 0 0 L 3 1.5 L 0 3 z" className="review-board__played" />
            </marker>
            <marker
              id="best-head"
              markerWidth="3"
              markerHeight="3"
              refX="2"
              refY="1.5"
              orient="auto"
            >
              <path d="M 0 0 L 3 1.5 L 0 3 z" className="review-board__best" />
            </marker>
          </defs>

          {/* Solid for what was played, dashed for what the engine wanted:
              distinguishable without relying on the colours. */}
          <Arrow
            from={report.move.from}
            to={report.move.to}
            orientation={orientation}
            kind="played"
          />
          {best ? (
            <Arrow from={best.from} to={best.to} orientation={orientation} kind="best" />
          ) : null}
        </svg>
      ) : null}

      {report ? (
        <BadgeOnSquare
          square={report.move.to}
          orientation={orientation}
          classification={review.moves[index - 1]?.classification ?? 'good'}
        />
      ) : null}
    </Chessboard>
  );
}

function Arrow({
  from,
  to,
  orientation,
  kind,
}: {
  from: Square;
  to: Square;
  orientation: Orientation;
  kind: 'played' | 'best';
}) {
  const start = centreOf(from, orientation);
  const end = centreOf(to, orientation);

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      className={`review-board__arrow review-board__arrow--${kind}`}
      markerEnd={`url(#${kind}-head)`}
      data-arrow={kind}
    />
  );
}

function BadgeOnSquare({
  square,
  orientation,
  classification,
}: {
  square: Square;
  orientation: Orientation;
  classification: GameReview['moves'][number]['classification'];
}) {
  const { row, column } = squareToCell(square, orientation);

  return (
    <span
      className="review-board__badge"
      style={{ left: `${column * 12.5}%`, top: `${row * 12.5}%` }}
    >
      <MoveBadge classification={classification} size="square" />
    </span>
  );
}
