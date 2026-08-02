import type { PieceArtProps } from '../../types';

/** Meridian rook, black. Course lines redrawn light so they survive the fill. */
export function BlackRook(props: PieceArtProps) {
  return (
    <svg viewBox="0 0 45 45" {...props}>
      <g
        fill="var(--piece-black-fill, #2A2A2A)"
        stroke="var(--piece-black-stroke, #1A1A1A)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 11.5 12 L 16.5 12 L 16.5 15.2 L 20 15.2 L 20 12 L 25 12 L 25 15.2 L 28.5 15.2 L 28.5 12 L 33.5 12 L 33.5 19 L 30.6 21.4 L 30.6 30.6 L 33.5 33 L 34.5 40 L 10.5 40 L 11.5 33 L 14.4 30.6 L 14.4 21.4 L 11.5 19 Z" />
        {/* Two seams, not four: at 24px a fuller set of course lines closes up
            into stripes and the rook stops reading as masonry. */}
        <g fill="none" stroke="var(--piece-white-fill, #FFFFFF)" strokeWidth={1.1}>
          <path d="M 12.2 19 L 32.8 19" />
          <path d="M 12.2 33 L 32.8 33" />
        </g>
      </g>
    </svg>
  );
}
