/**
 * Checks src/data/years.json against the content rules (see src/data/validate.ts).
 * Exits with a non-zero code on any error, so it fails the build.
 *
 *   npm run validate-content            errors fail; warnings are printed
 *   npm run validate-content:release    also fails if fewer than 100 years are live
 *                                     (a verified clue in every category)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validatePool } from '../src/data/validate';

const file = fileURLToPath(new URL('../src/data/years.json', import.meta.url));
const release = process.argv.includes('--release');

let data: unknown;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`Could not read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const report = validatePool(data, { requireMinimumLive: release });

if (report.warnings.length > 0) {
  console.warn(`Warnings (${report.warnings.length}):`);
  for (const warning of report.warnings) console.warn(`  ${warning}`);
}

if (report.errors.length > 0) {
  console.error(`Content validation failed with ${report.errors.length} error(s):`);
  for (const error of report.errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `Content OK: ${report.years.length} years, ${report.liveCount} live. ` +
    `${report.verifiedClueCount} of ${report.clueCount} clues verified.`,
);
