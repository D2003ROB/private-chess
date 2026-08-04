import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Move, PlayedGame, Position } from '@chess/shared';
import { clampIndex, createGame, playMove, positionAt, type GameCursor } from './gameState';

/**
 * The played game, held above the routes so `/review` can read what `/board`
 * produced without serialising it through the URL or duplicating it.
 *
 * A context, not a state-management library: one value, two writers, no
 * selectors. In memory only — persistence is a separate ticket.
 */

interface GameContextValue {
  game: PlayedGame;
  index: number;
  position: Position;
  play: (move: Move) => void;
  goTo: (index: number) => void;
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  children,
  initialFen,
}: {
  children: ReactNode;
  initialFen?: string;
}) {
  const [cursor, setCursor] = useState<GameCursor>(() => ({
    game: createGame(initialFen),
    index: 0,
  }));

  const play = useCallback((move: Move) => {
    setCursor((current) => playMove(current, move));
  }, []);

  const goTo = useCallback((index: number) => {
    setCursor((current) => ({ ...current, index: clampIndex(current.game, index) }));
  }, []);

  const reset = useCallback(() => {
    setCursor((current) => ({ game: createGame(current.game.initialFen), index: 0 }));
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      game: cursor.game,
      index: cursor.index,
      position: positionAt(cursor.game, cursor.index),
      play,
      goTo,
      reset,
    }),
    [cursor, play, goTo, reset],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside a GameProvider');
  return value;
}
