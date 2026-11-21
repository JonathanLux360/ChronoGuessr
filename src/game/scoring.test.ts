import { describe, expect, it } from 'vitest';
import { accuracy, nextRevealCost, potential, roundScore, yearsOff } from './scoring';

describe('roundScore (spec spot values)', () => {
  it('scores an exact guess with one clue as 1000', () => {
    expect(roundScore(0, 1)).toBe(1000);
  });
  it('scores 10 years off with one clue as 559', () => {
    expect(roundScore(10, 1)).toBe(559);
  });
  it('scores 100 years off with one clue as 232', () => {
    expect(roundScore(100, 1)).toBe(232);
  });
  it('scores 10 years off with four clues as 224', () => {
    expect(roundScore(10, 4)).toBe(224);
  });
  it('scores 500 or more years off as 0', () => {
    expect(roundScore(500, 1)).toBe(0);
    expect(roundScore(501, 1)).toBe(0);
    expect(roundScore(1500, 4)).toBe(0);
  });
  it('scores an exact guess after all four clues as 400', () => {
    expect(roundScore(0, 4)).toBe(400);
  });
});

describe('potential', () => {
  it('reads 1000, 900, 700, 400 as clues are revealed', () => {
    expect([1, 2, 3, 4].map(potential)).toEqual([1000, 900, 700, 400]);
  });
  it('rejects impossible clue counts', () => {
    expect(() => potential(0)).toThrow(RangeError);
    expect(() => potential(5)).toThrow(RangeError);
    expect(() => potential(1.5)).toThrow(RangeError);
  });
});

describe('nextRevealCost', () => {
  it('returns the cost of the next reveal, then null', () => {
    expect([1, 2, 3, 4].map(nextRevealCost)).toEqual([100, 200, 300, null]);
  });
});

describe('accuracy', () => {
  it('is 1 for an exact guess and never negative', () => {
    expect(accuracy(0)).toBe(1);
    expect(accuracy(10_000)).toBe(0);
  });
  it('falls steadily as the miss grows', () => {
    expect(accuracy(1)).toBeGreaterThan(accuracy(2));
    expect(accuracy(10)).toBeGreaterThan(accuracy(100));
  });
  it('costs more over the first 10 years than over the next 90', () => {
    const firstTen = accuracy(0) - accuracy(10);
    const nextNinety = accuracy(10) - accuracy(100);
    expect(firstTen).toBeGreaterThan(nextNinety);
  });
  it('treats a negative distance the same as a positive one', () => {
    expect(accuracy(-10)).toBe(accuracy(10));
  });
});

describe('yearsOff', () => {
  it('is the absolute difference', () => {
    expect(yearsOff(1960, 1969)).toBe(9);
    expect(yearsOff(1975, 1969)).toBe(6);
  });
  it('handles BCE years stored as negative integers', () => {
    expect(yearsOff(-43, 0)).toBe(43);
  });
});
