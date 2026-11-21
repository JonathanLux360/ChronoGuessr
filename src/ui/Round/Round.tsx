import { useEffect, useRef, useState, type Dispatch, type FormEvent } from 'react';
import { CLUE_CATEGORIES, REVEAL_COSTS, ROUNDS_PER_SESSION } from '../../config';
import { formatPoints } from '../../game/format';
import { INVALID_GUESS_MESSAGE, isTypeableGuess, MAX_GUESS_LENGTH, parseGuess, type Era } from '../../game/guess';
import { nextRevealCost, potential } from '../../game/scoring';
import { totalScore, type SessionAction, type SessionState } from '../../game/session';
import { HiddenClueCard, RevealedClueCard } from '../shared/ClueCard';
import styles from './Round.module.css';

type InRound = Extract<SessionState, { status: 'inRound' }>;

export function Round({ state, dispatch }: { state: InRound; dispatch: Dispatch<SessionAction> }) {
  const { plan, roundIndex, revealed, results } = state;
  const round = plan[roundIndex];
  const cluesShown = revealed.length;
  const currentPotential = potential(cluesShown);
  const cost = nextRevealCost(cluesShown);
  const potentialAfter = cost === null ? null : potential(cluesShown + 1);

  const [text, setText] = useState('');
  const [era, setEra] = useState<Era>('CE');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the page, not the field, so the keys 1 to 4 work straight away.
  useEffect(() => {
    headingRef.current?.focus();
  }, [roundIndex]);

  // Keys 1 to 4 reveal a clue. Enter jumps to the guess field. Digits typed in the field are left alone.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      // Tab from the page itself (nothing focused yet) goes straight to the guess field.
      // Once the field is focused, Tab and Shift+Tab move through the controls as normal.
      if (event.key === 'Tab' && !event.shiftKey && (target === document.body || target === headingRef.current)) {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      const index = ['1', '2', '3', '4'].indexOf(event.key);
      if (index >= 0) {
        const category = CLUE_CATEGORIES[index];
        if (!revealed.includes(category) && cost !== null) {
          event.preventDefault();
          dispatch({ type: 'reveal', category });
        }
        return;
      }
      if (event.key === 'Enter' && !(target instanceof HTMLButtonElement) && !(target instanceof HTMLAnchorElement)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [revealed, cost, dispatch]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseGuess(text, era);
    if (!parsed.ok) {
      setError(parsed.message);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    dispatch({ type: 'guess', guess: parsed.year });
  }

  const potentialLadder = [1, 2, 3, 4].map((n) => potential(n));

  return (
    <main className={styles.page}>
      <h1 className={styles.brand}>ChronoGuessr</h1>

      <section className={styles.stats} aria-label="Round status">
        <div className={`${styles.panel} ${styles.round}`}>
          <p className={styles.eyebrow}>Round</p>
          <p className={styles.roundNumber}>
            <strong>{roundIndex + 1}</strong> of {plan.length || ROUNDS_PER_SESSION}
          </p>
          <ol className={styles.dots} aria-hidden="true">
            {plan.map((_, i) => (
              <li key={i} className={i < roundIndex ? styles.done : i === roundIndex ? styles.current : styles.todo} />
            ))}
          </ol>
        </div>

        <div className={`${styles.panel} ${styles.potential}`}>
          <p className={styles.eyebrow}>Potential points</p>
          <p className={styles.potentialNumber} aria-live="polite" aria-atomic="true">
            {formatPoints(currentPotential)}
          </p>
          <p className={styles.ladder} aria-hidden="true">
            {potentialLadder.map((p, i) => (
              <span key={p}>
                {i > 0 && <span className={styles.arrow}> → </span>}
                <span className={i + 1 < cluesShown ? styles.spent : i + 1 === cluesShown ? styles.now : undefined}>
                  {formatPoints(p)}
                </span>
              </span>
            ))}
          </p>
          <p className={styles.note}>Each clue you reveal lowers it.</p>
        </div>

        <div className={`${styles.panel} ${styles.score}`}>
          <p className={styles.eyebrow}>Score</p>
          <p className={styles.scoreNumber}>{formatPoints(totalScore(results))}</p>
          <p className={styles.note}>
            after {results.length} {results.length === 1 ? 'round' : 'rounds'}
          </p>
        </div>
      </section>

      <h2 className={styles.prompt} ref={headingRef} tabIndex={-1}>
        Which year do these clues point to?
      </h2>

      <section className={styles.clues} aria-label="Clues">
        {CLUE_CATEGORIES.map((category) => {
          const position = revealed.indexOf(category);
          if (position >= 0) {
            const caption = position === 0 ? 'Clue 1 · free' : `Clue ${position + 1} · −${REVEAL_COSTS[position - 1]}`;
            return <RevealedClueCard key={category} category={category} clue={round.clues[category]} caption={caption} />;
          }
          return (
            <HiddenClueCard
              key={category}
              category={category}
              cost={cost}
              potentialAfter={potentialAfter}
              onReveal={() => dispatch({ type: 'reveal', category })}
            />
          );
        })}
      </section>

      <form className={styles.guess} onSubmit={onSubmit} noValidate>
        <label htmlFor="guess" className={styles.guessLabel}>
          Your guess
        </label>
        <div className={styles.guessRow}>
          <input
            id="guess"
            ref={inputRef}
            className={styles.input}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={MAX_GUESS_LENGTH}
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              // Refuse anything that is not a plain number: letters, symbols, spaces, a leading zero, a fifth digit.
              // Whether the number fits the chosen era is checked on submit.
              if (!isTypeableGuess(next)) {
                setError(INVALID_GUESS_MESSAGE);
                return;
              }
              setText(next);
              setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? 'guess-error guess-hint' : 'guess-hint'}
            placeholder="Year"
          />
          <fieldset className={styles.era}>
            <legend className="visually-hidden">Era</legend>
            {(['CE', 'BCE'] as const).map((value) => (
              <label key={value} className={styles.eraOption}>
                <input
                  type="radio"
                  name="era"
                  value={value}
                  checked={era === value}
                  onChange={() => {
                    setEra(value);
                    setError(null);
                  }}
                />
                <span>{value}</span>
              </label>
            ))}
          </fieldset>
          <button type="submit" className={styles.submit}>
            Lock in guess
          </button>
        </div>
        <p id="guess-error" className={styles.error} role="alert">
          {error}
        </p>
        <p className={styles.guessNow}>Guess now for up to {formatPoints(currentPotential)} points.</p>
        <p id="guess-hint" className={styles.hint}>
          Enter to guess · keys 1–4 reveal a clue
        </p>
      </form>
    </main>
  );
}
