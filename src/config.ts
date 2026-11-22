/** Every tunable value lives here. Do not hard-code these elsewhere. */

export const ROUNDS_PER_SESSION = 10;
export const MAX_ROUND_POINTS = 1000;
/** Cost of the 2nd, 3rd and 4th clue. */
export const REVEAL_COSTS = [100, 200, 300] as const;
/** Steepness of the scoring curve. Lower is harsher on small misses. */
export const SCALE_S = 0.5;
/** Years off at which a guess scores zero, when the tolerance is 1. */
export const MAX_DISTANCE = 500;
/** Fixed reference for the era tolerance. Never today's date, so scores do not drift over time. */
export const ERA_REFERENCE_YEAR = 2026;
/** Most lenient tolerance, approached by the very oldest years. */
export const ERA_MAX_TOLERANCE = 1.9;
/** Age (years before the reference year) at which the tolerance is half of its maximum. */
export const ERA_HALF_AGE = 128;
/** Floor for the tolerance, reached at 2020. */
export const ERA_MIN_TOLERANCE = 0.1;
/** The year where the tolerance is 1 (about 1884). Only used to explain the scoring on the result screen. */
export const ERA_NEUTRAL_YEAR = 1884;
/** Streak bonus per hit in a row. 0 switches streaks off. */
export const STREAK_BONUS_STEP = 0.1;
/** Largest streak bonus (0.3 is +30%). */
export const STREAK_BONUS_CAP = 0.3;
/** Accuracy at or above this extends the streak by one. */
export const STREAK_HIT_ACCURACY = 0.55;
/** Accuracy from here up to the hit line holds the streak. Lower resets it to 0. */
export const STREAK_HOLD_ACCURACY = 0.3;
/** Earliest year the content pool may cover (BCE years are negative: 1 BCE is 0, so 3001 BCE is -3000). */
export const YEAR_MIN = -3000;
/** Latest year the player can guess (CE). */
export const YEAR_MAX = 2026;
/** Furthest back the player can guess, in years BCE. */
export const MAX_BCE_GUESS = 9999;
/** The same limit as a stored year: BCE years are negative (1 BCE = 0, so 9999 BCE = -9998). */
export const GUESS_YEAR_MIN = 1 - MAX_BCE_GUESS;
export const LEADERBOARD_SIZE = 10;
/** Bump when scoring rules change. */
export const CONFIG_VERSION = 3;

export const CLUE_CATEGORIES = ['politics', 'society', 'technology', 'arts_culture'] as const;
export const MAX_CLUE_LENGTH = 140;

/** The one localStorage key the game uses. */
export const STORAGE_KEY = 'chronoguessr:v1:leaderboard';

/** Years that must be live (a verified clue in every category) before release. */
export const MIN_VERIFIED_YEARS = 100;
/** Content rule, checked by `npm run validate-content`. */
export const MAX_CONTEXT_LENGTH = 200;
