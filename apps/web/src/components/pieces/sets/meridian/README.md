# Meridian

Original artwork, drawn for this repository. It is not derived from, traced from, or copied out of
any existing piece set — not chess.com's (proprietary), not Lichess's cburnett (GPL), not Merida.
No third-party licence or attribution applies, and none is owed to us either: treat it as part of
this codebase.

The form language is **Staunton**, which is public domain and free to work from. Meridian's own
character is in the execution: flat, high-contrast and geometric, one even stroke weight
throughout, no gradients, no shadows, no faux-3D shading.

## Rules the set follows

- `viewBox="0 0 45 45"` on every piece, baseline (bottom of every base) at `y = 40`.
- Path data only. No `<image>`, `<text>`, filters, or `<defs>` gradients.
- `stroke-width: 1.5`, round joins and caps, uniform across all twelve. No piece gets a heavier
  outline to rescue its legibility.
- Colour comes only from custom properties, never a literal:
  `--piece-white-fill` (`#FFFFFF`), `--piece-white-stroke` (`#2A2A2A`),
  `--piece-black-fill` (`#2A2A2A`), `--piece-black-stroke` (`#1A1A1A`).
- Black pieces are not white pieces with the fills swapped. Interior seams that read as dark lines
  on a white piece are redrawn as light strokes (`--piece-white-fill`) on the black piece, because
  a dark seam on a dark fill is nothing at all.

## Height ladder

Measured from the `y = 40` baseline, and verified in the browser rather than asserted:

| Piece  | Height | Base width |
| ------ | ------ | ---------- |
| Pawn   | 24     | 18         |
| Rook   | 28     | 24         |
| Knight | 31     | 22         |
| Bishop | 33     | 22         |
| Queen  | 36     | 26         |
| King   | 38     | 26         |

## Notes for the next person

- **The knight decides the set.** Draw it first; matching the others to it is easy, the reverse is
  not.
- **Interior detail costs more than it looks.** The knight's muzzle is ~3.7 units thick; a 1.5-unit
  mouth stroke inside it, plus 0.75 of outline on each side, filled it solid with ink and turned
  the head into a beak. Detail lines need room, or they need to not exist.
- **Count the seams.** Four light course lines on the black rook read as stripes at 24px; two read
  as masonry.
- If a piece needs a heavier stroke to survive at 24px, the shape is wrong, not the stroke.
