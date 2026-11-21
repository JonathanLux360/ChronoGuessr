import type { Category, Clue } from '../../game/types';
import { CATEGORY_LABELS, CategoryIcon, categoryKey } from './categories';
import styles from './ClueCard.module.css';

const CATEGORY_CLASS: Record<Category, string> = {
  politics: styles.politics,
  society: styles.society,
  technology: styles.technology,
  arts_culture: styles.arts,
};

interface RevealedProps {
  category: Category;
  clue: Clue;
  /** "Clue 1 · free", "Clue 2 · −100" and so on. */
  caption: string;
  /** Show the context line and source link (used on the result screen). */
  showDetail?: boolean;
}

export function RevealedClueCard({ category, clue, caption, showDetail = false }: RevealedProps) {
  const label = CATEGORY_LABELS[category];
  return (
    <article className={`${styles.card} ${styles.revealed} ${CATEGORY_CLASS[category]}`} aria-label={`${label} clue`}>
      <header className={styles.header}>
        <span className={`${styles.medallion} ${styles.solid}`}>
          <CategoryIcon category={category} />
        </span>
        <h3 className={styles.title}>{label}</h3>
        <span className={styles.caption}>{caption}</span>
      </header>
      <div className={styles.body}>
        <p className={styles.text}>{clue.text}</p>
        {showDetail && (
          <>
            {clue.context && <p className={styles.context}>{clue.context}</p>}
            <p className={styles.source}>
              <a href={clue.source} target="_blank" rel="noreferrer">
                Read more<span className="visually-hidden"> about the {label.toLowerCase()} clue (opens in a new tab)</span>
              </a>
            </p>
          </>
        )}
      </div>
    </article>
  );
}

interface HiddenProps {
  category: Category;
  /** Points taken off if the player reveals this clue. Null when no more reveals are allowed. */
  cost: number | null;
  /** Potential points after the reveal. */
  potentialAfter: number | null;
  onReveal: () => void;
}

export function HiddenClueCard({ category, cost, potentialAfter, onReveal }: HiddenProps) {
  const label = CATEGORY_LABELS[category];
  return (
    <article className={`${styles.card} ${styles.hidden} ${CATEGORY_CLASS[category]}`} aria-label={`${label} clue, hidden`}>
      <header className={styles.header}>
        <span className={`${styles.medallion} ${styles.outlined}`}>
          <CategoryIcon category={category} />
        </span>
        <h3 className={styles.title}>{label}</h3>
        <span className={styles.caption}>Hidden</span>
      </header>
      <div className={styles.body}>
        <p className={styles.placeholder}>Not revealed yet.</p>
        {cost !== null && potentialAfter !== null && (
          <button type="button" className={styles.revealButton} onClick={onReveal} aria-keyshortcuts={String(categoryKey(category))}>
            <span className={styles.keyBadge} aria-hidden="true">
              {categoryKey(category)}
            </span>
            <span className={styles.revealLabel}>Reveal {label}</span>
            <span className={styles.revealCost}>
              <span aria-hidden="true">
                −{cost} · {potentialAfter} left
              </span>
              <span className="visually-hidden">
                costs {cost} points, leaving {potentialAfter}
              </span>
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
