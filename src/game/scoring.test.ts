import { describe, expect, it } from 'vitest';
import { accuracy, nextRevealCost, potential, roundScore, tolerance, yearsOff } from './scoring';

// Answer years used below, in astronomical numbering (180 BCE is -179, 480 BCE is -479).
const Y1526 = 1526;
const Y2020 = 2020;
const Y180BCE = -179;
const Y480BCE = -479;

describe('roundScore (spec spot values, one clue, no streak)', () => {
  it('scores an exact guess as 1000 in any year', () => {
    for (const year of [Y2020, Y1526, Y480BCE, 1950, Y180BCE]) expect(roundScore(0, 1, year)).toBe(1000);
  });
  it('answer 1526 (tolerance 1)', () => {
    expect(roundScore(10, 1, Y1526)).toBe(559);
    expect(roundScore(100, 1, Y1526)).toBe(232);
    expect(roundScore(10, 4, Y1526)).toBe(224);
    expect(roundScore(500, 1, Y1526)).toBe(0);
    expect(roundScore(501, 1, Y1526)).toBe(0);
    expect(roundScore(1500, 4, Y1526)).toBe(0);
  });
  it('answer 2020 is strict', () => {
    expect(roundScore(1, 1, Y2020)).toBe(572);
    expect(roundScore(10, 1, Y2020)).toBe(246);
    expect(roundScore(50, 1, Y2020)).toBe(13);
    expect(roundScore(55, 1, Y2020)).toBe(0);
    expect(roundScore(100, 1, Y2020)).toBe(0);
  });
  it('answers 1950 and 1650', () => {
    expect(roundScore(10, 1, 1950)).toBe(427);
    expect(roundScore(10, 1, 1650)).toBe(540);
  });
  it('answer 180 BCE is kind', () => {
    expect(roundScore(10, 1, Y180BCE)).toBe(659);
    expect(roundScore(50, 1, Y180BCE)).toBe(438);
    expect(roundScore(100, 1, Y180BCE)).toBe(339);
    expect(roundScore(1050, 1, Y180BCE)).toBe(0);
  });
  it('answers 1000 CE and 480 BCE', () => {
    expect(roundScore(100, 1, 1000)).toBe(284);
    expect(roundScore(100, 1, Y480BCE)).toBe(348);
  });
  it('scores an exact guess after all four clues as 400', () => {
    expect(roundScore(0, 4, Y1526)).toBe(400);
  });
});

describe('roundScore with a streak', () => {
  it('multiplies an exact 1526 guess: 1000, 1100, 1200, then 1300 from a streak of 3', () => {
    expect([0, 1, 2, 3, 4, 9].map((n) => roundScore(0, 1, Y1526, n))).toEqual([1000, 1100, 1200, 1300, 1300, 1300]);
  });
  it('10 years off at a streak of 3 scores 727', () => {
    expect(roundScore(10, 1, Y1526, 3)).toBe(727);
  });
  it('ten exact one-clue rounds, with the streak growing, reach 12,400', () => {
    let total = 0;
    for (let round = 0; round < 10; round++) total += roundScore(0, 1, Y1526, round);
    expect(total).toBe(12_400);
  });
});

describe('tolerance', () => {
  it('is 1 at 1526, falls for recent years and rises for ancient ones', () => {
    expect(tolerance(1526)).toBeCloseTo(1, 10);
    expect(tolerance(1950)).toBeCloseTo(0.39, 2);
    expect(tolerance(2020)).toBeCloseTo(0.11, 2);
    expect(tolerance(Y180BCE)).toBeCloseTo(2.1, 1);
  });
  it('has a floor, and never depends on a guess', () => {
    expect(tolerance(2021)).toBeCloseTo(0.1, 10);
    expect(tolerance(2026)).toBe(0.1);
    expect(tolerance(2030)).toBe(0.1);
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
    expect(accuracy(0, Y1526)).toBe(1);
    expect(accuracy(10_000, Y1526)).toBe(0);
  });
  it('falls steadily as the miss grows', () => {
    expect(accuracy(1, Y1526)).toBeGreaterThan(accuracy(2, Y1526));
    expect(accuracy(10, Y1526)).toBeGreaterThan(accuracy(100, Y1526));
  });
  it('costs more over the first 10 years than over the next 90', () => {
    const firstTen = accuracy(0, Y1526) - accuracy(10, Y1526);
    const nextNinety = accuracy(10, Y1526) - accuracy(100, Y1526);
    expect(firstTen).toBeGreaterThan(nextNinety);
  });
  it('is kinder to the same miss in an older year', () => {
    expect(accuracy(10, Y180BCE)).toBeGreaterThan(accuracy(10, Y1526));
    expect(accuracy(10, Y1526)).toBeGreaterThan(accuracy(10, Y2020));
  });
  it('treats a negative distance the same as a positive one', () => {
    expect(accuracy(-10, Y1526)).toBe(accuracy(10, Y1526));
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
