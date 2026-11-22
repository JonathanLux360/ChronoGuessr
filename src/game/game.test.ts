import { describe, expect, it } from 'vitest';
import { CLUE_CATEGORIES, ROUNDS_PER_SESSION } from '../config';
import { describeDistance, formatYear } from './format';
import { isTypeableGuess, parseGuess } from './guess';
import { createRng, shuffle } from './random';
import { buildLivePool, planSession, selectYears } from './selection';
import { currentStreak, initialSession, longestStreak, sessionReducer, streakBonusTotal, totalScore, type SessionState } from './session';
import type { Category, Clue, YearRecord } from './types';

function makeClue(text: string, verified = true): Clue {
  return { text, region: 'Europe', difficulty: 1, source: 'https://example.com', verified };
}

/** A year with one verified clue per category, unless `clues` says otherwise. */
function makeYear(year: number, clues: Partial<Record<Category, Clue[]>> = {}): YearRecord {
  const one = (category: Category) => [makeClue(`${category} clue for ${year}`)];
  return {
    year,
    clues: {
      politics: clues.politics ?? one('politics'),
      society: clues.society ?? one('society'),
      technology: clues.technology ?? one('technology'),
      arts_culture: clues.arts_culture ?? one('arts_culture'),
    },
  };
}

const pool = Array.from({ length: 60 }, (_, i) => makeYear(1900 + i));

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('gives different sequences for different seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
  it('stays within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
  it('shuffles without losing or duplicating items', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffle(items, createRng(3));
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('buildLivePool', () => {
  it('keeps only verified clues', () => {
    const record = makeYear(1900, { politics: [makeClue('Verified.'), makeClue('Draft.', false)] });
    const [live] = buildLivePool([record]);
    expect(live.clues.politics.map((c) => c.text)).toEqual(['Verified.']);
  });
  it('drops a year with no verified clue in some category', () => {
    const incomplete = makeYear(1901, { society: [makeClue('Draft only.', false)] });
    const empty = makeYear(1902, { technology: [] });
    expect(buildLivePool([makeYear(1900), incomplete, empty]).map((y) => y.year)).toEqual([1900]);
  });
  it('does not change the records it is given', () => {
    const record = makeYear(1900, { politics: [makeClue('Verified.'), makeClue('Draft.', false)] });
    buildLivePool([record]);
    expect(record.clues.politics).toHaveLength(2);
  });
});

describe('selectYears', () => {
  it('picks the requested number of distinct years', () => {
    const picked = selectYears(pool, 10, createRng(1));
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((y) => y.year)).size).toBe(10);
  });
  it('is repeatable for the same seed', () => {
    const a = selectYears(pool, 10, createRng(9)).map((y) => y.year);
    const b = selectYears(pool, 10, createRng(9)).map((y) => y.year);
    expect(a).toEqual(b);
  });
  it('uses every year in the pool if it is smaller than a session', () => {
    expect(selectYears(pool.slice(0, 4), 10, createRng(1))).toHaveLength(4);
  });
  it('can reach every year in the pool across many seeds (no era bias, nothing excluded)', () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      selectYears(pool, 10, createRng(seed)).forEach((y) => seen.add(y.year));
    }
    expect(seen.size).toBe(pool.length);
  });
});

