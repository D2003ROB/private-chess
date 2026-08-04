import { CLASSIFICATIONS, LABELS, type GameReview } from '../../review';
import { MoveBadge } from './MoveBadge';

/** Counts per label per side — the artefact people screenshot. */
export function SummaryTable({ review }: { review: GameReview }) {
  const used = CLASSIFICATIONS.filter(
    (label) => review.counts.w[label] > 0 || review.counts.b[label] > 0,
  );

  return (
    <table className="summary">
      <caption className="summary__caption">Moves by label</caption>
      <thead>
        <tr>
          <th scope="col">White</th>
          <th scope="col">Label</th>
          <th scope="col">Black</th>
        </tr>
      </thead>
      <tbody>
        {used.map((label) => (
          <tr key={label}>
            <td className="summary__count">{review.counts.w[label]}</td>
            <th scope="row" className="summary__label">
              <MoveBadge classification={label} />
            </th>
            <td className="summary__count">{review.counts.b[label]}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="summary__count">{review.moves.filter((m) => m.color === 'w').length}</td>
          <th scope="row">Moves</th>
          <td className="summary__count">{review.moves.filter((m) => m.color === 'b').length}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export { LABELS };
