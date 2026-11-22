/** The smallest span, in years, that the result timeline shows. */
export const MIN_TIMELINE_SPAN = 100;

/**
 * The years at either end of the result timeline. It is centred between the answer and the guess,
 * a little wider than the gap between them, never narrower than MIN_TIMELINE_SPAN years, and
 * rounded outwards to whole tens so the end labels look tidy. It works for any era, BCE included.
 */
export function timelineRange(answer: number, guess: number): { lo: number; hi: number } {
  const gap = Math.abs(answer - guess);
  const span = Math.max(gap * 1.3, MIN_TIMELINE_SPAN);
  const centre = (answer + guess) / 2;
  return {
    lo: Math.floor((centre - span / 2) / 10) * 10,
    hi: Math.ceil((centre + span / 2) / 10) * 10,
  };
}
