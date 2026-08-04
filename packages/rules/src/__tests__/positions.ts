import { STARTING_FEN } from '../fen.js';

/**
 * The standard perft positions, with the leaf counts from the Chess
 * Programming Wiki. Each one targets a different corner of the rules, which is
 * why all five are here rather than just the start position.
 *
 * A transcription error in this table costs a day of hunting a bug that is not
 * there, so treat the numbers as fixed and the engine as the thing under test.
 */
export interface PerftPosition {
  name: string;
  fen: string;
  /** Leaf counts for depths 1, 2, 3, 4. */
  nodes: [number, number, number, number];
  targets: string;
}

export const PERFT_POSITIONS: readonly PerftPosition[] = [
  {
    name: 'start',
    fen: STARTING_FEN,
    nodes: [20, 400, 8_902, 197_281],
    targets: 'the baseline geometry',
  },
  {
    name: 'kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    nodes: [48, 2_039, 97_862, 4_085_603],
    targets: 'castling and pins',
  },
  {
    name: 'position 3',
    fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    nodes: [14, 191, 2_812, 43_238],
    targets: 'en passant and promotion edges',
  },
  {
    name: 'position 4',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    nodes: [6, 264, 9_467, 422_333],
    targets: 'promotions under check',
  },
  {
    name: 'position 5',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    nodes: [44, 1_486, 62_379, 2_103_487],
    targets: 'castling-rights bookkeeping',
  },
];
