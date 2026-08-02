import type { PieceArtProps } from '../../types';

/**
 * Meridian king: cross finial over a crown band. The cross is the unambiguous
 * king signal and is drawn tall enough that king and queen never trade places
 * in silhouette.
 */
export function WhiteKing(props: PieceArtProps) {
  return (
    <svg viewBox="0 0 45 45" {...props}>
      <g
        fill="var(--piece-white-fill, #FFFFFF)"
        stroke="var(--piece-white-stroke, #2A2A2A)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 21.3 2 L 23.7 2 L 23.7 4.6 L 26.3 4.6 L 26.3 7 L 23.7 7 L 23.7 10.4 L 21.3 10.4 L 21.3 7 L 18.7 7 L 18.7 4.6 L 21.3 4.6 Z" />
        <path d="M 22.5 10.4 C 26.2 11.4 28.8 13.6 29.4 16.4 L 15.6 16.4 C 16.2 13.6 18.8 11.4 22.5 10.4 Z" />
        <path d="M 14.4 16.4 L 30.6 16.4 L 29.6 19.8 L 15.4 19.8 Z" />
        <path d="M 16.6 19.8 C 16.6 25 11.6 28.8 10.6 33 L 34.4 33 C 33.4 28.8 28.4 25 28.4 19.8 Z" />
        <path d="M 11 33 L 34 33 C 35 33 35.5 34 35.5 35 L 35.5 38.5 C 35.5 39.3 34.8 40 34 40 L 11 40 C 10.2 40 9.5 39.3 9.5 38.5 L 9.5 35 C 9.5 34 10 33 11 33 Z" />
      </g>
    </svg>
  );
}
