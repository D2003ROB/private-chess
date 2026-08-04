import type { Move, Position } from '@chess/shared';
import { applyMove } from './apply.js';
import { legalMoves } from './moves.js';

/**
 * Leaf-node counts of the legal move tree. Unit tests do not find the bugs in
 * a rules engine; perft does. A single miscounted en-passant pin, three plies
 * down, shows up here as a wrong number and nowhere else.
 */
export function perft(position: Position, depth: number): number {
  if (depth <= 0) return 1;

  const moves = legalMoves(position);
  if (depth === 1) return moves.length;

  return moves.reduce((nodes, move) => nodes + perft(applyMove(position, move), depth - 1), 0);
}

/** Long algebraic key for a move: `e2e4`, `a7a8q`. Not SAN, and not meant to be. */
export function moveKey(move: Move): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

/**
 * Per-root-move leaf counts, sorted by move.
 *
 * This is the debugging tool for a wrong perft number, and it beats reading
 * the code: compare against a known-good source, find the one root move whose
 * subtree diverges, recurse into it. Six binary searches instead of a hunt.
 */
export function divide(position: Position, depth: number): { move: string; nodes: number }[] {
  return legalMoves(position)
    .map((move) => ({
      move: moveKey(move),
      nodes: perft(applyMove(position, move), depth - 1),
    }))
    .sort((a, b) => a.move.localeCompare(b.move));
}
