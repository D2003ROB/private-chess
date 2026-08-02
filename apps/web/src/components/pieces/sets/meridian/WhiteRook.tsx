import type { PieceArtProps } from '../../types';

/**
 * Meridian rook: three merlons, not four or five — three still read as
 * crenellations at 24px where five collapse into a smear.
 */
export function WhiteRook(props: PieceArtProps) {
  return (
    <svg viewBox="0 0 45 45" {...props}>
      <g
        fill="var(--piece-white-fill, #FFFFFF)"
        stroke="var(--piece-white-stroke, #2A2A2A)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 11.5 12 L 16.5 12 L 16.5 15.2 L 20 15.2 L 20 12 L 25 12 L 25 15.2 L 28.5 15.2 L 28.5 12 L 33.5 12 L 33.5 19 L 30.6 21.4 L 30.6 30.6 L 33.5 33 L 34.5 40 L 10.5 40 L 11.5 33 L 14.4 30.6 L 14.4 21.4 L 11.5 19 Z" />
        <g fill="none">
          <path d="M 11.5 19 L 33.5 19" />
          <path d="M 14.4 21.4 L 30.6 21.4" />
          <path d="M 14.4 30.6 L 30.6 30.6" />
          <path d="M 11.5 33 L 33.5 33" />
        </g>
      </g>
    </svg>
  );
}
