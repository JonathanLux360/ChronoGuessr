import years from './years.json';
import { buildLivePool } from '../game/selection';
import type { YearRecord } from '../game/types';
import { yearRecordSchema } from './schema';

/**
 * The live pool: verified clues only, in years that have one in every category.
 * `npm run validate-content` fails the build on any bad record, so the schema check here
 * only guards against a bad file reaching the browser. The assignment below also checks at
 * compile time that the schema matches `YearRecord`.
 */
export const livePool: YearRecord[] = buildLivePool(
  (years as unknown[]).flatMap((raw) => {
    const parsed = yearRecordSchema.safeParse(raw);
    if (!parsed.success) return [];
    const record: YearRecord = parsed.data;
    return [record];
  }),
);
