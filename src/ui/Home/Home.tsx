import { useEffect, useRef, useState } from 'react';
import { MAX_ROUND_POINTS, REVEAL_COSTS, ROUNDS_PER_SESSION } from '../../config';
import { formatPoints } from '../../game/format';
import type { PoolStats } from '../../game/selection';
import { potential } from '../../game/scoring';
import { getTopResults } from '../../storage/leaderboard';
import buttons from '../shared/buttons.module.css';
import { Brand } from '../shared/Brand';
import introImage from '../../assets/intro.webp';
import styles from './Home.module.css';

export function Home({
  onStart,
  onLeaderboard,
  stats,
}: {
  onStart: () => void;
  onLeaderboard: () => void;
  /** The live years and clues, counted from the content file when the app is built. */
  stats: PoolStats;
}) {
  const startRef = useRef<HTMLButtonElement>(null);
  // undefined while loading, null when there is no score yet.
  const [best, setBest] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    startRef.current?.focus();
    let live = true;
    getTopResults(1)
      .then((top) => live && setBest(top[0]?.score ?? null))
      .catch(() => live && setBest(null));
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className={styles.page}>
      <Brand />
      <img
        className={styles.hero}
        src={introImage}
        width={440}
        height={440}
        alt="Four illustrated scenes, one for each category: a king speaking to a crowd for Politics, a family in a park for Society, Isaac Newton in his study for Technology, and a harpist performing for Arts and Culture."
      />
      <p className={styles.pitch}>Read the clues. Guess the year. Close guesses score best.</p>

      <p className={styles.best} aria-live="polite">
        {best === undefined ? '\u00a0' : best === null ? 'No score yet. Play a game to set one.' : `Your best: ${formatPoints(best)}`}
      </p>

      <div className={styles.actions}>
        <button type="button" ref={startRef} className={buttons.primary} onClick={onStart}>
          Start game
        </button>
        <button type="button" className={buttons.secondary} onClick={onLeaderboard}>
          Leaderboard
        </button>
      </div>

      <dl className={styles.counters} aria-label="What is in the game">
        <div>
          <dt>Years</dt>
          <dd>{formatPoints(stats.years)}</dd>
        </div>
        <div>
          <dt>Clues</dt>
          <dd>{formatPoints(stats.clues)}</dd>
        </div>
      </dl>

      <details className={styles.howTo}>
        <summary>How to play</summary>
        <ol>
          <li>A game is {ROUNDS_PER_SESSION} rounds. Each round is a mystery year.</li>
          <li>You start with one free clue, picked at random. Guess now, or reveal another clue.</li>
          <li>
            Each reveal costs more than the last, and lowers the points you can win from{' '}
            {formatPoints(MAX_ROUND_POINTS)} to {REVEAL_COSTS.map((_, i) => formatPoints(potential(i + 2))).join(', then ')}.
          </li>
          <li>The closer your guess, the more of those points you keep. A near miss still scores well.</li>
          <li>Years are CE by default. Use the switch for BCE years.</li>
          <li>Keys 1 to 4 reveal a clue. Tab or Enter takes you to the guess field. Enter locks in your guess.</li>
        </ol>
      </details>
    </main>
  );
}
