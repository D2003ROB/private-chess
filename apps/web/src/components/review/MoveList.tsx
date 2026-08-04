import { formatPv } from '../../engine';
import type { GameReview } from '../../review';
import { MoveBadge } from './MoveBadge';

/**
 * Every move with its label. Clicking one jumps the board to that position.
 *
 * Long algebraic, routed through `formatPv` — the same seam the engine panel
 * uses, so swapping in SAN when that ticket lands is one change.
 */
export function MoveList({
  review,
  selected,
  onSelect,
}: {
  review: GameReview;
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="move-list">
      {review.moves.map((report) => {
        const index = report.ply + 1;

        return (
          <li key={report.ply}>
            <button
              type="button"
              className="move-list__row"
              aria-current={selected === index ? 'true' : undefined}
              onClick={() => {
                onSelect(index);
              }}
            >
              <span className="move-list__number">
                {Math.floor(report.ply / 2) + 1}
                {report.color === 'w' ? '.' : '…'}
              </span>
              <span className="move-list__move">
                {formatPv([`${report.move.from}${report.move.to}${report.move.promotion ?? ''}`])}
              </span>
              <MoveBadge classification={report.classification} />
              {report.bestMove ? (
                <span className="move-list__best">best {formatPv([report.bestMove])}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
