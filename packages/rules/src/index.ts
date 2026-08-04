/**
 * The chess rules engine: every legal move in any position, and whether the
 * game is over.
 *
 * The supported surface is `legalMoves`, `legalMovesFrom`, `applyMove`,
 * `gameStatus`, `isInCheck`, `isSquareAttacked`, and the FEN pair. The rest is
 * exported for tests and for the debugging tools; treat a change to it as free.
 */
export { parseFen, toFen, positionKey, STARTING_FEN, InvalidFenError } from './fen.js';
export { legalMoves, legalMovesFrom, pseudoLegalMoves } from './moves.js';
export { applyMove } from './apply.js';
export { isSquareAttacked, isInCheck } from './attacks.js';
export { gameStatus, type GameStatus } from './status.js';
export { perft, divide, moveKey } from './perft.js';
export {
  ALL_SQUARES,
  InvalidSquareError,
  findKing,
  isSquare,
  opponent,
  squareColor,
  toCoords,
  toSquare,
  type Coords,
} from './board.js';