describe('planSession', () => {
  it('plans a full session: distinct years, four clues each, and a free clue', () => {
    const plan = planSession(pool, 5);
    expect(plan).toHaveLength(ROUNDS_PER_SESSION);
    expect(new Set(plan.map((p) => p.year)).size).toBe(ROUNDS_PER_SESSION);
    for (const round of plan) {
      expect(CLUE_CATEGORIES.includes(round.freeCategory)).toBe(true);
      for (const category of CLUE_CATEGORIES) expect(round.clues[category].text).toContain(`${round.year}`);
    }
  });
  it('does not always give the same free clue', () => {
    const categories = new Set<Category>();
    for (let seed = 0; seed < 30; seed++) {
      planSession(pool, seed).forEach((p) => categories.add(p.freeCategory));
    }
    expect(categories.size).toBe(CLUE_CATEGORIES.length);
  });
  it('is repeatable for the same seed', () => {
    expect(planSession(pool, 11)).toEqual(planSession(pool, 11));
  });
  describe('with several clues per category', () => {
    const many = makeYear(1683, {
      politics: [makeClue('Politics A.'), makeClue('Politics B.'), makeClue('Politics C.')],
      society: [makeClue('Society A.'), makeClue('Society B.')],
    });
    const manyPool = [many, ...pool.slice(0, 11)];

    it('draws a different clue from the same year in different sessions', () => {
      const seen = new Set<string>();
      for (let seed = 0; seed < 300; seed++) {
        const round = planSession(manyPool, seed, 12).find((p) => p.year === 1683);
        seen.add(`${round?.clues.politics.text}|${round?.clues.society.text}`);
      }
      expect(seen.size).toBe(6); // 3 politics clues x 2 society clues
    });
    it('always draws a clue that belongs to that year and category', () => {
      for (let seed = 0; seed < 50; seed++) {
        const round = planSession(manyPool, seed, 12).find((p) => p.year === 1683)!;
        expect(many.clues.politics.map((c) => c.text)).toContain(round.clues.politics.text);
        expect(many.clues.society.map((c) => c.text)).toContain(round.clues.society.text);
        expect(many.clues.technology.map((c) => c.text)).toContain(round.clues.technology.text);
      }
    });
    it('never draws an unverified clue', () => {
      const withDraft = makeYear(1683, { politics: [makeClue('Verified.'), makeClue('Draft.', false)] });
      for (let seed = 0; seed < 100; seed++) {
        const round = planSession([withDraft, ...pool.slice(0, 11)], seed, 12).find((p) => p.year === 1683)!;
        expect(round.clues.politics.text).toBe('Verified.');
      }
    });
    it('never plans a year that has no verified clue in a category', () => {
      const incomplete = makeYear(1683, { society: [makeClue('Draft only.', false)] });
      for (let seed = 0; seed < 50; seed++) {
        expect(planSession([incomplete, ...pool.slice(0, 11)], seed, 12).map((p) => p.year)).not.toContain(1683);
      }
    });
  });
});

