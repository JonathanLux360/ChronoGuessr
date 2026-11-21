import styles from './Brand.module.css';

/** The page title with gold rules either side, as on the round screen. */
export function Brand({ as: Tag = 'h1' }: { as?: 'h1' | 'p' }) {
  return <Tag className={styles.brand}>ChronoGuessr</Tag>;
}
