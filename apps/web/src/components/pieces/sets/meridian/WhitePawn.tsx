import type { PieceArtProps } from '../../types';

/** Meridian pawn: sphere head, tight collar, flared body, round base. */
export function WhitePawn(props: PieceArtProps) {
  return (
    <svg viewBox="0 0 45 45" {...props}>
      <g
        fill="var(--piece-white-fill, #FFFFFF)"
        stroke="var(--piece-white-stroke, #2A2A2A)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 22.5 16 a 3.5 3.5 0 1 0 0 7 a 3.5 3.5 0 1 0 0 -7 z" />
        <path d="M 18.8 23.2 L 26.2 23.2 L 25.4 25.6 L 19.6 25.6 Z" />
        <path d="M 19.8 25.6 C 19.8 28.8 17.4 30.8 16.4 34 L 28.6 34 C 27.6 30.8 25.2 28.8 25.2 25.6 Z" />
        <path d="M 15 34 L 30 34 C 31 34 31.5 35 31.5 36 L 31.5 38.5 C 31.5 39.3 30.8 40 30 40 L 15 40 C 14.2 40 13.5 39.3 13.5 38.5 L 13.5 36 C 13.5 35 14 34 15 34 Z" />
      </g>
    </svg>
  );
}
