import { MAX_BCE_GUESS, YEAR_MAX } from '../config';

export type Era = 'CE' | 'BCE';

export type GuessParse = { ok: true; year: number } | { ok: false; message: string };

/** The one message shown for any invalid guess. It deliberately does not reveal the playable range. */
export const INVALID_GUESS_MESSAGE = 'Invalid answer';

/** The most digits a valid guess can have. */
export const MAX_GUESS_LENGTH = Math.max(String(YEAR_MAX).length, String(MAX_BCE_GUESS).length);

function largestNumber(era: Era): number {
  return era === 'CE' ? YEAR_MAX : MAX_BCE_GUESS;
}

/**
 * Converts a typed number and an era into the stored year.
 * BCE years are negative integers: 1 BCE is 0, so 44 BCE is -43.
 */
export function toYear(number: number, era: Era): number {
  return era === 'CE' ? number : 1 - number;
}

/** Turns what the player typed, plus the chosen era, into a stored year. */
export function parseGuess(text: string, era: Era = 'CE'): GuessParse {
  const trimmed = text.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return { ok: false, message: INVALID_GUESS_MESSAGE };
  const number = Number(trimmed);
  if (number > largestNumber(era)) return { ok: false, message: INVALID_GUESS_MESSAGE };
  return { ok: true, year: toYear(number, era) };
}

/**
 * True if `text` is empty or looks like a number the player could be typing: digits only,
 * no leading zero, and no longer than the longest valid year. The guess field refuses
 * any keystroke that breaks this (letters, symbols, spaces, a leading zero, a fifth digit).
 *
 * It does not depend on the era, because the player may type the number first and flip
 * the CE / BCE switch afterwards. Whether the number is valid for the chosen era is
 * checked on submit by `parseGuess`.
 */
export function isTypeableGuess(text: string): boolean {
  return text === '' || (/^[1-9]\d*$/.test(text) && text.length <= MAX_GUESS_LENGTH);
}
