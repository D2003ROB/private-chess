import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { GamesPage } from './GamesPage';
import { api } from '../api/client';
import type * as ApiClientModule from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    api: {
      listGames: vi.fn(),
      createGame: vi.fn(),
      getGame: vi.fn(),
      health: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api);

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('GamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state when the API returns no games', async () => {
    mockedApi.listGames.mockResolvedValue([]);

    renderWithClient(<GamesPage />);

    expect(
      await screen.findByText(/No games yet. Create one above to get started./i),
    ).toBeInTheDocument();
  });
});
