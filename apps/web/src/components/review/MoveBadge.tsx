import { LABELS, type Classification } from '../../review';

/**
 * The label badge. Colour carries the mood, the glyph carries the meaning —
 * so it still reads in greyscale, and on a board square.
 */
export function MoveBadge({
  classification,
  size = 'inline',
}: {
  classification: Classification;
  size?: 'inline' | 'square';
}) {
  const label = LABELS[classification];

  return (
    <span
      className={`badge badge--${size}`}
      data-label={classification}
      data-ink={label.ink}
      style={{ background: label.color }}
      title={`${label.name} — ${label.description}`}
    >
      <span className="badge__glyph" aria-hidden="true">
        {label.glyph}
      </span>
      <span className="badge__name">{label.name}</span>
    </span>
  );
}
