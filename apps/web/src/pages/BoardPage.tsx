import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  BOARD_THEMES,
  Chessboard,
  DEFAULT_THEME_ID,
  isBoardThemeId,
  type BoardThemeId,
  type CoordinateMode,
  type Orientation,
} from '../components/board';
import './BoardPage.css';

const PREFS_KEY = 'chess:board-prefs';

const COORDINATE_MODES: CoordinateMode[] = ['inside', 'outside', 'none'];

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

export function BoardPage() {
  const [prefs, setPrefs] = useState<BoardPrefs>(loadPrefs);

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
          Squares, coordinates and themes. No pieces, no rules — those come later.
        </p>
      </header>

      <div className="board-page__board">
        <Chessboard
          theme={prefs.theme}
          orientation={prefs.orientation}
          coordinates={prefs.coordinates}
        />
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
    </main>
  );
}
