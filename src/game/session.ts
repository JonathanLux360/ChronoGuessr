import { GUESS_YEAR_MIN, YEAR_MAX } from '../config';
import { nextRevealCost, potential, roundScore, yearsOff } from './scoring';
import type { Category, RoundPlan } from './types';

export interface RoundResult {
  year: number;
  guess: number;
  yearsOff: number;
  cluesShown: number;
  /** Categories in the order they were shown, the free clue first. */
  revealed: Category[];
  score: number;
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
      const result: RoundResult = {
        year: answer,
        guess: action.guess,
        yearsOff: off,
        cluesShown,
        revealed: state.revealed,
        score: roundScore(off, cluesShown),
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
