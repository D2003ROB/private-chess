import type { PieceArtProps } from '../../types';

/** Meridian queen: five-point coronet, ball-tipped, on a banded collar. */
export function WhiteQueen(props: PieceArtProps) {
  return (
    <svg viewBox="0 0 45 45" {...props}>
      <g
        fill="var(--piece-white-fill, #FFFFFF)"
        stroke="var(--piece-white-stroke, #2A2A2A)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 12.6 8.2 C 12.6 7.3 13.3 6.6 14.2 6.6 C 15.1 6.6 15.8 7.3 15.8 8.2 C 15.8 9.1 15.1 9.8 14.2 9.8 C 13.3 9.8 12.6 9.1 12.6 8.2 Z" />
        <path d="M 16.7 6.6 C 16.7 5.7 17.4 5 18.3 5 C 19.2 5 19.9 5.7 19.9 6.6 C 19.9 7.5 19.2 8.2 18.3 8.2 C 17.4 8.2 16.7 7.5 16.7 6.6 Z" />
        <path d="M 20.9 5.6 C 20.9 4.7 21.6 4 22.5 4 C 23.4 4 24.1 4.7 24.1 5.6 C 24.1 6.5 23.4 7.2 22.5 7.2 C 21.6 7.2 20.9 6.5 20.9 5.6 Z" />
        <path d="M 25.1 6.6 C 25.1 5.7 25.8 5 26.7 5 C 27.6 5 28.3 5.7 28.3 6.6 C 28.3 7.5 27.6 8.2 26.7 8.2 C 25.8 8.2 25.1 7.5 25.1 6.6 Z" />
        <path d="M 29.2 8.2 C 29.2 7.3 29.9 6.6 30.8 6.6 C 31.7 6.6 32.4 7.3 32.4 8.2 C 32.4 9.1 31.7 9.8 30.8 9.8 C 29.9 9.8 29.2 9.1 29.2 8.2 Z" />
        <path d="M 14.2 9.8 L 16.4 18.4 L 18.3 8.2 L 20.6 18.4 L 22.5 7.2 L 24.4 18.4 L 26.7 8.2 L 28.6 18.4 L 30.8 9.8 L 33.5 18.4 L 11.5 18.4 Z" />
        <path d="M 11.5 18.4 L 33.5 18.4 L 32.4 21.6 L 12.6 21.6 Z" />
        <path d="M 14 21.6 C 14 26 11.6 29.2 10.6 33 L 34.4 33 C 33.4 29.2 31 26 31 21.6 Z" />
        <path d="M 11 33 L 34 33 C 35 33 35.5 34 35.5 35 L 35.5 38.5 C 35.5 39.3 34.8 40 34 40 L 11 40 C 10.2 40 9.5 39.3 9.5 38.5 L 9.5 35 C 9.5 34 10 33 11 33 Z" />
      </g>
    </svg>
  );
}