describe('sessionReducer', () => {
  const plan = planSession(pool, 1);
  const started = sessionReducer(initialSession, { type: 'start', plan });

  function inRound(state: SessionState) {
    if (state.status !== 'inRound') throw new Error(`expected inRound, got ${state.status}`);
    return state;
  }

  it('starts round 1 with exactly one clue showing', () => {
    const s = inRound(started);
    expect(s.roundIndex).toBe(0);
    expect(s.revealed).toEqual([plan[0].freeCategory]);
  });

  it('ignores an empty plan', () => {
    expect(sessionReducer(initialSession, { type: 'start', plan: [] })).toBe(initialSession);
  });

  it('reveals clues one at a time and never twice', () => {
    const free = plan[0].freeCategory;
    const others = CLUE_CATEGORIES.filter((c) => c !== free);
    let s = started;
    s = sessionReducer(s, { type: 'reveal', category: free });
    expect(inRound(s).revealed).toHaveLength(1);
    s = sessionReducer(s, { type: 'reveal', category: others[0] });
    s = sessionReducer(s, { type: 'reveal', category: others[0] });
    expect(inRound(s).revealed).toEqual([free, others[0]]);
  });

  it('scores from the clues shown when the guess is made', () => {
    const answer = plan[0].year;
    const s = sessionReducer(started, { type: 'guess', guess: answer });
    expect(s.status).toBe('roundResult');
    if (s.status === 'roundResult') {
      expect(s.results[0]).toMatchObject({ yearsOff: 0, cluesShown: 1, score: 1000 });
    }
  });

  it('lowers the score for each extra clue', () => {
    const answer = plan[0].year;
    let s = started;
    for (const c of CLUE_CATEGORIES) s = sessionReducer(s, { type: 'reveal', category: c });
    expect(inRound(s).revealed).toHaveLength(4);
    s = sessionReducer(s, { type: 'guess', guess: answer });
    if (s.status === 'roundResult') expect(s.results[0].score).toBe(400);
  });

  it('builds a streak across rounds, holds it on a near miss, and resets it on a miss', () => {
    const plan3 = planSession(pool, 3);
    let s = sessionReducer(initialSession, { type: 'start', plan: plan3 });
    // Round 1 is always x1.0, and an exact guess extends the streak.
    s = sessionReducer(s, { type: 'guess', guess: plan3[0].year });
    expect(s.status === 'roundResult' && s.results[0]).toMatchObject({ multiplier: 1, streakBefore: 0, streakAfter: 1, streakOutcome: 'extended', score: 1000 });
    s = sessionReducer(s, { type: 'next' });
    // Round 2: x1.1 with a streak of 1.
    s = sessionReducer(s, { type: 'guess', guess: plan3[1].year });
    expect(s.status === 'roundResult' && s.results[1]).toMatchObject({ multiplier: 1.1, streakAfter: 2, score: 1100, baseScore: 1000 });
    s = sessionReducer(s, { type: 'next' });
    // Round 3: a wild guess resets it.
    s = sessionReducer(s, { type: 'guess', guess: plan3[2].year - 400 });
    if (s.status !== 'roundResult') throw new Error('expected a result');
    expect(s.results[2]).toMatchObject({ multiplier: 1.2, streakAfter: 0, streakOutcome: 'lost' });
    expect(currentStreak(s.results)).toBe(0);
    expect(longestStreak(s.results)).toBe(2);
    expect(streakBonusTotal(s.results)).toBe(100 + (s.results[2].score - s.results[2].baseScore));
  });

  it('starts every session with no streak', () => {
    const first = sessionReducer(started, { type: 'guess', guess: plan[0].year });
    expect(first.status === 'roundResult' && currentStreak(first.results)).toBe(1);
    const again = sessionReducer(sessionReducer(initialSession, { type: 'reset' }), { type: 'start', plan });
    expect(inRound(again).results).toEqual([]);
    expect(currentStreak(inRound(again).results)).toBe(0);
  });

  it('accepts early CE and BCE guesses', () => {
    expect(sessionReducer(started, { type: 'guess', guess: 19 }).status).toBe('roundResult');
    expect(sessionReducer(started, { type: 'guess', guess: -2540 }).status).toBe('roundResult');
  });

  it('ignores guesses outside the range', () => {
    expect(sessionReducer(started, { type: 'guess', guess: 2100 })).toBe(started);
    expect(sessionReducer(started, { type: 'guess', guess: -10000 })).toBe(started);
    expect(sessionReducer(started, { type: 'guess', guess: 1900.5 })).toBe(started);
  });

  it('ignores actions in the wrong state', () => {
    expect(sessionReducer(initialSession, { type: 'guess', guess: 1900 })).toBe(initialSession);
    expect(sessionReducer(started, { type: 'next' })).toBe(started);
    expect(sessionReducer(started, { type: 'start', plan })).toBe(started);
  });

  it('plays a full session: totals equal the sum of the rounds, then shows the summary', () => {
    let s: SessionState = started;
    for (let i = 0; i < plan.length; i++) {
      expect(s.status).toBe('inRound');
      s = sessionReducer(s, { type: 'guess', guess: plan[i].year + i });
      expect(s.status).toBe('roundResult');
      s = sessionReducer(s, { type: 'next' });
    }
    expect(s.status).toBe('summary');
    if (s.status === 'summary') {
      expect(s.results).toHaveLength(ROUNDS_PER_SESSION);
      expect(s.total).toBe(s.results.reduce((sum, r) => sum + r.score, 0));
      expect(s.total).toBe(totalScore(s.results));
      expect(new Set(s.results.map((r) => r.year)).size).toBe(ROUNDS_PER_SESSION);
    }
  });

  it('starts each new round with a fresh free clue', () => {
    let s = sessionReducer(started, { type: 'guess', guess: plan[0].year });
    s = sessionReducer(s, { type: 'next' });
    expect(inRound(s).roundIndex).toBe(1);
    expect(inRound(s).revealed).toEqual([plan[1].freeCategory]);
  });

  it('can start again from the summary, and reset to idle', () => {
    let s: SessionState = started;
    for (const p of plan) {
      s = sessionReducer(s, { type: 'guess', guess: p.year });
      s = sessionReducer(s, { type: 'next' });
    }
    expect(s.status).toBe('summary');
    expect(sessionReducer(s, { type: 'start', plan }).status).toBe('inRound');
    expect(sessionReducer(s, { type: 'reset' })).toEqual(initialSession);
  });
});

