import { winPercent } from '../../engine';
import type { GameReview } from '../../review';

/**
 * Win percentage across the game: White above the midline, Black below.
 *
 * Hand-rolled SVG rather than a charting library — one area path and a few
 * markers do not justify a dependency, and the repository deliberately has
 * none of that kind.
 */
const HEIGHT = 72;

export function EvalGraph({
  review,
  selected,
  onSelect,
}: {
  review: GameReview;
  selected: number;
  onSelect: (ply: number) => void;
}) {
  const points = review.evals.map((evaluation) => winPercent(evaluation.score));
  if (points.length < 2) return null;

  const width = Math.max(points.length - 1, 1);
  const y = (percent: number) => HEIGHT - (percent / 100) * HEIGHT;
  const area = [
    `M 0 ${HEIGHT}`,
    ...points.map((percent, index) => `L ${index} ${y(percent)}`),
    `L ${width} ${HEIGHT}`,
    'Z',
  ].join(' ');

  return (
    <svg
      className="eval-graph"
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Win percentage across the game, White above the midline"
    >
      <rect x="0" y="0" width={width} height={HEIGHT} className="eval-graph__black" />
      <path d={area} className="eval-graph__white" />
      <line x1="0" y1={HEIGHT / 2} x2={width} y2={HEIGHT / 2} className="eval-graph__midline" />

      {review.moves.map((report) =>
        report.classification === 'blunder' ||
        report.classification === 'miss' ||
        report.classification === 'brilliant' ? (
          <circle
            key={report.ply}
            cx={report.ply + 1}
            cy={y(report.winPctAfter)}
            r={1.6}
            className={`eval-graph__mark eval-graph__mark--${report.classification}`}
          />
        ) : null,
      )}

      <line
        x1={selected}
        y1="0"
        x2={selected}
        y2={HEIGHT}
        className="eval-graph__cursor"
        data-testid="eval-cursor"
      />

      {/* One hit target per position, so clicking the curve navigates. */}
      {points.map((_, index) => (
        <rect
          key={index}
          x={index - 0.5}
          y={0}
          width={1}
          height={HEIGHT}
          className="eval-graph__hit"
          onClick={() => {
            onSelect(index);
          }}
        >
          <title>{`Position ${index}`}</title>
        </rect>
      ))}
    </svg>
  );
}
