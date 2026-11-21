import { CONFIG_VERSION } from '../config';
import { MAX_CLUES } from './scoring';
import type { RoundResult } from './session';
import { totalScore } from './session';

export interface RoundDetail {
  year: number;
  guess: number;
  /** How many clues were showing when the guess was made. */
  clues: number;
  points: number;
}

/** One finished session, as saved to the leaderboard. */
export interface SessionResult {
  score: number;
  /** ISO 8601 time the session finished. */
  playedAt: string;
  rounds: number;
  avgYearsOff: number;
  exactHits: number;
  /** Clues shown across the whole session, the free ones included. */
  cluesUsed: number;
  roundDetails: RoundDetail[];
  configVersion: number;
}

export interface SessionStats {
  avgYearsOff: number;
  exactHits: number;
  cluesUsed: number;
  /** The most clues the session could have shown, for "19 of 40". */
  cluesAvailable: number;
}

export function sessionStats(results: readonly RoundResult[]): SessionStats {
  const rounds = results.length;
  const totalOff = results.reduce((sum, r) => sum + r.yearsOff, 0);
  return {
    avgYearsOff: rounds === 0 ? 0 : Math.round((totalOff / rounds) * 10) / 10,
    exactHits: results.filter((r) => r.yearsOff === 0).length,
    cluesUsed: results.reduce((sum, r) => sum + r.cluesShown, 0),
    cluesAvailable: rounds * MAX_CLUES,
  };
}

/** Builds the record to save. The caller supplies the time, so this stays pure. */
export function buildSessionResult(results: readonly RoundResult[], playedAt: string): SessionResult {
  const stats = sessionStats(results);
  return {
    score: totalScore(results),
    playedAt,
    rounds: results.length,
    avgYearsOff: stats.avgYearsOff,
    exactHits: stats.exactHits,
    cluesUsed: stats.cluesUsed,
    roundDetails: results.map((r) => ({ year: r.year, guess: r.guess, clues: r.cluesShown, points: r.score })),
    configVersion: CONFIG_VERSION,
  };
}
