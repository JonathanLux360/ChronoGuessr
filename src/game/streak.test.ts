import { describe, expect, it } from 'vitest';
import { bonusPercent, isStreakCapped, nextStreak, streakMultiplier, streakOutcome } from './streak';

describe('streakMultiplier', () => {
  it('is 1 with no streak and rises 10% a hit, capped at +30%', () => {
    expect([0, 1, 2, 3, 4, 10].map(streakMultiplier)).toEqual([1, 1.1, 1.2, 1.3, 1.3, 1.3]);
  });
});

describe('streak transitions', () => {
  it('extends at accuracy 0.65, holds at 0.45, resets below it', () => {
    expect(nextStreak(2, 0.65)).toBe(3);
    expect(nextStreak(2, 0.45)).toBe(2);
    expect(nextStreak(2, 0.44)).toBe(0);
    expect(nextStreak(2, 1)).toBe(3);
    expect(nextStreak(2, 0.649)).toBe(2);
    expect(nextStreak(0, 0)).toBe(0);
  });
  it('names the outcome', () => {
    expect(streakOutcome(0.65)).toBe('extended');
    expect(streakOutcome(0.5)).toBe('held');
    expect(streakOutcome(0.1)).toBe('lost');
  });
});

describe('display helpers', () => {
  it('reports the bonus as a whole percentage', () => {
    expect([0, 1, 2, 3, 5].map(bonusPercent)).toEqual([0, 10, 20, 30, 30]);
  });
  it('knows when the streak is capped', () => {
    expect([0, 2, 3, 4].map(isStreakCapped)).toEqual([false, false, true, true]);
  });
});
