/** Every tunable value lives here. Do not hard-code these elsewhere. */

export const ROUNDS_PER_SESSION = 10;
export const MAX_ROUND_POINTS = 1000;
/** Cost of the 2nd, 3rd and 4th clue. */
export const REVEAL_COSTS = [100, 200, 300] as const;
/** Steepness of the scoring curve. Lower is harsher on small misses. */
export const SCALE_S = 0.5;
/** Years off at which a guess scores zero. */
export const MAX_DISTANCE = 500;
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
export const CONFIG_VERSION = 1;

export const CLUE_CATEGORIES = ['politics', 'society', 'technology', 'arts_culture'] as const;
export const MAX_CLUE_LENGTH = 140;

/** The one localStorage key the game uses. */
export const STORAGE_KEY = 'chronoguessr:v1:leaderboard';

/** Years that must be live (a verified clue in every category) before release. */
export const MIN_VERIFIED_YEARS = 100;
/** Content rule, checked by `npm run validate-content`. */
export const MAX_CONTEXT_LENGTH = 200;
