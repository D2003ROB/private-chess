import type { Position } from '@chess/shared';
import { formatPv, formatScore, useEngine, winPercent, type Score } from '../../engine';
import './AnalysisPanel.css';

/**
 * Live evaluation beside the board. The engine analyses; it never plays and it
 * never validates — `@chess/rules` remains the sole authority on legality.
 */

export const ENGINE_DEPTHS = [12, 18, 22] as const;
export type EngineDepth = (typeof ENGINE_DEPTHS)[number];

interface AnalysisPanelProps {
  position: Position;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  depth: EngineDepth;
  onDepthChange: (depth: EngineDepth) => void;
}

export function AnalysisPanel({
  position,
  enabled,
  onEnabledChange,
  depth,
  onDepthChange,
}: AnalysisPanelProps) {
  const { state, evaluation, error, retry } = useEngine(position, { enabled, depth });
  const score = evaluation?.score ?? null;

  return (
    <aside className="analysis" aria-label="Engine analysis">
      <EvalBar score={score} />

      <div className="analysis__body">
        <div className="analysis__header">
          <label className="analysis__toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                onEnabledChange(event.target.checked);
              }}
            />
            Analysis
          </label>

          <select
            className="analysis__depth-select"
            aria-label="Search depth"
            value={depth}
            disabled={!enabled}
            onChange={(event) => {
              onDepthChange(Number(event.target.value) as EngineDepth);
            }}
          >
            {ENGINE_DEPTHS.map((value) => (
              <option key={value} value={value}>
                Depth {value}
              </option>
            ))}
          </select>
        </div>

        {enabled ? (
          <Readout
            state={state}
            error={error}
            score={score}
            depth={evaluation?.depth ?? 0}
            onRetry={retry}
          />
        ) : (
          <p className="analysis__hint">Off. Enabling downloads about 7&nbsp;MB of engine, once.</p>
        )}

        {enabled && evaluation ? (
          <ol className="analysis__lines">
            {evaluation.lines.slice(0, 3).map((line) => (
              <li key={line.multipv} className="analysis__line">
                <span className="analysis__line-score">{formatScore(line.score)}</span>
                <span className="analysis__line-moves">{formatPv(line.moves)}</span>
              </li>
            ))}
          </ol>
        ) : null}

        <p className="analysis__credit">
          <a
            href="https://github.com/nmrugg/stockfish.js"
            rel="noreferrer noopener"
            target="_blank"
          >
            Stockfish 18 Lite (WASM)
          </a>{' '}
          — GPL-3.0. Source and licence in <code>licenses/stockfish</code>.
        </p>
      </div>
    </aside>
  );
}

interface ReadoutProps {
  state: string;
  error: string | null;
  score: Score | null;
  depth: number;
  onRetry: () => void;
}

function Readout({ state, error, score, depth, onRetry }: ReadoutProps) {
  if (state === 'error') {
    return (
      <div className="analysis__error" role="alert">
        <p>{error ?? 'The engine stopped unexpectedly.'}</p>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (!score) {
    // `idle` here means enabled but not yet started — the engine module is
    // still being fetched, which from the user's side is still loading.
    const loading = state === 'loading' || state === 'idle';

    return (
      <p className="analysis__hint" role="status">
        {loading ? 'Loading engine…' : 'Evaluating…'}
      </p>
    );
  }

  return (
    <p className="analysis__readout" role="status">
      <span className="analysis__score">{formatScore(score)}</span>
      <span className="analysis__depth" data-searching={state === 'searching' ? 'true' : undefined}>
        depth {depth}
      </span>
      <span className="analysis__perspective">White-relative</span>
    </p>
  );
}

/** White fills from the bottom, black from the top. Mate drives it fully over. */
function EvalBar({ score }: { score: Score | null }) {
  const percent = score ? winPercent(score) : 50;

  return (
    <div
      className="analysis__bar"
      role="img"
      aria-label={score ? `Evaluation ${formatScore(score)}, White-relative` : 'No evaluation'}
    >
      <div className="analysis__bar-white" style={{ height: `${percent}%` }} />
    </div>
  );
}
