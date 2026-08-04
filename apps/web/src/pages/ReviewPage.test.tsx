import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { legalMoves, moveKey } from '@chess/rules';
import { GameProvider, useGame } from '../game';
import { evaluationCache } from '../review';
import { ReviewPage } from './ReviewPage';

/** A worker that answers every search instantly, so a whole game reviews fast. */
const searches: string[] = [];

vi.mock('../engine/workerPort', () => ({
  ENGINE_WORKER_URL: '/engine/test.js',
  createWorkerPort: () => {
    let emit: (line: string) => void = () => {};
    let ply = 0;

    return {
      postMessage: (command: string) => {
        if (command.startsWith('position')) searches.push(command);
        setTimeout(() => {
          if (command === 'uci') emit('uciok');
          if (command === 'isready') emit('readyok');
          if (command.startsWith('go')) {
            // Alternating scores, so both sides register a loss somewhere and
            // the labels are not all identical.
            const score = ply % 2 === 0 ? 30 : -120;
            ply += 1;
            emit(`info depth 16 multipv 1 score cp ${score} pv e2e4 e7e5`);
            emit(`info depth 16 multipv 2 score cp ${score - 40} pv d2d4`);
            emit('bestmove e2e4');
          }
        }, 0);
      },
      terminate: () => {},
      onMessage: (handler: (line: string) => void) => {
        emit = handler;
      },
      onError: () => {},
    };
  },
}));

/** Plays the given long-algebraic moves into the shared game, one per render. */
function PlayMoves({ keys }: { keys: string[] }) {
  const { game, index, play } = useGame();
  const position = game.positions[index];

  useEffect(() => {
    if (index >= keys.length || !position) return;
    const move = legalMoves(position).find((candidate) => moveKey(candidate) === keys[index]);
    if (move) play(move);
  }, [index, position, play, keys]);

  return null;
}

function renderReview(keys: string[] = ['e2e4', 'e7e5', 'g1f3', 'b8c6']) {
  return render(
    <MemoryRouter>
      <GameProvider>
        <PlayMoves keys={keys} />
        <ReviewPage />
      </GameProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  searches.length = 0;
  evaluationCache.clear();
});

describe('ReviewPage', () => {
  it('says there is nothing to review before a game is played', () => {
    renderReview([]);

    expect(screen.getByText(/No moves to review yet/)).toBeInTheDocument();
  });

  it('states that the labels are this app’s own analysis', async () => {
    renderReview();

    await waitFor(() => {
      expect(screen.getByText(/own analysis/)).toBeInTheDocument();
    });
  });

  it('labels every move and scores both players', async () => {
    const user = userEvent.setup();
    renderReview();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Analyse game' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: 'Analyse game' }));

    await waitFor(() => {
      expect(screen.getByText('White accuracy')).toBeInTheDocument();
    });

    // Four moves reviewed, five positions analysed.
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(searches).toHaveLength(5);
    expect(screen.getByText('Black accuracy')).toBeInTheDocument();
    expect(screen.getByText('Moves')).toBeInTheDocument();
  });

  it('navigates the board when a move is clicked', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.click(await screen.findByRole('button', { name: 'Analyse game' }));
    await waitFor(() => {
      expect(screen.getByText('White accuracy')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('listitem');
    const third = rows[2]?.querySelector('button');
    if (!third) throw new Error('expected a move row');

    await user.click(third);

    expect(third).toHaveAttribute('aria-current', 'true');
  });

  it('re-reviews from cache without touching the engine again', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.click(await screen.findByRole('button', { name: 'Analyse game' }));
    await waitFor(() => {
      expect(screen.getByText('White accuracy')).toBeInTheDocument();
    });
    expect(searches).toHaveLength(5);

    searches.length = 0;
    await user.click(screen.getByRole('button', { name: 'Analyse again' }));

    await waitFor(() => {
      expect(screen.getByText('White accuracy')).toBeInTheDocument();
    });
    expect(searches).toHaveLength(0);
  });
});
