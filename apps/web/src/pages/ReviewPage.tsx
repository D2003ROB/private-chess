import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../game';
import { DEFAULT_REVIEW_DEPTH, REVIEW_DEPTHS, useReview, type ReviewDepth } from '../review';
import { EvalGraph, MoveList, ReviewBoard, SummaryTable } from '../components/review';
import { DEFAULT_THEME_ID } from '../components/board';
import '../components/review/Review.css';
import './ReviewPage.css';

/**
 * Post-game review: a label for every move and an accuracy score per side.
 *
 * The labels are this application's own analysis — chess.com's algorithm is
 * proprietary and unpublished, and the two will disagree. That note is in the
 * UI as well as here, because it prevents a bug report that can never be
 * resolved.
 */
export function ReviewPage() {
  const { game, goTo } = useGame();
  const [depth, setDepth] = useState<ReviewDepth>(DEFAULT_REVIEW_DEPTH);
  const [selected, setSelected] = useState(0);
  const { status, progress, review, error, start, cancel } = useReview(game, depth);

  const position = game.positions[Math.min(selected, game.positions.length - 1)];

  const select = (index: number) => {
    setSelected(index);
    goTo(index);
  };

  if (game.moves.length === 0) {
    return (
      <main className="review">
        <h1>Review</h1>
        <p className="review__empty">
          No moves to review yet. Play a game on the <Link to="/board">board</Link> and come back.
        </p>
      </main>
    );
  }

  return (
    <main className="review">
      <header className="review__header">
        <h1>Review</h1>
        <p className="review__disclaimer">
          Labels and accuracy are this app&rsquo;s own analysis, not chess.com&rsquo;s — their
          algorithm is proprietary, so the two will disagree.
        </p>
      </header>

      <section className="review__controls">
        <label>
          Depth{' '}
          <select
            value={depth}
            disabled={status === 'running'}
            onChange={(event) => {
              setDepth(Number(event.target.value) as ReviewDepth);
            }}
          >
            {REVIEW_DEPTHS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {status === 'running' ? (
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        ) : (
          <button type="button" onClick={start}>
            {review ? 'Analyse again' : 'Analyse game'}
          </button>
        )}
      </section>

      {status === 'running' ? (
        <section className="review__progress" aria-live="polite">
          <progress value={progress.done} max={progress.total || 1} />
          <p>
            {progress.done} / {progress.total} positions
            {progress.etaSeconds !== null ? ` — about ${progress.etaSeconds}s left` : ''}
          </p>
        </section>
      ) : null}

      {status === 'error' ? (
        <p className="review__error" role="alert">
          {error ?? 'The review failed.'}
        </p>
      ) : null}

      <div className="review__layout">
        <div className="review__board">
          {review && position ? (
            <ReviewBoard
              review={review}
              index={selected}
              board={position.board}
              theme={DEFAULT_THEME_ID}
              orientation="white"
            />
          ) : null}
        </div>

        {review ? (
          <div className="review__panel">
            <div className="review__accuracy">
              <Accuracy label="White" value={review.accuracy.w} />
              <Accuracy label="Black" value={review.accuracy.b} />
            </div>

            <EvalGraph review={review} selected={selected} onSelect={select} />
            <SummaryTable review={review} />
            <MoveList review={review} selected={selected} onSelect={select} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Accuracy({ label, value }: { label: string; value: number }) {
  return (
    <div className="review__accuracy-side">
      <p className="review__accuracy-value">{value.toFixed(1)}</p>
      <p className="review__accuracy-label">{label} accuracy</p>
    </div>
  );
}
