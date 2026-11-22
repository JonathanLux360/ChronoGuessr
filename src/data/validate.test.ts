import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_CLUE_LENGTH, MIN_VERIFIED_YEARS } from '../config';
import { validatePool } from './validate';

type Category = 'politics' | 'society' | 'technology' | 'arts_culture';
type FixtureClue = ReturnType<typeof makeClue>;
type Fixture = { year: number; clues: Record<Category, FixtureClue[]> };

function makeClue(text: string, overrides: Record<string, unknown> = {}) {
  return {
    text,
    context: 'A line of detail.',
    region: 'Africa',
    difficulty: 2,
    source: 'https://example.com/page',
    verified: true,
    ...overrides,
  };
}

/** Distinct, digit-free clue text for each year and category. */
function uniqueYear(year: number, overrides: Record<string, unknown> = {}): Fixture {
  const word = (n: number) => String.fromCharCode(97 + (n % 26));
  const tag = `${word(year)}${word(year >> 3)}${word(year >> 6)}${word(year >> 9)}`;
  return {
    year,
    clues: {
      politics: [makeClue(`Leaders meet at ${tag} for a treaty.`)],
      society: [makeClue(`Crowds gather at ${tag} for a festival.`)],
      technology: [makeClue(`An engineer shows a machine at ${tag}.`)],
      arts_culture: [makeClue(`A painter unveils a canvas at ${tag}.`)],
    },
    ...overrides,
  };
}

/** A year whose `category` holds exactly the given clues. */
function withClues(category: Category, clues: unknown, year = 1900) {
  const record = uniqueYear(year);
  return { ...record, clues: { ...record.clues, [category]: clues } };
}

function withClue(category: Category, clue: unknown, year = 1900) {
  return withClues(category, [clue], year);
}

describe('validatePool: valid content', () => {
  it('accepts a well-formed pool with no errors', () => {
    const report = validatePool([uniqueYear(1900), uniqueYear(1901)]);
    expect(report.errors).toEqual([]);
    expect(report.years).toHaveLength(2);
    expect(report.liveCount).toBe(2);
    expect(report.clueCount).toBe(8);
    expect(report.verifiedClueCount).toBe(8);
  });

  it('accepts a clue with no context line, with a warning', () => {
    const report = validatePool([withClue('politics', makeClue('Leaders meet at a hall for a treaty.', { context: undefined }))]);
    expect(report.errors).toEqual([]);
    expect(report.warnings.join('\n')).toMatch(/no context line/);
  });

  it('accepts several clues in a category', () => {
    const record = withClues('politics', [makeClue('First politics clue.'), makeClue('Second politics clue.'), makeClue('Third politics clue.')]);
    const report = validatePool([record]);
    expect(report.errors).toEqual([]);
    expect(report.clueCount).toBe(6);
  });

  it('does not care which regions a year draws on', () => {
    const record = uniqueYear(1900);
    for (const category of ['politics', 'society', 'technology', 'arts_culture'] as const) record.clues[category][0].region = 'Europe';
    const report = validatePool([record]);
    expect(report.errors).toEqual([]);
    expect(report.warnings.join('\n')).not.toMatch(/Europe/);
  });
});

