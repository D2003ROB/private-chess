import type { PieceArtProps } from '../../types';

/**
 * Meridian knight: profile facing the viewer's left, defined jaw and muzzle,
 * mane carried by three notches rather than modelled hair, ears as a single
 * notch. Drawn first in the set — everything else is matched to it.
 */
export function WhiteKnight(props: PieceArtProps) {
  return (
    <svg viewBox="0 0 45 45" {...props}>
      <g
        fill="var(--piece-white-fill, #FFFFFF)"
        stroke="var(--piece-white-stroke, #2A2A2A)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 15 34 C 14.2 30.6 14.2 27.8 16.4 24.6 L 13 24.8 L 11.3 23.8 L 11.5 20.6 L 15.2 19.6 L 17.6 18.6 L 19.6 16.2 L 20.4 13.6 L 20.2 9 L 22.6 12.6 L 25 9.4 L 26.6 13.6 L 29 16.6 L 30.2 19.6 L 28.6 20.6 L 30.6 22 L 29 23.2 L 31 24.8 L 29.6 26 L 31.4 28 L 31.6 34 Z" />
        <path d="M 13 34 L 32 34 C 33 34 33.5 35 33.5 36 L 33.5 38.5 C 33.5 39.3 32.8 40 32 40 L 13 40 C 12.2 40 11.5 39.3 11.5 38.5 L 11.5 36 C 11.5 35 12 34 13 34 Z" />
        <path
          d="M 19 18.8 a 0.95 0.95 0 1 0 0 1.9 a 0.95 0.95 0 1 0 0 -1.9 z"
          fill="var(--piece-white-stroke, #2A2A2A)"
        />
      </g>
    </svg>
  );
}
