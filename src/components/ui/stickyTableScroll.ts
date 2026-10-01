/**
 * StickyTable horizontal scroll model.
 *
 * Body owns the only horizontal ScrollView. Header mirrors the same offset via
 * translateX so lag and end-bounce stay locked (no JS onScroll → scrollTo pair).
 */

/** Header content shift for a shared body contentOffset.x (incl. overscroll). */
export function stickyHeaderShiftX(contentOffsetX: number): number {
  // Avoid -0 so equality checks stay clean.
  return contentOffsetX === 0 ? 0 : -contentOffsetX;
}

/** True when offset is past either end (iOS rubber-band / Android glow range). */
export function stickyHScrollIsOverscrolling(
  contentOffsetX: number,
  maxOffsetX: number,
): boolean {
  const max = Math.max(0, maxOffsetX);
  return contentOffsetX < 0 || contentOffsetX > max;
}