describe('validatePool: breaches that must fail the build', () => {
  it.each([
    ['a digit', 'Leaders meet in 1900 for a treaty.', /contains a digit/],
    ['a single digit', 'Leaders meet for a treaty, round 2.', /contains a digit/],
    ['a full-width digit', 'Leaders meet for a treaty in ２０.', /contains a digit/],
    ['an Arabic-Indic digit', 'Leaders meet for a treaty in ٣.', /contains a digit/],
    ['text over the length limit', 'A'.repeat(MAX_CLUE_LENGTH + 1), /over 140 characters/],
    ['empty text', '', /empty/],
    ['blank text', '   ', /empty/],
  ])('rejects a clue with %s', (_name, text, message) => {
    const report = validatePool([withClue('society', makeClue(text))]);
    expect(report.errors.join('\n')).toMatch(message);
    expect(report.errors.join('\n')).toMatch(/Year 1900: clues\.society\.0\.text/);
  });

  it('checks every clue in a category, not just the first', () => {
    const report = validatePool([withClues('society', [makeClue('Fine.'), makeClue('Born in 1900.')])]);
    expect(report.errors.join('\n')).toMatch(/clues\.society\.1\.text: clue text contains a digit/);
  });

  it('accepts text of exactly the limit', () => {
    const report = validatePool([withClue('society', makeClue('A'.repeat(MAX_CLUE_LENGTH - 1) + '.'))]);
    expect(report.errors).toEqual([]);
  });

  it.each(['politics', 'society', 'technology', 'arts_culture'] as const)('rejects a year missing the %s category', (category) => {
    const record = uniqueYear(1900) as unknown as { clues: Record<string, unknown> };
    delete record.clues[category];
    expect(validatePool([record]).errors.join('\n')).toMatch(new RegExp(`clues\\.${category}`));
  });

  it('rejects a category with no clues', () => {
    expect(validatePool([withClues('technology', [])]).errors.join('\n')).toMatch(/clues\.technology: needs at least one clue/);
  });

  it('rejects a category that is a single clue instead of a list', () => {
    expect(validatePool([withClues('technology', makeClue('A machine appears.'))]).errors.length).toBeGreaterThan(0);
  });

  it('rejects an unknown category', () => {
    const record = uniqueYear(1900) as unknown as { clues: Record<string, unknown> };
    record.clues.sport = [makeClue('A team wins a cup.')];
    expect(validatePool([record]).errors.length).toBeGreaterThan(0);
  });

  it.each([
    ['a missing source', { source: undefined }],
    ['a source that is not a URL', { source: 'wikipedia' }],
    ['an http source', { source: 'http://example.com/page' }],
    ['a missing region', { region: undefined }],
    ['an empty region', { region: ' ' }],
    ['difficulty 0', { difficulty: 0 }],
    ['difficulty 4', { difficulty: 4 }],
    ['a text difficulty', { difficulty: 'hard' }],
    ['an over-long context', { context: 'c'.repeat(500) }],
    ['a missing verified flag', { verified: undefined }],
    ['a non-boolean verified flag', { verified: 'yes' }],
    ['an extra field', { note: 'checked' }],
  ])('rejects a clue with %s', (_name, overrides) => {
    const report = validatePool([withClue('technology', makeClue('An engineer shows a machine.', overrides))]);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it.each([
    ['a missing year', { year: undefined }],
    ['a non-integer year', { year: 1900.5 }],
    ['a string year', { year: '1900' }],
    ['a year before the earliest allowed', { year: -3001 }],
    ['a year after the range', { year: 3000 }],
    ['an extra field', { note: 'checked' }],
    ['the old year-level verified flag', { verified: true }],
  ])('rejects a record with %s', (_name, overrides) => {
    expect(validatePool([uniqueYear(1900, overrides)]).errors.length).toBeGreaterThan(0);
  });

  it('rejects a repeated year', () => {
    const report = validatePool([uniqueYear(1900), { ...uniqueYear(1900) }]);
    expect(report.errors.join('\n')).toMatch(/Year 1900: appears more than once/);
  });

  it('rejects a clue text used twice in different years', () => {
    const a = uniqueYear(1900);
    const b = withClue('politics', makeClue(a.clues.politics[0].text.toUpperCase()), 1901);
    expect(validatePool([a, b]).errors.join('\n')).toMatch(/same as a clue in year 1900/);
  });

  it('rejects a clue text used twice in the same category', () => {
    const report = validatePool([withClues('politics', [makeClue('Same clue.'), makeClue('Same clue.')])]);
    expect(report.errors.join('\n')).toMatch(/politics\[1\]: clue text is the same as a clue in year 1900/);
  });

  it('rejects content that is not a list, or not even an object', () => {
    for (const bad of [null, {}, 'years', 42, undefined]) {
      expect(validatePool(bad).errors.length).toBeGreaterThan(0);
    }
    expect(validatePool([null, 'x', 7]).errors.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps reporting after the first error, and still returns the good records', () => {
    const report = validatePool([uniqueYear(1900), withClue('society', makeClue('Born in 1900.'), 1901), uniqueYear(1902)]);
    expect(report.errors.length).toBe(1);
    expect(report.years.map((y) => y.year)).toEqual([1900, 1902]);
  });
});

describe('validatePool: verification and the live pool', () => {
  it('counts a year as live when every category has a verified clue', () => {
    const record = withClues('politics', [makeClue('Draft clue.', { verified: false }), makeClue('Checked clue.')]);
    const report = validatePool([record]);
    expect(report.liveCount).toBe(1);
    expect(report.clueCount).toBe(5);
    expect(report.verifiedClueCount).toBe(4);
    expect(report.warnings.join('\n')).not.toMatch(/not live yet/);
  });

  it('warns about a year that is not live, and does not count it', () => {
    const record = withClue('society', makeClue('Draft clue.', { verified: false }));
    const report = validatePool([record]);
    expect(report.errors).toEqual([]);
    expect(report.liveCount).toBe(0);
    expect(report.warnings.join('\n')).toMatch(/Year 1900: not live yet, no verified clue for society/);
  });

  it('lists every category that is missing a verified clue', () => {
    const record = uniqueYear(1900);
    record.clues.politics[0].verified = false;
    record.clues.arts_culture[0].verified = false;
    expect(validatePool([record]).warnings.join('\n')).toMatch(/for politics, arts_culture/);
  });
});

describe('validatePool: warnings and the live minimum', () => {
  it('warns about style problems without failing', () => {
    const report = validatePool([withClue('society', makeClue('crowds gather without punctuation'))]);
    expect(report.errors).toEqual([]);
    expect(report.warnings.join('\n')).toMatch(/capital letter/);
    expect(report.warnings.join('\n')).toMatch(/full stop/);
  });

  it('warns about a small live pool, and fails on it only for a release build', () => {
    const pool = [uniqueYear(1900), withClue('society', makeClue('Draft clue.', { verified: false }), 1901)];
    expect(validatePool(pool).errors).toEqual([]);
    expect(validatePool(pool).warnings.join('\n')).toMatch(/Only 1 live years/);
    expect(validatePool(pool, { requireMinimumLive: true }).errors.join('\n')).toMatch(new RegExp(`at least ${MIN_VERIFIED_YEARS}`));
  });

  it('passes a release build with enough live years', () => {
    const pool = Array.from({ length: MIN_VERIFIED_YEARS }, (_, i) => uniqueYear(1500 + i));
    expect(validatePool(pool, { requireMinimumLive: true }).errors).toEqual([]);
  });
});

describe('the real content file', () => {
  it('passes every content rule', () => {
    const file = new URL('./years.json', import.meta.url);
    const report = validatePool(JSON.parse(readFileSync(file, 'utf8')));
    expect(report.errors).toEqual([]);
  });

  it('has enough live years to release', () => {
    const file = new URL('./years.json', import.meta.url);
    const report = validatePool(JSON.parse(readFileSync(file, 'utf8')), { requireMinimumLive: true });
    expect(report.errors).toEqual([]);
  });
});
