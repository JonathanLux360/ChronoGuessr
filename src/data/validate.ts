/**
 * Checks the content pool against the content rules. Pure: it takes the parsed JSON and
 * returns errors (which fail the build) and warnings (which do not).
 */
import { CLUE_CATEGORIES, MIN_VERIFIED_YEARS } from '../config';
import { buildLivePool } from '../game/selection';
import type { YearRecord } from '../game/types';
import { yearRecordSchema, type ParsedYearRecord } from './schema';

export interface ValidationReport {
  errors: string[];
  warnings: string[];
  /** Records that passed the schema, in file order. */
  years: ParsedYearRecord[];
  /** Years with at least one verified clue in every category: the years a player can get. */
  liveCount: number;
  /** Clues across the whole file, and how many of them are verified. */
  clueCount: number;
  verifiedClueCount: number;
}

export interface ValidateOptions {
  /** Treat "fewer than MIN_VERIFIED_YEARS live years" as an error. Used for release builds. */
  requireMinimumLive?: boolean;
}

function label(raw: unknown, index: number): string {
  const year = typeof raw === 'object' && raw !== null ? (raw as { year?: unknown }).year : undefined;
  return typeof year === 'number' ? `Year ${year}` : `Record ${index + 1}`;
}

export function validatePool(data: unknown, options: ValidateOptions = {}): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    return {
      errors: ['The content file must contain a list of year records.'],
      warnings,
      years: [],
      liveCount: 0,
      clueCount: 0,
      verifiedClueCount: 0,
    };
  }

  const years: ParsedYearRecord[] = [];
  data.forEach((raw: unknown, index: number) => {
    const parsed = yearRecordSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${label(raw, index)}: ${issue.path.join('.') || '(record)'}: ${issue.message}`);
      }
      return;
    }
    years.push(parsed.data);
  });

  // Rules that need the whole pool.
  const seenYears = new Set<number>();
  const seenText = new Map<string, number>();
  let clueCount = 0;
  let verifiedClueCount = 0;

  for (const record of years) {
    if (seenYears.has(record.year)) errors.push(`Year ${record.year}: appears more than once.`);
    seenYears.add(record.year);

    const missing: string[] = [];
    for (const category of CLUE_CATEGORIES) {
      if (!record.clues[category].some((c) => c.verified)) missing.push(category);

      record.clues[category].forEach((clue, i) => {
        clueCount++;
        if (clue.verified) verifiedClueCount++;
        const where = `Year ${record.year}: ${category}[${i}]`;

        const key = clue.text.trim().toLowerCase();
        const previous = seenText.get(key);
        if (previous !== undefined) errors.push(`${where}: clue text is the same as a clue in year ${previous}.`);
        else seenText.set(key, record.year);

        if (!/^\p{Lu}/u.test(clue.text)) warnings.push(`${where}: clue should start with a capital letter.`);
        if (!/[.!?]$/.test(clue.text)) warnings.push(`${where}: clue should end with a full stop.`);
        if (clue.context === undefined) warnings.push(`${where}: no context line.`);
      });
    }
    if (missing.length > 0) {
      warnings.push(`Year ${record.year}: not live yet, no verified clue for ${missing.join(', ')}.`);
    }
  }

  const liveCount = buildLivePool(years as YearRecord[]).length;
  if (liveCount < MIN_VERIFIED_YEARS) {
    const message = `Only ${liveCount} live years. The pool needs at least ${MIN_VERIFIED_YEARS}.`;
    if (options.requireMinimumLive) errors.push(message);
    else warnings.push(message);
  }

  return { errors, warnings, years, liveCount, clueCount, verifiedClueCount };
}
