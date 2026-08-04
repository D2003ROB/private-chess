import type { PieceColor } from '@chess/shared';
import type { Score } from './types';

/**
 * Parsers for the UCI text protocol. Pure and DOM-free on purpose: the bulk of
 * the value in this integration is in getting these lines right, and that is
 * only cheap to test if nothing has to be spawned to do it.
 */

export interface InfoUpdate {
  depth: number | null;
  seldepth: number | null;
  /** Absent in single-PV output, where it is implicitly 1. */
  multipv: number;
  nodes: number | null;
  nps: number | null;
  time: number | null;
  /** Still from the side to move's perspective — see `toWhitePerspective`. */
  score: Score;
  moves: string[];
}

export interface BestMove {
  /** `null` for `bestmove (none)`, which is a finished game, not an error. */
  bestmove: string | null;
  ponder: string | null;
}

function toNumber(token: string | undefined): number | null {
  if (token === undefined) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

/**
 * **The correctness bug in this integration.**
 *
 * `score cp` is reported from the side to move's perspective, so a position
 * where Black is winning reports a *positive* score on Black's turn. Displayed
 * raw, the eval bar flips meaning on every single move — and looks plausible
 * enough that nobody notices for a week.
 *
 * Everything downstream of this function is White-relative. Do not "fix" it.
 */
export function toWhitePerspective(score: Score, turn: PieceColor): Score {
  return turn === 'w' ? score : { kind: score.kind, value: -score.value };
}

/** The side to move, read straight off the FEN's second field. */
export function fenTurn(fen: string): PieceColor {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
}

/**
 * Parses one `info` line, or returns `null` for anything without a score —
 * `info string ...`, `info currmove ...`, truncated lines, and noise.
 *
 * Unknown fields (`hashfull`, `tbhits`, `wdl`, …) are skipped rather than
 * rejected: the engine emits more of them than the protocol document lists.
 */
export function parseInfo(line: string): InfoUpdate | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'info') return null;

  let depth: number | null = null;
  let seldepth: number | null = null;
  let multipv = 1;
  let nodes: number | null = null;
  let nps: number | null = null;
  let time: number | null = null;
  let score: Score | null = null;
  let moves: string[] = [];

  for (let index = 1; index < tokens.length; index += 1) {
    switch (tokens[index]) {
      // `info string` is free text; anything after it is not fields.
      case 'string':
        return null;
      case 'depth':
        depth = toNumber(tokens[(index += 1)]);
        if (depth === null) return null;
        break;
      case 'seldepth':
        seldepth = toNumber(tokens[(index += 1)]);
        if (seldepth === null) return null;
        break;
      case 'multipv': {
        const value = toNumber(tokens[(index += 1)]);
        if (value === null) return null;
        multipv = value;
        break;
      }
      case 'nodes':
        nodes = toNumber(tokens[(index += 1)]);
        if (nodes === null) return null;
        break;
      case 'nps':
        nps = toNumber(tokens[(index += 1)]);
        if (nps === null) return null;
        break;
      case 'time':
        time = toNumber(tokens[(index += 1)]);
        if (time === null) return null;
        break;
      case 'score': {
        const kind = tokens[(index += 1)];
        const value = toNumber(tokens[(index += 1)]);
        if ((kind !== 'cp' && kind !== 'mate') || value === null) return null;
        score = { kind, value };
        break;
      }
      case 'pv':
        // The principal variation runs to the end of the line.
        moves = tokens.slice(index + 1).filter(Boolean);
        index = tokens.length;
        break;
      default:
        break;
    }
  }

  if (!score) return null;

  return { depth, seldepth, multipv, nodes, nps, time, score, moves };
}

/** Parses `bestmove e2e4 ponder e7e5`, `bestmove e2e4`, and `bestmove (none)`. */
export function parseBestMove(line: string): BestMove | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'bestmove') return null;

  const best = tokens[1];
  if (best === undefined) return null;

  return {
    bestmove: best === '(none)' ? null : best,
    ponder: tokens[2] === 'ponder' ? (tokens[3] ?? null) : null,
  };
}
