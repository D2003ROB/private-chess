/**
 * Chess movement geometry: quiet moves for the six piece types.
 *
 * `movesFor` is the only supported entry point. Everything else is exported
 * for tests and for the pieces it is built from, not as API — treat a change
 * to it as free, and a change to `movesFor` as breaking.
 */
export { movesFor } from './moves.js';
export { InvalidSquareError, toCoords, toSquare, type Coords } from './board.js';
