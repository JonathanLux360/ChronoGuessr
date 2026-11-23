import { streakOutcome } from './streak';

/**
 * How close a round was, for the result screen's look and feel. It is only a label for the player:
 * it never changes a score or a streak.
 *
 * - exact: no years off.
 * - extremelyClose: accuracy at or above the streak hit line (the streak goes up).
 * - close: accuracy between the near-miss line and the hit line (the streak is held).
 * - miss: anything lower (the streak resets).
 */
export type ResultTier = 'exact' | 'extremelyClose' | 'close' | 'miss';

export function resultTier(yearsOff: number, accuracy: number): ResultTier {
  if (yearsOff === 0) return 'exact';
  const outcome = streakOutcome(accuracy);
  if (outcome === 'extended') return 'extremelyClose';
  return outcome === 'held' ? 'close' : 'miss';
}

/** The headline for a tier. A miss has no special name, so it returns null and the screen shows the distance. */
export function tierHeadline(tier: ResultTier): string | null {
  switch (tier) {
    case 'exact':
      return 'Exact!';
    case 'extremelyClose':
      return 'Extremely close!';
    case 'close':
      return 'Close!';
    case 'miss':
      return null;
  }
}
