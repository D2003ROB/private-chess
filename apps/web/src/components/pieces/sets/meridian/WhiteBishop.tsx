import type { PieceArtProps } from '../../types';

/**
 * Meridian bishop: mitre with a ball finial and the diagonal slit. The slit is
 * cut wide on purpose — narrow it and it closes up at 24px.
 */
export function WhiteBishop(props: PieceArtProps) {
  return (
    <svg viewBox="0 0 45 45" {...props}>
      <g
        fill="var(--piece-white-fill, #FFFFFF)"
        stroke="var(--piece-white-stroke, #2A2A2A)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 22.5 7 a 1.7 1.7 0 1 0 0 3.4 a 1.7 1.7 0 1 0 0 -3.4 z" />
        <path d="M 22.5 10.4 C 26.6 12.6 28.9 17.4 28.6 22 L 16.4 22 C 16.1 17.4 18.4 12.6 22.5 10.4 Z" />
        <path d="M 15.6 22 L 29.4 22 L 28.7 24.6 L 16.3 24.6 Z" />
        <path d="M 18 24.6 C 18 28 15.8 30 14.6 33 L 30.4 33 C 29.2 30 27 28 27 24.6 Z" />
        <path d="M 13 33 L 32 33 C 33 33 33.5 34 33.5 35 L 33.5 38.5 C 33.5 39.3 32.8 40 32 40 L 13 40 C 12.2 40 11.5 39.3 11.5 38.5 L 11.5 35 C 11.5 34 12 33 13 33 Z" />
        <path d="M 20 13.8 L 25 18.8" fill="none" />
      </g>
    </svg>
  );
}
