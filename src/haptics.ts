/**
 * Vibration for phones that support it (Chrome and Firefox on Android). iPhones and desktop browsers have no
 * vibration support, so every call here must quietly do nothing there, and never throw into the game.
 */
import { HAPTIC_PULSE_CYCLE_MS, HAPTIC_TAP_MS, SHINE_DURATION_MS } from './config';
import type { ResultTier } from './game/tier';

/**
 * A pattern that feels like a light fading in and out: pulses that grow longer, peak in the middle, then shrink
 * again. Odd entries are buzzes and even entries are gaps, as `navigator.vibrate` expects, and the whole pattern
 * lasts `totalMs`. Pure, so it can be tested.
 */
export function fadePattern(totalMs: number = SHINE_DURATION_MS, cycleMs: number = HAPTIC_PULSE_CYCLE_MS): number[] {
  const cycles = Math.max(1, Math.round(totalMs / cycleMs));
  const pattern: number[] = [];
  for (let i = 0; i < cycles; i++) {
    const strength = Math.sin((Math.PI * (i + 0.5)) / cycles); // 0 to 1 to 0 across the pattern
    const buzz = Math.max(4, Math.round(cycleMs * 0.9 * strength));
    pattern.push(buzz, cycleMs - buzz);
  }
  return pattern;
}

/** The vibration for a result tier, or null for none. */
export function hapticPattern(tier: ResultTier): number | number[] | null {
  if (tier === 'exact') return fadePattern();
  if (tier === 'extremelyClose') return HAPTIC_TAP_MS;
  return null;
}

/** True when the visitor has asked their device for less motion. */
export function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Vibrates after `delayMs` (so it can line up with the shine), and returns a function that cancels it.
 * Does nothing when the device cannot vibrate or the visitor prefers reduced motion.
 */
export function vibrateForTier(tier: ResultTier, delayMs: number = 0): () => void {
  const pattern = hapticPattern(tier);
  if (pattern === null || prefersReducedMotion()) return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fire = () => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Vibration must never break the game.
    }
  };
  if (delayMs > 0) timer = setTimeout(fire, delayMs);
  else fire();
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    try {
      navigator.vibrate?.(0); // Stop any buzz that is still running, for example when the player moves on early.
    } catch {
      // Ignore.
    }
  };
}
