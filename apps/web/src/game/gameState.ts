import type { Move, PlayedGame, Position } from '@chess/shared';
import { applyMove, parseFen, STARTING_FEN } from '@chess/rules';

/**
 * The game as a value: a start position, the moves, and every position they
 * produced. Pure — the React state that holds it lives in `GameContext`.
 *
 * The board used to keep a single `Position` and throw away everything before
 * it. Review needs the whole game, so the history is the state now and the
 * current position is an index into it.
 */

export interface GameCursor {
  game: PlayedGame;
  /** Which position is on the board. `0` is the start, `moves.length` the end. */
  index: number;
}

export function createGame(initialFen: string = STARTING_FEN): PlayedGame {
  return { initialFen, moves: [], positions: [parseFen(initialFen)] };
}

export function positionAt(game: PlayedGame, index: number): Position {
  const position = game.positions[clampIndex(game, index)];
  if (!position) throw new Error('A game always has at least its starting position');
  return position;
}

export function clampIndex(game: PlayedGame, index: number): number {
  return Math.max(0, Math.min(game.moves.length, index));
}

/**
 * Plays a move from the position at `index`.
 *
 * Moving from anywhere but the end discards what followed — the same as
 * playing a different move in an analysis board. There is no variation tree
 * here and building one is not this ticket.
 */
export function playMove({ game, index }: GameCursor, move: Move): GameCursor {
  const at = clampIndex(game, index);
  const from = positionAt(game, at);

  const moves = [...game.moves.slice(0, at), move];
  const positions = [...game.positions.slice(0, at + 1), applyMove(from, move)];

  return { game: { ...game, moves, positions }, index: at + 1 };
}

export function isAtEnd({ game, index }: GameCursor): boolean {
  return index >= game.moves.length;
}
