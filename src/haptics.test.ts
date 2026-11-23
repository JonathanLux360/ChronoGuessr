import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HAPTIC_PULSE_CYCLE_MS, HAPTIC_TAP_MS, SHINE_DELAY_MS, SHINE_DURATION_MS } from './config';
import { fadePattern, hapticPattern, vibrateForTier } from './haptics';

describe('fadePattern', () => {
  const pattern = fadePattern();
  const buzzes = pattern.filter((_, i) => i % 2 === 0);

  it('lasts about as long as the shine', () => {
    const total = pattern.reduce((sum, ms) => sum + ms, 0);
    expect(Math.abs(total - SHINE_DURATION_MS)).toBeLessThanOrEqual(HAPTIC_PULSE_CYCLE_MS);
  });

  it('is whole buzz and gap pairs, starting with a buzz', () => {
    expect(pattern.length % 2).toBe(0);
    expect(pattern.every((ms) => Number.isInteger(ms) && ms > 0)).toBe(true);
  });

  it('fades in, peaks in the middle, then fades out', () => {
    const peak = buzzes.indexOf(Math.max(...buzzes));
    expect(Math.abs(peak - buzzes.length / 2)).toBeLessThanOrEqual(1);
    expect(buzzes[0]).toBeLessThan(buzzes[peak] / 3);
    expect(buzzes[buzzes.length - 1]).toBeLessThan(buzzes[peak] / 3);
    for (let i = 1; i <= peak; i++) expect(buzzes[i]).toBeGreaterThanOrEqual(buzzes[i - 1]);
  });
});

describe('hapticPattern', () => {
  it('gives each tier its own feel', () => {
    expect(hapticPattern('exact')).toEqual(fadePattern());
    expect(hapticPattern('extremelyClose')).toBe(HAPTIC_TAP_MS);
    expect(hapticPattern('close')).toBeNull();
    expect(hapticPattern('miss')).toBeNull();
  });
});

describe('vibrateForTier', () => {
  const vibrate = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vibrate.mockReset();
    vi.stubGlobal('navigator', { vibrate });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits for the delay, so the buzz lines up with the shine', () => {
    vibrateForTier('exact', SHINE_DELAY_MS);
    expect(vibrate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SHINE_DELAY_MS);
    expect(vibrate).toHaveBeenCalledWith(fadePattern());
  });

  it('taps straight away for an extremely close guess', () => {
    vibrateForTier('extremelyClose');
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_TAP_MS);
  });

  it('does nothing for a close guess or a miss', () => {
    vibrateForTier('close');
    vibrateForTier('miss');
    vi.runAllTimers();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('can be cancelled before it fires', () => {
    const cancel = vibrateForTier('exact', SHINE_DELAY_MS);
    cancel();
    vi.runAllTimers();
    expect(vibrate).not.toHaveBeenCalledWith(fadePattern());
  });

  it('does nothing when the device cannot vibrate', () => {
    vi.stubGlobal('navigator', {});
    expect(() => vibrateForTier('extremelyClose')).not.toThrow();
  });

  it('does nothing when the visitor prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vibrateForTier('extremelyClose');
    expect(vibrate).not.toHaveBeenCalled();
  });
});
