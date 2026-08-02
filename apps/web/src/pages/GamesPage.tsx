import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGameInputSchema, type Game } from '@chess/shared';
import { api, ApiError } from '../api/client';

const gamesQueryKey = ['games'] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function GamesPage() {
  const queryClient = useQueryClient();

  const [whitePlayer, setWhitePlayer] = useState('');
  const [blackPlayer, setBlackPlayer] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const gamesQuery = useQuery({
    queryKey: gamesQueryKey,
    queryFn: api.listGames,
  });

  const createGame = useMutation({
    mutationFn: api.createGame,
    onSuccess: async () => {
      setWhitePlayer('');
      setBlackPlayer('');
      setFormErrors({});
      await queryClient.invalidateQueries({ queryKey: gamesQueryKey });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validate with the same schema the API uses, so an empty name never
    // reaches the network.
    const parsed = createGameInputSchema.safeParse({ whitePlayer, blackPlayer });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? 'form');
        errors[field] ??= issue.message;
      }
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    createGame.mutate(parsed.data);
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1>Games</h1>
        <p className="page__subtitle">
          A thin vertical slice: create a game record and list it back.
        </p>
      </header>

      <section className="panel" aria-labelledby="new-game-heading">
        <h2 id="new-game-heading">New game</h2>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form__field">
            <label htmlFor="whitePlayer">White player</label>
            <input
              id="whitePlayer"
              name="whitePlayer"
              value={whitePlayer}
              onChange={(event) => setWhitePlayer(event.target.value)}
              aria-invalid={Boolean(formErrors.whitePlayer)}
            />
            {formErrors.whitePlayer ? (
              <p className="form__error" role="alert">
                {formErrors.whitePlayer}
              </p>
            ) : null}
          </div>

          <div className="form__field">
            <label htmlFor="blackPlayer">Black player</label>
            <input
              id="blackPlayer"
              name="blackPlayer"
              value={blackPlayer}
              onChange={(event) => setBlackPlayer(event.target.value)}
              aria-invalid={Boolean(formErrors.blackPlayer)}
            />
            {formErrors.blackPlayer ? (
              <p className="form__error" role="alert">
                {formErrors.blackPlayer}
              </p>
            ) : null}
          </div>

          <button type="submit" disabled={createGame.isPending}>
            {createGame.isPending ? 'Creating…' : 'Create game'}
          </button>

          {createGame.isError ? (
            <p className="form__error" role="alert">
              {createGame.error instanceof ApiError
                ? createGame.error.message
                : 'Could not create the game.'}
            </p>
          ) : null}
        </form>
      </section>

      <section className="panel" aria-labelledby="games-heading">
        <h2 id="games-heading">All games</h2>
        <GamesList
          isPending={gamesQuery.isPending}
          isError={gamesQuery.isError}
          error={gamesQuery.error}
          games={gamesQuery.data}
          onRetry={() => void gamesQuery.refetch()}
        />
      </section>
    </main>
  );
}

interface GamesListProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  games: Game[] | undefined;
  onRetry: () => void;
}

function GamesList({ isPending, isError, error, games, onRetry }: GamesListProps) {
  if (isPending) {
    return <p className="state state--loading">Loading games…</p>;
  }

  if (isError) {
    return (
      <div className="state state--error" role="alert">
        <p>{error instanceof ApiError ? error.message : 'Could not load games.'}</p>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return <p className="state state--empty">No games yet. Create one above to get started.</p>;
  }

  return (
    <ul className="games">
      {games.map((game) => (
        <li key={game.id} className="games__item">
          <span className="games__players">
            {game.whitePlayer} vs {game.blackPlayer}
          </span>
          <span className="games__status">{game.status}</span>
          <span className="games__date">{formatDate(game.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
