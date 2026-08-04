import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  FILES,
  RANKS,
  STARTING_LAYOUT,
  type BoardFile,
  type BoardRank,
  type PieceColor,
  type PieceType,
  type Square,
} from '@chess/shared';
import { movesFor } from '@chess/rules';
import {
  BOARD_THEMES,
  Chessboard,
  DEFAULT_THEME_ID,
  isBoardThemeId,
  type BoardThemeId,
  type CoordinateMode,
  type Orientation,
} from '../components/board';
import { Piece } from '../components/pieces';
import './BoardPage.css';

const PREFS_KEY = 'chess:board-prefs';

const COORDINATE_MODES: CoordinateMode[] = ['inside', 'outside', 'none'];

// King first, pawn last — the same order as the height ladder, so the contact
// sheet reads as a ruler as well as an inventory.
const CONTACT_SHEET_TYPES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];
const CONTACT_SHEET_COLORS: PieceColor[] = ['w', 'b'];
const CONTACT_SHEET_SIZES = [24, 48, 96];

// UI preferences, not game state. Parsed defensively so a stale or hand-edited
// localStorage entry falls back to defaults instead of breaking the page.
const prefsSchema = z.object({
  theme: z.string().refine(isBoardThemeId),
  orientation: z.enum(['white', 'black']),
  coordinates: z.enum(['inside', 'outside', 'none']),
});

interface BoardPrefs {
  theme: BoardThemeId;
  orientation: Orientation;
  coordinates: CoordinateMode;
}

const DEFAULT_PREFS: BoardPrefs = {
  theme: DEFAULT_THEME_ID,
  orientation: 'white',
  coordinates: 'inside',
};

function loadPrefs(): BoardPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = prefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as BoardPrefs) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Where a square is drawn, which is the inverse of the board's own cell -> name
 * mapping and the only thing the move dots need to position themselves.
 */
function cellFor(square: Square, orientation: Orientation) {
  const file = FILES.indexOf(square[0] as BoardFile);
  const rank = RANKS.indexOf(square[1] as BoardRank);

  return {
    column: orientation === 'white' ? file : 7 - file,
    row: orientation === 'white' ? 7 - rank : rank,
  };
}

export function BoardPage() {
  const [prefs, setPrefs] = useState<BoardPrefs>(loadPrefs);
  // The whole of the move inspector's state: which square is selected. Nothing
  // moves — this is a debugging view of `movesFor`, not the game UI.
  const [selected, setSelected] = useState<Square | null>(null);

  const selectSquare = (square: Square) => {
    setSelected((current) => (current === square || !STARTING_LAYOUT[square] ? null : square));
  };

  const targets = selected ? movesFor(STARTING_LAYOUT, selected) : [];

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // A full or blocked storage quota must not break the board.
    }
  }, [prefs]);

  const cycleCoordinates = () => {
    setPrefs((current) => {
      const next = COORDINATE_MODES[(COORDINATE_MODES.indexOf(current.coordinates) + 1) % 3];
      return { ...current, coordinates: next ?? 'inside' };
    });
  };

  const flipOrientation = () => {
    setPrefs((current) => ({
      ...current,
      orientation: current.orientation === 'white' ? 'black' : 'white',
    }));
  };

  return (
    <main className="board-page">
      <header className="board-page__header">
        <h1>Board</h1>
        <p className="board-page__subtitle">
          Squares, coordinates, themes and the Meridian piece set. Click a piece to see the quiet
          moves <code>movesFor</code> reports — nothing moves.
        </p>
      </header>

      <div className="board-page__board">
        <Chessboard
          theme={prefs.theme}
          orientation={prefs.orientation}
          coordinates={prefs.coordinates}
          pieces={STARTING_LAYOUT}
          onSquareClick={selectSquare}
        >
          {targets.map((square) => {
            const { row, column } = cellFor(square, prefs.orientation);
            return (
              <span
                key={square}
                className="board-page__dot"
                data-target={square}
                style={{ left: `${column * 12.5}%`, top: `${row * 12.5}%` }}
              />
            );
          })}
        </Chessboard>
      </div>

      <div className="board-page__controls">
        <button type="button" onClick={flipOrientation}>
          Flip board <span className="board-page__value">{prefs.orientation} at bottom</span>
        </button>
        <button type="button" onClick={cycleCoordinates}>
          Coordinates <span className="board-page__value">{prefs.coordinates}</span>
        </button>
      </div>

      <section className="board-page__themes" aria-labelledby="themes-heading">
        <h2 id="themes-heading">Theme</h2>
        <ul className="swatches">
          {BOARD_THEMES.map((theme) => {
            const selected = theme.id === prefs.theme;
            return (
              <li key={theme.id}>
                <button
                  type="button"
                  className="swatch"
                  aria-pressed={selected}
                  onClick={() => setPrefs((current) => ({ ...current, theme: theme.id }))}
                >
                  <span className="swatch__preview" aria-hidden="true">
                    <span style={{ background: theme.light }} />
                    <span style={{ background: theme.dark }} />
                    <span style={{ background: theme.dark }} />
                    <span style={{ background: theme.light }} />
                    {selected ? <span className="swatch__check">✓</span> : null}
                  </span>
                  <span className="swatch__name">{theme.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <ContactSheet />
    </main>
  );
}

/**
 * The review artefact for the piece set. A set that only holds together at
 * 96px is not finished, so every size is shown at once rather than behind a
 * control someone has to think to use.
 */
function ContactSheet() {
  return (
    <section className="board-page__contact" aria-labelledby="contact-heading">
      <h2 id="contact-heading">Piece set — Meridian</h2>
      {CONTACT_SHEET_SIZES.map((size) => (
        <div key={size} className="contact">
          <p className="contact__size">{size}px</p>
          <div className="contact__grid">
            {CONTACT_SHEET_COLORS.map((color) =>
              CONTACT_SHEET_TYPES.map((type) => (
                <span
                  key={`${color}${type}`}
                  className="contact__cell"
                  style={{ width: size, height: size }}
                >
                  <Piece type={type} color={color} />
                </span>
              )),
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
