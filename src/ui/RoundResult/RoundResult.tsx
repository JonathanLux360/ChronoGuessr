import { useEffect, useRef, type Dispatch } from 'react';
import { REVEAL_COSTS } from '../../config';
import { describeDistance, formatPoints, formatYear } from '../../game/format';
import { potential } from '../../game/scoring';
import { timelineRange } from '../../game/timeline';
import { totalScore, type RoundResult as Result, type SessionAction, type SessionState } from '../../game/session';
import { bonusPercent } from '../../game/streak';
import { RevealedClueCard } from '../shared/ClueCard';
import styles from './RoundResult.module.css';

type ResultState = Extract<SessionState, { status: 'roundResult' }>;

/** Plain-words streak outcome, for the result screen. */
function streakMessage(result: Result): string {
  const after = result.streakAfter;
  if (result.streakOutcome === 'extended') {
    return `Streak extended to ${after}. Next round: +${bonusPercent(after)}%.`;
  }
  if (result.streakOutcome === 'held') {
    return after === 0 ? 'Near miss. No streak yet.' : `Near miss. Streak held at ${after}.`;
  }
  return result.streakBefore === 0 ? 'No streak yet. Next round: no bonus.' : 'Streak lost. Next round: no bonus.';
}

/** States the tolerance when it is not 1, so strict or kind scoring never looks like a bug. */
function toleranceMessage(value: number): string | null {
  if (Math.abs(value - 1) < 0.005) return null;
  return value < 1 ? `Recent year: tolerance ×${value.toFixed(2)}` : `Ancient year: tolerance ×${value.toFixed(1)}`;
}

/** Where a year sits on the timeline bar, as a percentage from the left. */
function position(year: number, lo: number, hi: number): number {
  return ((year - lo) / (hi - lo)) * 100;
}

export function RoundResult({ state, dispatch }: { state: ResultState; dispatch: Dispatch<SessionAction> }) {
  const { plan, roundIndex, results } = state;
  const result = results[results.length - 1];
  const round = plan[roundIndex];
  const isLast = roundIndex === plan.length - 1;
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextRef.current?.focus();
  }, []);

  // The bar zooms in on the answer and the guess, whatever the era.
  const { lo, hi } = timelineRange(result.year, result.guess);
  const answerAt = position(result.year, lo, hi);
  const guessAt = position(result.guess, lo, hi);
  const left = Math.min(answerAt, guessAt);
  const width = Math.abs(answerAt - guessAt);

  return (
    <main className={styles.page}>
      <h1 className={styles.brand}>ChronoGuessr</h1>
      <p className={styles.round}>
        Round {roundIndex + 1} of {plan.length} · Score so far {formatPoints(totalScore(results))}
      </p>

      <section className={styles.summary} aria-label="Result">
        <p className={styles.eyebrow}>The year was</p>
        <p className={styles.answer}>{formatYear(result.year)}</p>
        <p className={styles.distance}>{describeDistance(result.yearsOff)}</p>
        <p className={styles.detail}>
          You guessed {formatYear(result.guess)} with {result.cluesShown} {result.cluesShown === 1 ? 'clue' : 'clues'}
          {' '}showing, for up to {formatPoints(potential(result.cluesShown))} points.
        </p>
        <p className={styles.points} aria-live="polite">
          <strong>+{formatPoints(result.score)}</strong> points
        </p>
        {result.multiplier > 1 && (
          <p className={styles.breakdown}>
            {formatPoints(result.baseScore)} × {result.multiplier.toFixed(1)} streak bonus
          </p>
        )}
        <p className={styles.streakMessage}>{streakMessage(result)}</p>
        {toleranceMessage(result.tolerance) && <p className={styles.tolerance}>{toleranceMessage(result.tolerance)}</p>}

        <div className={styles.timeline} role="img" aria-label={`Timeline from ${formatYear(lo)} to ${formatYear(hi)}. The answer is ${formatYear(result.year)} and your guess is ${formatYear(result.guess)}.`}>
          <div className={styles.track}>
            <div className={styles.gap} style={{ left: `${left}%`, width: `${width}%` }} />
            <div className={`${styles.marker} ${styles.answerMarker}`} style={{ left: `${answerAt}%` }} />
            <div className={`${styles.marker} ${styles.guessMarker}`} style={{ left: `${guessAt}%` }} />
          </div>
          <div className={styles.ends}>
            <span>{formatYear(lo)}</span>
            <span>{formatYear(hi)}</span>
          </div>
          <ul className={styles.key}>
            <li>
              <span className={`${styles.swatch} ${styles.answerMarker}`} /> Answer {formatYear(result.year)}
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.guessMarker}`} /> Your guess {formatYear(result.guess)}
            </li>
          </ul>
        </div>
      </section>

      {/* Only the clues the player saw. The others stay hidden so the year is fresh if it comes up again. */}
      <section className={styles.clues} aria-label="The clues you saw">
        {result.revealed.map((category, position) => {
          const caption = position === 0 ? 'Clue 1 · free' : `Clue ${position + 1} · −${REVEAL_COSTS[position - 1]}`;
          return (
            <RevealedClueCard key={category} category={category} clue={round.clues[category]} caption={caption} showDetail />
          );
        })}
      </section>

      <div className={styles.actions}>
        <button type="button" ref={nextRef} className={styles.next} onClick={() => dispatch({ type: 'next' })}>
          {isLast ? 'See your results' : 'Next round'}
        </button>
      </div>
    </main>
  );
}
