import { describe, expect, it } from 'vitest';
import { accuracy, nextRevealCost, potential, roundScore, tolerance, yearsOff } from './scoring';

// Answer years used below, in astronomical numbering (180 BCE is -179, 480 BCE is -479).
// 1884 is where the tolerance is 1 (to within a hair), so it keeps the original spot values.
const Y1884 = 1884;
const Y2020 = 2020;
const Y180BCE = -179;
const Y480BCE = -479;

describe('roundScore (spec spot values, one clue, no streak)', () => {
  it('scores an exact guess as 1000 in any year', () => {
    for (const year of [Y2020, Y1884, Y480BCE, 1526, Y180BCE]) expect(roundScore(0, 1, year)).toBe(1000);
  });
  it('answer 1884 (tolerance about 1)', () => {
    expect(roundScore(10, 1, Y1884)).toBe(559);
    expect(roundScore(100, 1, Y1884)).toBe(232);
    expect(roundScore(10, 4, Y1884)).toBe(224);
    expect(roundScore(500, 1, Y1884)).toBe(0);
    expect(roundScore(1500, 4, Y1884)).toBe(0);
  });
  it('answer 2020 is strict (the tolerance floor)', () => {
    expect(roundScore(1, 1, Y2020)).toBe(559);
    expect(roundScore(10, 1, Y2020)).toBe(232);
    expect(roundScore(50, 1, Y2020)).toBe(0);
  });
  it('answers 1990 and 1950', () => {
    expect(roundScore(10, 1, 1990)).toBe(437);
    expect(roundScore(10, 1, 1950)).toBe(511);
    expect(roundScore(100, 1, 1950)).toBe(183);
  });
  it('older answers are kind and nearly flat before 1800', () => {
    expect(roundScore(10, 1, 1650)).toBe(607);
    expect(roundScore(10, 1, 1526)).toBe(616);
    expect(roundScore(10, 1, 1000)).toBe(631);
    expect(roundScore(100, 1, 1000)).toBe(308);
  });
  it('answer 180 BCE and 480 BCE', () => {
    expect(roundScore(10, 1, Y180BCE)).toBe(639);
    expect(roundScore(50, 1, Y180BCE)).toBe(416);
    expect(roundScore(100, 1, Y180BCE)).toBe(317);
    expect(roundScore(895, 1, Y180BCE)).toBe(0);
    expect(roundScore(10, 1, Y480BCE)).toBe(640);
    expect(roundScore(100, 1, Y480BCE)).toBe(317);
  });
  it('scores an exact guess after all four clues as 400', () => {
    expect(roundScore(0, 4, Y1884)).toBe(400);
  });
});

describe('roundScore with a streak', () => {
  it('multiplies an exact guess: 1000, 1100, 1200, then 1300 from a streak of 3', () => {
    expect([0, 1, 2, 3, 4, 9].map((n) => roundScore(0, 1, Y1884, n))).toEqual([1000, 1100, 1200, 1300, 1300, 1300]);
  });
  it('10 years off at a streak of 3 scores 727 (answer 1884)', () => {
    expect(roundScore(10, 1, Y1884, 3)).toBe(727);
  });
  it('ten exact one-clue rounds, with the streak growing, reach 12,400', () => {
    let total = 0;
    for (let round = 0; round < 10; round++) total += roundScore(0, 1, Y1884, round);
    expect(total).toBe(12_400);
  });
});

describe('tolerance', () => {
  it('is low for recent years, about 1 at 1884, and rises towards the maximum for ancient ones', () => {
    expect(tolerance(2020)).toBe(0.1);
    expect(tolerance(1990)).toBeCloseTo(0.42, 2);
    expect(tolerance(1950)).toBeCloseTo(0.71, 2);
    expect(tolerance(1884)).toBeCloseTo(1, 2);
    expect(tolerance(1526)).toBeCloseTo(1.51, 2);
    expect(tolerance(Y180BCE)).toBeCloseTo(1.8, 2);
    expect(tolerance(-3000)).toBeLessThan(1.9);
  });
  it('flattens out before 1800 and falls fast after 1900', () => {
    expect(tolerance(1000) - tolerance(1526)).toBeLessThan(0.2);
    expect(tolerance(1900) - tolerance(1950)).toBeGreaterThan(0.2);
  });
  it('has a floor, and never depends on a guess', () => {
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
    expect(accuracy(0, Y1884)).toBe(1);
    expect(accuracy(10_000, Y1884)).toBe(0);
  });
  it('falls steadily as the miss grows', () => {
    expect(accuracy(1, Y1884)).toBeGreaterThan(accuracy(2, Y1884));
    expect(accuracy(10, Y1884)).toBeGreaterThan(accuracy(100, Y1884));
  });
  it('costs more over the first 10 years than over the next 90', () => {
    const firstTen = accuracy(0, Y1884) - accuracy(10, Y1884);
    const nextNinety = accuracy(10, Y1884) - accuracy(100, Y1884);
    expect(firstTen).toBeGreaterThan(nextNinety);
  });
  it('is kinder to the same miss in an older year', () => {
    expect(accuracy(10, Y180BCE)).toBeGreaterThan(accuracy(10, Y1884));
    expect(accuracy(10, Y1884)).toBeGreaterThan(accuracy(10, Y2020));
  });
  it('treats a negative distance the same as a positive one', () => {
    expect(accuracy(-10, Y1884)).toBe(accuracy(10, Y1884));
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

describe('streak bands in whole years off (hit at accuracy 0.65, near miss from 0.45)', () => {
  /** The most years off that still reaches the given accuracy. */
  function reach(answer: number, minAccuracy: number): number {
    let best = -1;
    for (let d = 0; d < 3000; d++) if (accuracy(d, answer) >= minAccuracy) best = d;
    return best;
  }
  it('keeps recent years tight and older years only a little wider', () => {
    expect([2020, 1990, 1950, 1884, 1526, -179].map((y) => reach(y, 0.65))).toEqual([0, 2, 3, 5, 7, 9]);
    expect([2020, 1990, 1950, 1884, 1526, -179].map((y) => reach(y, 0.45))).toEqual([2, 9, 15, 21, 33, 39]);
  });
});
