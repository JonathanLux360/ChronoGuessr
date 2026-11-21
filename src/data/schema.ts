import { z } from 'zod';
import { CLUE_CATEGORIES, MAX_CLUE_LENGTH, MAX_CONTEXT_LENGTH, YEAR_MAX, YEAR_MIN } from '../config';

/** Any decimal digit in any script, so "1969", "٣" and "２０" are all caught. */
const DIGIT = /\p{Nd}/u;

export const clueSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'clue text is empty')
      .max(MAX_CLUE_LENGTH, `clue text is over ${MAX_CLUE_LENGTH} characters`)
      .refine((t) => !DIGIT.test(t), 'clue text contains a digit (dates, ages and numbers belong in the context line)'),
    context: z.string().trim().min(1).max(MAX_CONTEXT_LENGTH, `context is over ${MAX_CONTEXT_LENGTH} characters`).optional(),
    region: z.string().trim().min(1, 'region is empty'),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)], {
      errorMap: () => ({ message: 'difficulty must be 1, 2 or 3' }),
    }),
    source: z
      .string()
      .url('source is not a valid URL')
      .refine((u) => u.startsWith('https://'), 'source must be an https:// URL'),
    /** Set to true only after a person has checked the date against the source. */
    verified: z.boolean(),
  })
  .strict();

const clueListSchema = z.array(clueSchema).min(1, 'needs at least one clue');

const cluesSchema = z
  .object(
    Object.fromEntries(CLUE_CATEGORIES.map((c) => [c, clueListSchema])) as Record<
      (typeof CLUE_CATEGORIES)[number],
      typeof clueListSchema
    >,
  )
  .strict();

/**
 * One year record: one or more clues per category. BCE years are negative integers (astronomical numbering),
 * so the schema accepts them as soon as `YEAR_MIN` is lowered.
 */
export const yearRecordSchema = z
  .object({
    year: z
      .number()
      .int('year must be a whole number')
      .min(YEAR_MIN, `year is before ${YEAR_MIN}`)
      .max(YEAR_MAX, `year is after ${YEAR_MAX}`),
    clues: cluesSchema,
  })
  .strict();

export type ParsedYearRecord = z.infer<typeof yearRecordSchema>;
