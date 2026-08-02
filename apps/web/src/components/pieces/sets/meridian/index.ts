import type { PieceSet } from '../../types';
import { WhiteKing } from './WhiteKing';
import { BlackKing } from './BlackKing';
import { WhiteQueen } from './WhiteQueen';
import { BlackQueen } from './BlackQueen';
import { WhiteRook } from './WhiteRook';
import { BlackRook } from './BlackRook';
import { WhiteBishop } from './WhiteBishop';
import { BlackBishop } from './BlackBishop';
import { WhiteKnight } from './WhiteKnight';
import { BlackKnight } from './BlackKnight';
import { WhitePawn } from './WhitePawn';
import { BlackPawn } from './BlackPawn';

/**
 * Meridian: flat, high-contrast, geometric Staunton. Even stroke weight, no
 * gradients, no shading — pieces are read by silhouette, because at 24px
 * detail is mud.
 */
export const meridian: PieceSet = {
  id: 'meridian',
  name: 'Meridian',
  components: {
    wk: WhiteKing,
    wq: WhiteQueen,
    wr: WhiteRook,
    wb: WhiteBishop,
    wn: WhiteKnight,
    wp: WhitePawn,
    bk: BlackKing,
    bq: BlackQueen,
    br: BlackRook,
    bb: BlackBishop,
    bn: BlackKnight,
    bp: BlackPawn,
  },
};
