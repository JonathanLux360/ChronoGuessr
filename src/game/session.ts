import { GUESS_YEAR_MIN, YEAR_MAX } from '../config';
import { accuracy, baseRoundScore, nextRevealCost, potential, roundScore, tolerance, yearsOff } from './scoring';
import { nextStreak, streakMultiplier, streakOutcome, type StreakOutcome } from './streak';
import type { Category, RoundPlan } from './types';

export interface RoundResult {
  year: number;
  guess: number;
  yearsOff: number;
  cluesShown: number;
  /** Categories in the order they were shown, the free clue first. */
  revealed: Category[];
  /** Final points for the round, streak bonus included. */
  score: number;
  /** Points before the streak bonus. */
  baseScore: number;
  /** 0 to 1, after the era tolerance. */
  accuracy: number;
  /** Era tolerance of the answer year. 1 at 1526. */
  tolerance: number;
  /** Hits in a row entering the round, and after it. */
  streakBefore: number;
  streakAfter: number;
  /** Score multiplier for the round (1 with no streak). */
  multiplier: number;
  streakOutcome: StreakOutcome;
}

export type SessionState =
  | { status: 'idle' }
  | {
      status: 'inRound';
      plan: RoundPlan[];
      roundIndex: number;
      revealed: Category[];
      results: RoundResult[];
    }
  | {
      status: 'roundResult';
      plan: RoundPlan[];
      roundIndex: number;
      /** Includes the round that has just finished, as the last entry. */
      results: RoundResult[];
    }
  | { status: 'summary'; results: RoundResult[]; total: number };

export type SessionAction =
  | { type: 'start'; plan: RoundPlan[] }
  | { type: 'reveal'; category: Category }
  | { type: 'guess'; guess: number }
  | { type: 'next' }
  | { type: 'reset' };

export const initialSession: SessionState = { status: 'idle' };

/** The streak entering the next round. It never carries between sessions: a new session starts at 0. */
export function currentStreak(results: readonly RoundResult[]): number {
  return results.length === 0 ? 0 : results[results.length - 1].streakAfter;
}

export function longestStreak(results: readonly RoundResult[]): number {
  return results.reduce((best, r) => Math.max(best, r.streakAfter), 0);
}

/** Points the streak added across the session. */
export function streakBonusTotal(results: readonly RoundResult[]): number {
  return results.reduce((sum, r) => sum + (r.score - r.baseScore), 0);
}

export function totalScore(results: readonly RoundResult[]): number {
  return results.reduce((sum, r) => sum + r.score, 0);
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'start': {
      if (state.status !== 'idle' && state.status !== 'summary') return state;
      if (action.plan.length === 0) return state;
      return {
        status: 'inRound',
        plan: action.plan,
        roundIndex: 0,
        revealed: [action.plan[0].freeCategory],
        results: [],
      };
    }

    case 'reveal': {
      if (state.status !== 'inRound') return state;
      if (state.revealed.includes(action.category)) return state;
      if (nextRevealCost(state.revealed.length) === null) return state;
      return { ...state, revealed: [...state.revealed, action.category] };
    }

    case 'guess': {
      if (state.status !== 'inRound') return state;
      if (!Number.isInteger(action.guess)) return state;
      if (action.guess < GUESS_YEAR_MIN || action.guess > YEAR_MAX) return state;
      const answer = state.plan[state.roundIndex].year;
      const off = yearsOff(action.guess, answer);
      const cluesShown = state.revealed.length;
      const acc = accuracy(off, answer);
      const streakBefore = currentStreak(state.results);
      const result: RoundResult = {
        year: answer,
        guess: action.guess,
        yearsOff: off,
        cluesShown,
        revealed: state.revealed,
        score: roundScore(off, cluesShown, answer, streakBefore),
        baseScore: baseRoundScore(off, cluesShown, answer),
        accuracy: acc,
        tolerance: tolerance(answer),
        streakBefore,
        streakAfter: nextStreak(streakBefore, acc),
        multiplier: streakMultiplier(streakBefore),
        streakOutcome: streakOutcome(acc),
      };
      return {
        status: 'roundResult',
        plan: state.plan,
        roundIndex: state.roundIndex,
        results: [...state.results, result],
      };
    }

    case 'next': {
      if (state.status !== 'roundResult') return state;
      const nextIndex = state.roundIndex + 1;
      if (nextIndex >= state.plan.length) {
        return { status: 'summary', results: state.results, total: totalScore(state.results) };
      }
      return {
        status: 'inRound',
        plan: state.plan,
        roundIndex: nextIndex,
        revealed: [state.plan[nextIndex].freeCategory],
        results: state.results,
      };
    }

    case 'reset':
      return initialSession;
  }
}

/** Potential points for the round in progress. */
export function currentPotential(state: Extract<SessionState, { status: 'inRound' }>): number {
  return potential(state.revealed.length);
}
