import { describe, expect, it } from 'vitest';
import { STREAK_HIT_ACCURACY, STREAK_HOLD_ACCURACY } from '../config';
import { describeDistance } from './format';
import { accuracy } from './scoring';
import { resultTier, tierHeadline } from './tier';

describe('resultTier', () => {
  it('is exact only when there are no years off, whatever the accuracy', () => {
    expect(resultTier(0, 1)).toBe('exact');
    expect(resultTier(0, 0)).toBe('exact');
  });

  it('follows the streak bands for everything else', () => {
    expect(resultTier(1, STREAK_HIT_ACCURACY)).toBe('extremelyClose');
    expect(resultTier(1, STREAK_HIT_ACCURACY - 0.01)).toBe('close');
    expect(resultTier(1, STREAK_HOLD_ACCURACY)).toBe('close');
    expect(resultTier(1, STREAK_HOLD_ACCURACY - 0.01)).toBe('miss');
    expect(resultTier(1, 0)).toBe('miss');
  });

  it('matches real rounds (answer 1884, so a tolerance of about 1)', () => {
    const tierFor = (off: number) => resultTier(off, accuracy(off, 1884));
    expect(tierFor(0)).toBe('exact');
    expect(tierFor(3)).toBe('extremelyClose');
    expect(tierFor(10)).toBe('close'); // accuracy about 0.56
    expect(tierFor(100)).toBe('miss');
  });
});

describe('tierHeadline', () => {
  it('names the three celebrated tiers', () => {
    expect(tierHeadline('exact')).toBe('Exact!');
    expect(tierHeadline('extremelyClose')).toBe('Extremely close!');
    expect(tierHeadline('close')).toBe('Close!');
  });

  it('has no special name for a miss, so the screen falls back to the distance', () => {
    expect(tierHeadline('miss')).toBeNull();
    expect(describeDistance(112)).toBe('112 years off');
  });
});
