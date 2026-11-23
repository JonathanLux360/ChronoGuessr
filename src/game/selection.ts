import { CLUE_CATEGORIES, ROUNDS_PER_SESSION } from '../config';
import { createRng, pickOne, shuffle, type Rng } from './random';
import type { Category, Clue, RoundPlan, YearRecord } from './types';

/**
 * The live pool: only verified clues, and only years that still have at least one
 * verified clue in every category. Nothing else is ever shown to a player.
 */
export function buildLivePool(records: readonly YearRecord[]): YearRecord[] {
  const live: YearRecord[] = [];
  for (const record of records) {
    const clues = {} as Record<Category, Clue[]>;
    let complete = true;
    for (const category of CLUE_CATEGORIES) {
      clues[category] = record.clues[category].filter((c) => c.verified);
      if (clues[category].length === 0) complete = false;
    }
    if (complete) live.push({ year: record.year, clues });
  }
  return live;
}

/** How much live content there is: the number of years, and the number of clues across them. */
export interface PoolStats {
  years: number;
  clues: number;
}

/** Counts a live pool (see buildLivePool), so only live years and their verified clues are counted. */
export function poolStats(pool: readonly YearRecord[]): PoolStats {
  let clues = 0;
  for (const record of pool) for (const category of CLUE_CATEGORIES) clues += record.clues[category].length;
  return { years: pool.length, clues };
}

/**
 * Picks years for a session at random. There are no era quotas, and no year repeats
 * within a session. If the pool is smaller than `count`, every year is used once.
 */
export function selectYears(pool: readonly YearRecord[], count: number, rng: Rng): YearRecord[] {
  return shuffle(pool, rng).slice(0, count);
}

/**
 * Builds a whole session from a seed: the years, then one random clue per category for each
 * year, and a random free clue. The same seed always gives the same session.
 */
export function planSession(
  records: readonly YearRecord[],
  seed: number,
  count: number = ROUNDS_PER_SESSION,
): RoundPlan[] {
  const rng = createRng(seed);
  return selectYears(buildLivePool(records), count, rng).map((record) => {
    const clues = {} as Record<Category, Clue>;
    for (const category of CLUE_CATEGORIES) clues[category] = pickOne(record.clues[category], rng);
    return { year: record.year, clues, freeCategory: pickOne(CLUE_CATEGORIES, rng) };
  });
}
