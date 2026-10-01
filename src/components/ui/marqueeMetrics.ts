/** Collapsed chrome (search expand) can report a 2–8 pt clip. Ignore it so a short title does not start crawling. */
export const MARQUEE_MIN_CLIP = 24;
/**
 * Hairline epsilon only — real glyph overflow must marquee.
 * Was 8 (header reflow slop); that left names like "Jamal" clipped as "Jama" with no crawl.
 * Design §30.2 uses +2; keep 1 so sub-pixel fit stays static and any visible clip scrolls.
 */
export const MARQUEE_OVERFLOW_SLACK = 1;

export function marqueeMetrics(clipWidth: number, textWidth: number, speed = 30) {
  const overflowing = clipWidth >= MARQUEE_MIN_CLIP && textWidth > clipWidth + MARQUEE_OVERFLOW_SLACK;
  const distance = Math.max(0, textWidth - clipWidth);
  const duration = (distance / Math.max(1, speed)) * 1000;
  return { distance, duration, overflowing };
}
