import { STREAK_BONUS_CAP, STREAK_BONUS_STEP, STREAK_HIT_ACCURACY, STREAK_HOLD_ACCURACY } from '../config';

export type StreakOutcome = 'extended' | 'held' | 'lost';

/** Score multiplier for a round that starts with a streak of `streak` hits in a row. */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.max(0, streak) * STREAK_BONUS_STEP, STREAK_BONUS_CAP);
}

/** What a round's accuracy does to the streak. Judged on accuracy, not on clues used. */
export function streakOutcome(accuracy: number): StreakOutcome {
  if (accuracy >= STREAK_HIT_ACCURACY) return 'extended';
  if (accuracy >= STREAK_HOLD_ACCURACY) return 'held';
  return 'lost';
}

/** The streak after a round with this accuracy. */
export function nextStreak(streak: number, accuracy: number): number {
  const outcome = streakOutcome(accuracy);
  if (outcome === 'extended') return streak + 1;
  return outcome === 'held' ? streak : 0;
}

/** True when the multiplier has reached its cap. */
export function isStreakCapped(streak: number): boolean {
  return STREAK_BONUS_STEP > 0 && streak * STREAK_BONUS_STEP >= STREAK_BONUS_CAP;
}

/** The bonus as a whole percentage, for display: 0.2 becomes 20. */
export function bonusPercent(streak: number): number {
  return Math.round((streakMultiplier(streak) - 1) * 100);
}
