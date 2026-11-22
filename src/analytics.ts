/**
 * Anonymous, cookieless analytics through GoatCounter. It counts events only, never guesses or years.
 *
 * Ad blockers stop the GoatCounter script from loading, so `window.goatcounter` may not exist. Every call here
 * must do nothing in that case, and must never throw into the game.
 */
import type { Category } from './game/types';

interface GoatCounter {
  count?: (vars: { path: string; title?: string; event?: boolean }) => void;
}

/** The short name used for each category in event names. */
const EVENT_CATEGORY: Record<Category, string> = {
  politics: 'politics',
  society: 'society',
  technology: 'technology',
  arts_culture: 'arts',
};

/** Sends one named event, if GoatCounter has loaded. */
export function track(name: string, title: string = name): void {
  try {
    const goatcounter = (globalThis as { goatcounter?: GoatCounter }).goatcounter;
    goatcounter?.count?.({ path: name, title, event: true });
  } catch {
    // Analytics must never break the game.
  }
}

export function trackSessionStart(): void {
  track('session-start', 'Session start');
}

export function trackSessionComplete(): void {
  track('session-complete', 'Session complete');
}

/**
 * A clue reveal. `isFirstReveal` is true for the first clue the player chooses in a round (the free clue
 * does not count), which also sends `reveal-first-<category>`.
 */
export function trackReveal(category: Category, isFirstReveal: boolean): void {
  const name = EVENT_CATEGORY[category];
  track(`reveal-${name}`, `Reveal ${name}`);
  if (isFirstReveal) track(`reveal-first-${name}`, `First reveal ${name}`);
}
