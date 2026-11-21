import { MAX_DISTANCE, MAX_ROUND_POINTS, REVEAL_COSTS, SCALE_S } from '../config';

/** Total number of clues a round can show (one free, plus one per reveal cost). */
export const MAX_CLUES = REVEAL_COSTS.length + 1;

/**
 * Accuracy from 0 to 1 for a guess that is `yearsOff` years away.
 * Log scale: the first few years of error cost the most.
 */
export function accuracy(yearsOff: number): number {
  const d = Math.abs(yearsOff);
  const value = 1 - Math.log(1 + d / SCALE_S) / Math.log(1 + MAX_DISTANCE / SCALE_S);
  return Math.max(0, value);
}

/** Potential points once `cluesShown` clues are visible (1 to MAX_CLUES). */
export function potential(cluesShown: number): number {
  if (!Number.isInteger(cluesShown) || cluesShown < 1 || cluesShown > MAX_CLUES) {
    throw new RangeError(`cluesShown must be an integer from 1 to ${MAX_CLUES}`);
  }
  const spent = REVEAL_COSTS.slice(0, cluesShown - 1).reduce((sum, cost) => sum + cost, 0);
  return MAX_ROUND_POINTS - spent;
}

/** Cost of revealing the next clue, or null when every clue is already showing. */
export function nextRevealCost(cluesShown: number): number | null {
  return cluesShown >= MAX_CLUES ? null : REVEAL_COSTS[cluesShown - 1];
}

/** Round score: potential points multiplied by accuracy, rounded. */
export function roundScore(yearsOff: number, cluesShown: number): number {
  return Math.round(potential(cluesShown) * accuracy(yearsOff));
}

/** Absolute distance in years between a guess and the answer. */
export function yearsOff(guess: number, answer: number): number {
  return Math.abs(guess - answer);
}
