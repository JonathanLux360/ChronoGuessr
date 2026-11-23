import { useEffect, useRef, type CSSProperties } from 'react';
import { SHINE_DELAY_MS, SHINE_DURATION_MS } from '../../config';
import { describeDistance, formatPoints, formatYear, ordinal } from '../../game/format';
import { longestStreak, streakBonusTotal, type RoundResult } from '../../game/session';
import { bonusPercent } from '../../game/streak';
import { sessionStats } from '../../game/stats';
import type { SaveOutcome } from '../../storage/leaderboard';
import buttons from '../shared/buttons.module.css';
import { Brand } from '../shared/Brand';
import celebration from '../shared/Celebration.module.css';
import { Confetti } from '../shared/Confetti';
import styles from './Summary.module.css';

function rankMessage(outcome: SaveOutcome | null): string {
  if (outcome === null) return ' '; // still saving
  if (outcome.isNewBest) return 'New personal best!';
  if (outcome.rank !== null) return `${ordinal(outcome.rank)} best`;
  return 'Not in your top results this time.';
}

export function Summary({
  results,
  total,
  outcome,
  onPlayAgain,
  onLeaderboard,
  onHome,
}: {
  results: RoundResult[];
  total: number;
  /** Null until the result has been saved. */
  outcome: SaveOutcome | null;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
  onHome: () => void;
}) {
  const againRef = useRef<HTMLButtonElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const isNewBest = outcome?.isNewBest === true; // Celebrated with the gold border, shine and confetti.
  const stats = sessionStats(results);
  const bonus = streakBonusTotal(results);
  const longest = longestStreak(results);

  useEffect(() => {
    againRef.current?.focus();
  }, []);

  return (
    <main className={styles.page}>
      <Brand />
      <section className={`${styles.hero} ${isNewBest ? celebration.gold : ''}`} aria-label="Your result">
        {isNewBest && <Confetti targetRef={totalRef} />}
        <p className={styles.eyebrow}>Your score</p>
        <p className={styles.total}>
          <span
            ref={totalRef}
            className={isNewBest ? `${celebration.shineTarget} ${celebration.shine}` : celebration.shineTarget}
            style={{ '--shine-delay': `${SHINE_DELAY_MS}ms`, '--shine-duration': `${SHINE_DURATION_MS}ms` } as CSSProperties}
          >
            {formatPoints(total)}
          </span>
        </p>
        <p className={styles.rank} aria-live="polite">
          {rankMessage(outcome)}
        </p>
        <p className={styles.split}>
          Base score {formatPoints(total - bonus)} + streak bonus {formatPoints(bonus)}
        </p>
        {outcome?.previousBest != null && !outcome.isNewBest && (
          <p className={styles.sub}>Your best is {formatPoints(outcome.previousBest)}.</p>
        )}
      </section>

      <dl className={styles.stats}>
        <div>
          <dt>Average years off</dt>
          <dd>{stats.avgYearsOff}</dd>
        </div>
        <div>
          <dt>Exact guesses</dt>
          <dd>{stats.exactHits}</dd>
        </div>
        <div>
          <dt>Longest streak</dt>
          <dd>{longest}</dd>
        </div>
        <div>
          <dt>Clues used</dt>
          <dd>
            {stats.cluesUsed} of {stats.cluesAvailable}
          </dd>
        </div>
      </dl>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="visually-hidden">Your rounds</caption>
          <thead>
            <tr>
              <th scope="col">Round</th>
              <th scope="col">Year</th>
              <th scope="col">Your guess</th>
              <th scope="col">Off by</th>
              <th scope="col">Clues</th>
              <th scope="col">Streak</th>
              <th scope="col">Points</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.year}>
                <th scope="row">{i + 1}</th>
                <td>{formatYear(r.year)}</td>
                <td>{formatYear(r.guess)}</td>
                <td>{r.yearsOff === 0 ? describeDistance(0) : r.yearsOff}</td>
                <td>{r.cluesShown}</td>
                <td>{r.multiplier > 1 ? `+${bonusPercent(r.streakBefore)}%` : '–'}</td>
                <td>{formatPoints(r.score)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={6}>
                Total
              </th>
              <td>{formatPoints(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.actions}>
        <button type="button" ref={againRef} className={buttons.primary} onClick={onPlayAgain} disabled={outcome === null}>
          Play again
        </button>
        <button type="button" className={buttons.secondary} onClick={onLeaderboard}>
          Leaderboard
        </button>
        <button type="button" className={buttons.secondary} onClick={onHome}>
          Home
        </button>
      </div>
    </main>
  );
}
