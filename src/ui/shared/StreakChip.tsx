import { bonusPercent, isStreakCapped } from '../../game/streak';
import styles from './StreakChip.module.css';

/**
 * Shows the streak and this round's bonus. The words always say what it is, so the colour is only a hint.
 * Three states: no streak (grey outline), building (gold tint), capped (dark gold fill, white text).
 */
export function StreakChip({ streak }: { streak: number }) {
  const state = streak <= 0 ? 'none' : isStreakCapped(streak) ? 'capped' : 'building';
  const className = `${styles.chip} ${state === 'building' ? styles.building : state === 'capped' ? styles.capped : ''}`;
  const label = streak <= 0 ? 'No streak' : `Streak ${streak} · +${bonusPercent(streak)}%`;
  return (
    <span className={className} data-streak-state={state}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3c.5 3-1.2 4.6-2.7 6.3C7.8 11 7 12.4 7 14.3A5 5 0 0 0 12 19.5a5 5 0 0 0 5-5.2c0-1.7-.8-3-1.7-4.1-.3 1.2-1 2-1.9 2.3.5-2.8-.2-6.5-1.4-9.5z" />
      </svg>
      {label}
    </span>
  );
}