describe('parseGuess', () => {
  it('accepts CE years, including early ones', () => {
    expect(parseGuess('1970')).toEqual({ ok: true, year: 1970 });
    expect(parseGuess(' 1500 ')).toEqual({ ok: true, year: 1500 });
    expect(parseGuess('19')).toEqual({ ok: true, year: 19 });
    expect(parseGuess('1')).toEqual({ ok: true, year: 1 });
    expect(parseGuess('2026')).toEqual({ ok: true, year: 2026 });
    expect(parseGuess('800', 'CE')).toEqual({ ok: true, year: 800 });
  });
  it('stores BCE years as negative integers (1 BCE = 0)', () => {
    expect(parseGuess('1', 'BCE')).toEqual({ ok: true, year: 0 });
    expect(parseGuess('44', 'BCE')).toEqual({ ok: true, year: -43 });
    expect(parseGuess('2541', 'BCE')).toEqual({ ok: true, year: -2540 });
    expect(parseGuess('9999', 'BCE')).toEqual({ ok: true, year: -9998 });
  });
  it('gives the same message for every invalid guess, without revealing the range', () => {
    const invalid: [string, 'CE' | 'BCE'][] = [
      ['', 'CE'], ['   ', 'CE'], ['abc', 'CE'], ['0', 'CE'], ['0', 'BCE'], ['019', 'CE'], ['2027', 'CE'],
      ['99999', 'CE'], ['10000', 'BCE'], ['19.5', 'CE'], ['-300', 'CE'], ['1e3', 'CE'], ['12 3', 'BCE'],
    ];
    for (const [text, era] of invalid) {
      expect(parseGuess(text, era)).toEqual({ ok: false, message: 'Invalid answer' });
    }
  });
  it('defaults to CE', () => {
    expect(parseGuess('2026')).toEqual({ ok: true, year: 2026 });
    expect(parseGuess('2541').ok).toBe(false);
  });
});

describe('isTypeableGuess', () => {
  it('allows the empty field and plain numbers of up to four digits', () => {
    for (const text of ['', '1', '19', '800', '1969', '2026', '2027', '2541', '9999']) {
      expect(isTypeableGuess(text)).toBe(true);
    }
  });
  it('refuses letters, symbols, spaces, decimals, leading zeros and a fifth digit', () => {
    for (const text of ['a', '19a', '-', '1.5', ' 1', '1 ', '1e3', '0', '00', '019', '12345', '१९']) {
      expect(isTypeableGuess(text)).toBe(false);
    }
  });
  it('leaves the era check to parseGuess, so the same text can be valid in one era only', () => {
    expect(isTypeableGuess('2541')).toBe(true);
    expect(parseGuess('2541', 'CE').ok).toBe(false);
    expect(parseGuess('2541', 'BCE').ok).toBe(true);
  });
  it('accepts every number that parseGuess accepts, in either era', () => {
    for (let n = 1; n <= 9999; n++) {
      const text = String(n);
      expect(isTypeableGuess(text)).toBe(true);
      expect(parseGuess(text, 'BCE').ok).toBe(true);
      expect(parseGuess(text, 'CE').ok).toBe(n <= 2026);
    }
  });
});

describe('format', () => {
  it('formats BCE years from negative integers', () => {
    expect(formatYear(1969)).toBe('1969');
    expect(formatYear(0)).toBe('1 BCE');
    expect(formatYear(-43)).toBe('44 BCE');
  });
  it('describes distance in words', () => {
    expect(describeDistance(0)).toBe('Exact!');
    expect(describeDistance(1)).toBe('1 year off');
    expect(describeDistance(112)).toBe('112 years off');
  });
});
