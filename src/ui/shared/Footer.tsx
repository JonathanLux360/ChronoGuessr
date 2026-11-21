import styles from './Footer.module.css';

/** Shown at the bottom of every screen. */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>© 2026 ChronoGuessr. Created by Jonathan Topaz. All rights reserved.</p>
    </footer>
  );
}
