import { useEffect, useState } from 'react';
import { formatDate, formatPoints } from '../../game/format';
import { MAX_CLUES } from '../../game/scoring';
import type { SessionResult } from '../../game/stats';
import { getTopResults, resetLeaderboard } from '../../storage/leaderboard';
import buttons from '../shared/buttons.module.css';
import { Brand } from '../shared/Brand';
import styles from './Leaderboard.module.css';

export function Leaderboard({
  fromSummary,
  onBack,
  onPlay,
  onHome,
}: {
  /** True when the player opened the leaderboard from their results, so Back returns there. */
  fromSummary: boolean;
  onBack: () => void;
  onPlay: () => void;
  onHome: () => void;
}) {
  // null while loading.
  const [results, setResults] = useState<SessionResult[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let live = true;
    getTopResults()
      .then((top) => live && setResults(top))
      .catch(() => live && setResults([]));
    return () => {
      live = false;
    };
  }, []);

  async function reset() {
    await resetLeaderboard();
    setResults([]);
    setConfirming(false);
  }

  return (
    <main className={styles.page}>
      <Brand />
      <h2 className={styles.title}>Your best games</h2>

      {results === null ? (
        <p className={styles.empty}>&nbsp;</p>
      ) : results.length === 0 ? (
        <p className={styles.empty}>Nothing here yet. Finish a game to set your first score.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">Your top games, best first</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Score</th>
                <th scope="col">Date</th>
                <th scope="col">Avg years off</th>
                <th scope="col">Exact</th>
                <th scope="col">Clues used</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={`${r.playedAt}-${i}`} className={i === 0 ? styles.best : undefined}>
                  <th scope="row">
                    {i + 1}
                    {i === 0 && <span className={styles.bestTag}> Best</span>}
                  </th>
                  <td>{formatPoints(r.score)}</td>
                  <td>{formatDate(r.playedAt)}</td>
                  <td>{r.avgYearsOff}</td>
                  <td>{r.exactHits}</td>
                  <td>
                    {r.cluesUsed} of {r.rounds * MAX_CLUES}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={buttons.primary} onClick={onPlay}>
          Play again
        </button>
        {fromSummary && (
          <button type="button" className={buttons.secondary} onClick={onBack}>
            Back to results
          </button>
        )}
        <button type="button" className={buttons.secondary} onClick={onHome}>
          Home
        </button>
      </div>

      {results !== null && results.length > 0 && (
        <div className={styles.reset}>
          {confirming ? (
            <div role="alertdialog" aria-label="Confirm reset" className={styles.confirm}>
              <p>Reset the leaderboard? This deletes all your saved scores.</p>
              <div className={styles.actions}>
                <button type="button" className={buttons.primary} onClick={reset}>
                  Yes, reset
                </button>
                <button type="button" className={buttons.secondary} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={styles.link} onClick={() => setConfirming(true)}>
              Reset leaderboard
            </button>
          )}
        </div>
      )}
    </main>
  );
}
