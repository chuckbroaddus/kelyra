/** Collapsed chrome (search expand) can report a 2–8 pt clip. Ignore it so a short title does not start crawling. */
export const MARQUEE_MIN_CLIP = 24;
/** Header reflow on push/pop is a few pixels. Real overflow is clearly more than a hairline. */
export const MARQUEE_OVERFLOW_SLACK = 8;

export function marqueeMetrics(clipWidth: number, textWidth: number, speed = 30) {
  const overflowing = clipWidth >= MARQUEE_MIN_CLIP && textWidth > clipWidth + MARQUEE_OVERFLOW_SLACK;
  const distance = Math.max(0, textWidth - clipWidth);
  const duration = (distance / Math.max(1, speed)) * 1000;
  return { distance, duration, overflowing };
}
