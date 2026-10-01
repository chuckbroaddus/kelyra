/**
 * Header wordmark fit (docs/ui-design.md §3.2). The title slot is what is left after the
 * logo / Ask mark and the 44 pt buttons, so on a phone it can be under 100 pt. The title
 * steps its font down to fit, never below HEADER_TITLE_MIN_SIZE. If it still does not fit
 * it ends in an ellipsis on the right. It never crawls, so the first letters always show.
 */
export const HEADER_TITLE_MIN_SIZE = 15;

/** Measurement noise / sub-pixel rounding. */
const SLACK = 0.5;

export function fitHeaderTitleSize(
  clipWidth: number,
  textWidth: number,
  baseSize: number,
  minSize: number = HEADER_TITLE_MIN_SIZE,
): { fontSize: number; truncated: boolean } {
  const floor = Math.min(minSize, baseSize);
  if (!(clipWidth > 0) || !(textWidth > 0) || textWidth <= clipWidth + SLACK) {
    return { fontSize: baseSize, truncated: false };
  }
  // Width scales linearly with font size. Step in half points so it renders crisply.
  const ideal = Math.floor(((baseSize * clipWidth) / textWidth) * 2) / 2;
  if (ideal >= floor) return { fontSize: ideal, truncated: false };
  return { fontSize: floor, truncated: true };
}
