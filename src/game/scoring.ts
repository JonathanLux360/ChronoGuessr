import {
  ERA_EXPONENT,
  ERA_MIN_TOLERANCE,
  ERA_REFERENCE_AGE,
  ERA_REFERENCE_YEAR,
  MAX_DISTANCE,
  MAX_ROUND_POINTS,
  REVEAL_COSTS,
  SCALE_S,
} from '../config';
import { streakMultiplier } from './streak';

/** Total number of clues a round can show (one free, plus one per reveal cost). */
export const MAX_CLUES = REVEAL_COSTS.length + 1;

/**
 * Tolerance for an answer year: how forgiving the score is. 1 at 1526, below 1 for recent years,
 * above 1 for ancient ones. Depends only on the answer, so a guess cannot change it.
 */
export function tolerance(answerYear: number): number {
  const age = Math.max(0, ERA_REFERENCE_YEAR - answerYear);
  return Math.max(ERA_MIN_TOLERANCE, Math.pow(age / ERA_REFERENCE_AGE, ERA_EXPONENT));
}

/**
 * Accuracy from 0 to 1 for a guess that is `yearsOff` years from `answerYear`.
 * Log scale: the first few years of error cost the most, and the tolerance stretches the scale.
 */
export function accuracy(yearsOff: number, answerYear: number): number {
  const d = Math.abs(yearsOff);
  const value = 1 - Math.log(1 + d / (SCALE_S * tolerance(answerYear))) / Math.log(1 + MAX_DISTANCE / SCALE_S);
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

/** Round score before any streak bonus: potential points multiplied by accuracy, rounded. */
export function baseRoundScore(yearsOff: number, cluesShown: number, answerYear: number): number {
  return Math.round(potential(cluesShown) * accuracy(yearsOff, answerYear));
}

/**
 * Round score: potential × accuracy × streak multiplier, rounded once at the end.
 * `streak` is the number of hits in a row entering the round.
 */
export function roundScore(yearsOff: number, cluesShown: number, answerYear: number, streak = 0): number {
  return Math.round(potential(cluesShown) * accuracy(yearsOff, answerYear) * streakMultiplier(streak));
}

/** Absolute distance in years between a guess and the answer. */
export function yearsOff(guess: number, answer: number): number {
  return Math.abs(guess - answer);
}
