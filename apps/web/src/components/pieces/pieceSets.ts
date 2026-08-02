import type { PieceSet } from './types';
import { meridian } from './sets/meridian';

/**
 * The piece-set registry. Deliberately mirrors the board theme registry in
 * `components/board/themes.ts`: a second set is a folder under `sets/` plus one
 * entry here, and nothing else changes.
 */
export const PIECE_SETS = [meridian] as const satisfies readonly PieceSet[];

export type PieceSetId = (typeof PIECE_SETS)[number]['id'];

export const DEFAULT_PIECE_SET_ID: PieceSetId = 'meridian';

const SETS_BY_ID = new Map<string, PieceSet>(PIECE_SETS.map((set) => [set.id, set]));

/** Returns the named set, falling back to the default for an unknown id. */
export function getPieceSet(id: string): PieceSet {
  return SETS_BY_ID.get(id) ?? PIECE_SETS[0];
}
