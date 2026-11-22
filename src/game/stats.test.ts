import { describe, expect, it } from 'vitest';
import { CONFIG_VERSION } from '../config';
import { formatDate, ordinal } from './format';
import type { RoundResult } from './session';
import { buildSessionResult, sessionStats } from './stats';

function round(year: number, guess: number, cluesShown: number, score: number): RoundResult {
  return {
    year,
    guess,
    yearsOff: Math.abs(year - guess),
    cluesShown,
    revealed: ['politics', 'society', 'technology', 'arts_culture'].slice(0, cluesShown) as RoundResult['revealed'],
    score,
    baseScore: score,
    accuracy: 1,
    tolerance: 1,
    streakBefore: 0,
    streakAfter: 0,
    multiplier: 1,
    streakOutcome: 'extended',
  };
}

const results = [round(1969, 1969, 1, 1000), round(1900, 1910, 2, 503), round(1800, 1830, 4, 150)];

describe('sessionStats', () => {
  it('works out the skill stats', () => {
    expect(sessionStats(results)).toEqual({
      avgYearsOff: 13.3, // (0 + 10 + 30) / 3, to one decimal place
      exactHits: 1,
      cluesUsed: 7,
      cluesAvailable: 12,
    });
  });
  it('copes with no rounds', () => {
    expect(sessionStats([])).toEqual({ avgYearsOff: 0, exactHits: 0, cluesUsed: 0, cluesAvailable: 0 });
  });
});

describe('buildSessionResult', () => {
  it('builds the saved record, with a score equal to the sum of the rounds', () => {
    const saved = buildSessionResult(results, '2026-11-21T18:04:00.000Z');
    expect(saved).toMatchObject({
      score: 1653,
      playedAt: '2026-11-21T18:04:00.000Z',
      rounds: 3,
      avgYearsOff: 13.3,
      exactHits: 1,
      cluesUsed: 7,
      streakBonus: 0,
      longestStreak: 0,
      configVersion: CONFIG_VERSION,
    });
    expect(saved.roundDetails[1]).toEqual({ year: 1900, guess: 1910, clues: 2, points: 503, multiplier: 1 });
  });
});

describe('streak fields', () => {
  it('splits the streak bonus from the base score and finds the longest streak', () => {
    const a = { ...round(1526, 1526, 1, 1000), streakBefore: 0, streakAfter: 1 };
    const b = { ...round(1526, 1526, 1, 1100), baseScore: 1000, streakBefore: 1, streakAfter: 2, multiplier: 1.1 };
    const c = { ...round(1526, 1526, 1, 1200), baseScore: 1000, streakBefore: 2, streakAfter: 3, multiplier: 1.2 };
    const d = { ...round(1526, 1000, 1, 0), baseScore: 0, streakBefore: 3, streakAfter: 0, multiplier: 1.3 };
    const saved = buildSessionResult([a, b, c, d], '2026-11-21T18:04:00.000Z');
    expect(saved.score).toBe(3300);
    expect(saved.streakBonus).toBe(300);
    expect(saved.longestStreak).toBe(3);
  });
});

describe('ordinal', () => {
  it('adds the right ending', () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '10th', '11th', '12th', '13th', '21st', '22nd', '23rd',
    ]);
  });
});

describe('formatDate', () => {
  it('formats an ISO date, and copes with junk', () => {
    expect(formatDate('2026-11-21T18:04:00.000Z')).toMatch(/21 Nov 2026/);
    expect(formatDate('not a date')).toBe('');
  });
});

describe('timelineRange', () => {
  it('zooms in on the answer and the guess, and never gets narrower than the minimum span', async () => {
    const { timelineRange, MIN_TIMELINE_SPAN } = await import('./timeline');
    const near = timelineRange(1969, 1972);
    expect(near.lo).toBeLessThanOrEqual(1969);
    expect(near.hi).toBeGreaterThanOrEqual(1972);
    expect(near.hi - near.lo).toBeGreaterThanOrEqual(MIN_TIMELINE_SPAN);
  });
  it('rounds the ends outwards to whole tens', async () => {
    const { timelineRange } = await import('./timeline');
    const { lo, hi } = timelineRange(1869, 1912);
    expect(lo % 10).toBe(0);
    expect(hi % 10).toBe(0);
    expect(lo).toBeLessThanOrEqual(1869);
    expect(hi).toBeGreaterThanOrEqual(1912);
  });
  it('contains both years when they are far apart, including BCE', async () => {
    const { timelineRange } = await import('./timeline');
    const { lo, hi } = timelineRange(-479, 1900);
    expect(lo).toBeLessThan(-479);
    expect(hi).toBeGreaterThan(1900);
  });
  it('handles an exact guess', async () => {
    const { timelineRange } = await import('./timeline');
    const { lo, hi } = timelineRange(1500, 1500);
    expect(lo).toBeLessThan(1500);
    expect(hi).toBeGreaterThan(1500);
  });
});
