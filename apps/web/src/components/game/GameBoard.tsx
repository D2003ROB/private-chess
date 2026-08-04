import { useState, type ReactNode } from 'react';
import type { Move, PieceColor, Position, PromotionPiece, Square } from '@chess/shared';
import { gameStatus, legalMovesFrom } from '@chess/rules';
import { useGame } from '../../game';
import { Chessboard, type BoardThemeId, type CoordinateMode, type Orientation } from '../board';
import { Piece } from '../pieces';
import { squareToCell } from './cells';
import './GameBoard.css';

/**
 * A hot-seat board over the played game.
 *
 * The game — start position, moves, and every position they produced — lives
 * in `GameProvider` so the review page can read it. The board renders whatever
 * position the cursor points at, and playing from anywhere but the end
 * discards what followed.
 */

const PROMOTION_ORDER: PromotionPiece[] = ['q', 'r', 'b', 'n'];

const STATUS_LABELS = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  'fifty-move': 'Draw — fifty-move rule',
  'insufficient-material': 'Draw — insufficient material',
  threefold: 'Draw — threefold repetition',
} as const;

interface GameBoardProps {
  theme: BoardThemeId;
  orientation: Orientation;
  coordinates: CoordinateMode;
  /**
   * Rendered beside the board and handed the live position. A slot rather than
   * a prop drill: the board stays the single owner of the game state, and
   * whatever needs to read it — the engine panel today — gets it directly.
   */
  aside?: (position: Position) => ReactNode;
}

function describe(position: Position): string {
  const status = gameStatus(position);
  const mover = position.turn === 'w' ? 'White' : 'Black';

  switch (status.state) {
    case 'checkmate':
      return `${STATUS_LABELS.checkmate} — ${status.winner === 'w' ? 'White' : 'Black'} wins`;
    case 'stalemate':
      return STATUS_LABELS.stalemate;
    case 'draw':
      return STATUS_LABELS[status.reason];
    default:
      return status.check ? `${mover} to move — Check` : `${mover} to move`;
  }
}

export function GameBoard({ theme, orientation, coordinates, aside }: GameBoardProps) {
  const { game, index, position, play: commit, goTo } = useGame();
  const [selected, setSelected] = useState<Square | null>(null);
  /** The four promotion moves awaiting a choice, if a promoting move was clicked. */
  const [promoting, setPromoting] = useState<Move[] | null>(null);

  const moves = selected ? legalMovesFrom(position, selected) : [];

  const play = (move: Move) => {
    commit(move);
    setSelected(null);
    setPromoting(null);
  };

  const handleSquare = (square: Square) => {
    // A click anywhere while the chooser is open abandons the promotion.
    if (promoting) {
      setPromoting(null);
      setSelected(null);
      return;
    }

    const destinations = moves.filter((move) => move.to === square);
    if (destinations.length > 1) {
      // Same from and to, four different pieces: ask before playing one.
      setPromoting(destinations);
      return;
    }
    if (destinations[0]) {
      play(destinations[0]);
      return;
    }

    // Anything else selects your own piece, or deselects. Never moves.
    const piece = position.board[square];
    setSelected(piece?.color === position.turn && square !== selected ? square : null);
  };

  return (
    <div className="game">
      <p className="game__status" role="status">
        {describe(position)}
      </p>

      <nav className="game__nav" aria-label="Move navigation">
        <button type="button" onClick={() => goTo(0)} disabled={index === 0}>
          ⏮
        </button>
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}>
          ◀
        </button>
        <span className="game__ply">
          {index} / {game.moves.length}
        </span>
        <button type="button" onClick={() => goTo(index + 1)} disabled={index >= game.moves.length}>
          ▶
        </button>
        <button
          type="button"
          onClick={() => goTo(game.moves.length)}
          disabled={index >= game.moves.length}
        >
          ⏭
        </button>
      </nav>

      <div className="game__layout">
        <div className="game__board">
          <Chessboard
            theme={theme}
            orientation={orientation}
            coordinates={coordinates}
            pieces={position.board}
            onSquareClick={handleSquare}
          >
            {selected ? (
              <Marker square={selected} orientation={orientation} kind="selected" />
            ) : null}
            {moves.map((move) => (
              <Marker
                key={`${move.to}${move.promotion ?? ''}`}
                square={move.to}
                orientation={orientation}
                kind={move.flags.includes('capture') ? 'capture' : 'move'}
              />
            ))}
          </Chessboard>
        </div>

        {aside ? aside(position) : null}
      </div>

      {promoting ? (
        <PromotionChooser moves={promoting} color={position.turn} onChoose={play} />
      ) : null}
    </div>
  );
}

interface MarkerProps {
  square: Square;
  orientation: Orientation;
  kind: 'move' | 'capture' | 'selected';
}

/** A dot for a quiet move, a ring for a capture, a wash for the selected square. */
function Marker({ square, orientation, kind }: MarkerProps) {
  const { row, column } = squareToCell(square, orientation);

  return (
    <span
      className={`game__marker game__marker--${kind}`}
      data-marker={kind}
      data-square-marker={square}
      style={{ left: `${column * 12.5}%`, top: `${row * 12.5}%` }}
    />
  );
}

interface PromotionChooserProps {
  moves: Move[];
  color: PieceColor;
  onChoose: (move: Move) => void;
}

function PromotionChooser({ moves, color, onChoose }: PromotionChooserProps) {
  const ordered = PROMOTION_ORDER.map((type) =>
    moves.find((move) => move.promotion === type),
  ).filter((move): move is Move => Boolean(move));

  return (
    <div className="game__promotion" role="group" aria-label="Choose a promotion piece">
      {ordered.map((move) => (
        <button
          key={move.promotion}
          type="button"
          className="game__promotion-choice"
          onClick={() => onChoose(move)}
        >
          <Piece type={move.promotion ?? 'q'} color={color} />
        </button>
      ))}
    </div>
  );
}
