import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseFen, STARTING_FEN } from '@chess/rules';
import { AnalysisPanel } from './AnalysisPanel';

/**
 * A worker that answers like the real engine: acknowledges the handshake, then
 * streams `info` lines and a `bestmove` for every `go`. Replies land on a
 * later tick, as they do over a real message channel.
 */
const created: { commands: string[] }[] = [];

vi.mock('../../engine/workerPort', () => ({
  ENGINE_WORKER_URL: '/engine/test.js',
  createWorkerPort: () => {
    const commands: string[] = [];
    created.push({ commands });
    let emit: (line: string) => void = () => {};

    return {
      postMessage: (command: string) => {
        commands.push(command);
        setTimeout(() => {
          if (command === 'uci') emit('uciok');
          if (command === 'isready') emit('readyok');
          if (command.startsWith('go')) {
            emit('info depth 12 seldepth 18 multipv 1 score cp 34 nodes 1000 pv e2e4 e7e5 g1f3');
            emit('info depth 12 multipv 2 score cp 21 pv d2d4 d7d5');
            emit('info depth 12 multipv 3 score cp -8 pv g1f3 g8f6');
            emit('bestmove e2e4 ponder e7e5');
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

const position = parseFen(STARTING_FEN);

function renderPanel(overrides: Partial<Parameters<typeof AnalysisPanel>[0]> = {}) {
  const props = {
    position,
    enabled: true,
    onEnabledChange: vi.fn(),
    depth: 18 as const,
    onDepthChange: vi.fn(),
    ...overrides,
  };

  return { ...render(<AnalysisPanel {...props} />), props };
}

beforeEach(() => {
  created.length = 0;
});

describe('when analysis is off', () => {
  it('shows the toggle rather than an empty slot, and starts no engine', () => {
    renderPanel({ enabled: false });

    expect(screen.getByLabelText('Analysis')).not.toBeChecked();
    expect(screen.getByText(/Enabling downloads/)).toBeInTheDocument();
    // Acceptance: with the toggle off the engine assets are never fetched.
    expect(created).toHaveLength(0);
  });

  it('reports the toggle rather than flipping itself', async () => {
    const user = userEvent.setup();
    const { props } = renderPanel({ enabled: false });

    await user.click(screen.getByLabelText('Analysis'));

    expect(props.onEnabledChange).toHaveBeenCalledWith(true);
  });

  it('credits the engine and its licence either way', () => {
    renderPanel({ enabled: false });

    expect(screen.getByRole('link', { name: /Stockfish 18 Lite/ })).toBeInTheDocument();
    expect(screen.getByText(/GPL-3\.0/)).toBeInTheDocument();
  });
});

describe('when analysis is on', () => {
  it('loads the engine and shows the evaluation, depth and three lines', async () => {
    renderPanel();

    expect(screen.getByRole('status')).toHaveTextContent('Loading engine…');

    await waitFor(() => {
      // Scoped: the same score also appears on the first candidate line.
      expect(screen.getByText('+0.34', { selector: '.analysis__score' })).toBeInTheDocument();
    });

    expect(screen.getByText('depth 12')).toBeInTheDocument();
    expect(screen.getByText('White-relative')).toBeInTheDocument();

    const lines = screen.getAllByRole('listitem');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent('+0.34');
    expect(lines[0]).toHaveTextContent('e2e4 e7e5 g1f3');
    expect(lines[2]).toHaveTextContent('−0.08');
  });

  it('fills the bar by win probability and labels it White-relative', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Evaluation \+0\.34/ })).toBeInTheDocument();
    });
  });

  it('performs the handshake before sending a position', async () => {
    renderPanel();

    await waitFor(() => {
      expect(created[0]?.commands).toContain(`position fen ${STARTING_FEN}`);
    });

    const commands = created[0]?.commands ?? [];
    expect(commands.indexOf('uci')).toBeLessThan(commands.indexOf('isready'));
    expect(commands.indexOf('isready')).toBeLessThan(
      commands.indexOf(`position fen ${STARTING_FEN}`),
    );
    expect(commands).toContain('go depth 18');
  });

  it('searches at the depth it is given', async () => {
    renderPanel({ depth: 12 });

    await waitFor(() => {
      expect(created[0]?.commands).toContain('go depth 12');
    });
  });
});
