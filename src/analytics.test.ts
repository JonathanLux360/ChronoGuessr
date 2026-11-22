import { afterEach, describe, expect, it, vi } from 'vitest';
import { track, trackReveal, trackSessionComplete, trackSessionStart } from './analytics';

type WithGoat = { goatcounter?: { count?: (vars: unknown) => void } };

afterEach(() => {
  delete (globalThis as WithGoat).goatcounter;
});

describe('analytics', () => {
  it('sends events to GoatCounter when it has loaded', () => {
    const count = vi.fn();
    (globalThis as WithGoat).goatcounter = { count };
    trackSessionStart();
    trackSessionComplete();
    expect(count).toHaveBeenNthCalledWith(1, { path: 'session-start', title: 'Session start', event: true });
    expect(count).toHaveBeenNthCalledWith(2, { path: 'session-complete', title: 'Session complete', event: true });
  });

  it('names reveals by category, and adds a first-reveal event', () => {
    const count = vi.fn();
    (globalThis as WithGoat).goatcounter = { count };
    trackReveal('arts_culture', true);
    trackReveal('politics', false);
    expect(count.mock.calls.map(([vars]) => (vars as { path: string }).path)).toEqual([
      'reveal-arts',
      'reveal-first-arts',
      'reveal-politics',
    ]);
  });

  it('does nothing, and does not throw, when GoatCounter is missing or blocked', () => {
    expect(() => track('session-start')).not.toThrow();
    (globalThis as WithGoat).goatcounter = {};
    expect(() => trackReveal('society', true)).not.toThrow();
    (globalThis as WithGoat).goatcounter = {
      count: () => {
        throw new Error('blocked');
      },
    };
    expect(() => trackSessionStart()).not.toThrow();
  });
});
