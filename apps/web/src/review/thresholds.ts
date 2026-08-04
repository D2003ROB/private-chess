/**
 * Every tunable number in the classifier, in one place.
 *
 * When the labels feel wrong on real games — and the first pass will — the fix
 * is almost always a number in here, not the code. Each one says what band it
 * is meant to capture so tuning is editing a value rather than reading a
 * function.
 *
 * These are this application's own thresholds. Chess.com's algorithm is
 * proprietary and unpublished; nothing here reproduces it, and the two will
 * disagree, most visibly on Brilliant and Great.
 */
export const THRESHOLDS = {
  /** Win percentage the mover may lose and still earn each label. */
  loss: {
    /** Essentially the engine's move. */
    excellent: 2,
    /** A good move that gives up a little. */
    good: 5,
    /** Noticeable, not yet costly. */
    inaccuracy: 10,
    /** Costly, still recoverable. */
    mistake: 20,
    // Anything at or beyond `mistake` is a Blunder, or a Miss if a win was thrown away.
  },

  great: {
    /**
     * How much worse the second-best line must be for the played move to be
     * the only move that holds. Below this, several moves work and playing the
     * best one is merely Best.
     */
    secondBestGapPct: 10,
  },

  brilliant: {
    /** A brilliancy may be fractionally short of the engine's choice. */
    maxLossPct: 2,
    /**
     * How far from level the position may already be. A queen sacrifice while
     * up a rook is good technique, not brilliance — without this the label
     * fires constantly in won positions, which is the classic failure mode.
     */
    maxEdgeBeforePct: 40,
    /** The sacrifice has to actually work: not losing once it lands. */
    minWinPctAfter: 50,
  },

  miss: {
    /**
     * A won position, in centipawns, converted through the same sigmoid the
     * classifier uses. Above this the game should be closing out; dropping
     * below it is a Miss rather than a plain Blunder — the player did not lose
     * the game, they failed to finish it.
     */
    winningCp: 400,
  },

  /** Plies from the start that may be Book. Beyond this, openings are judged. */
  bookPlies: 12,
} as const;
