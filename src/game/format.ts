import { ERA_NAMES } from '../config';

/** BCE years are stored as negative integers: 0 is 1 BCE, so -43 is 44 BCE. */
export function formatYear(year: number): string {
  return year <= 0 ? `${1 - year} BCE` : String(year);
}

/** The distance in words: "Exact!", "1 year off", "112 years off". */
export function describeDistance(yearsOff: number): string {
  if (yearsOff === 0) return 'Exact!';
  return `${yearsOff} ${yearsOff === 1 ? 'year' : 'years'} off`;
}

/** Thousands separators for scores, for example 2,365. */
export function formatPoints(points: number): string {
  return points.toLocaleString('en-GB');
}

/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** For example "21 Nov 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The era a year belongs to, for example "ancient" or "modern". */
export function eraName(year: number): string {
  return (ERA_NAMES.find((era) => year < era.before) ?? ERA_NAMES[ERA_NAMES.length - 1]).name;
}

/**
 * Plain-words note on how strictly the round was graded, compared with a tolerance of 1.
 * Returns null when the difference is too small to mention.
 */
export function toleranceNote(tolerance: number, year: number): string | null {
  const percent = Math.round(Math.abs(tolerance - 1) * 100);
  if (percent < 1) return null;
  const era = eraName(year);
  const article = /^[aeiou]/.test(era) ? 'an' : 'a';
  const how = tolerance < 1 ? 'harshly' : 'leniently';
  return `This is ${article} ${era} year, so it was graded ${percent}% more ${how} than average.`;
}
