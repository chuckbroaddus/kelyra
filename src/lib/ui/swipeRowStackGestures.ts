/** Minimal nav surface for walking parent stacks (testable without RN). */
export type SwipeRowNavLike = {
  setOptions: (options: Record<string, unknown>) => void;
  getParent?: () => SwipeRowNavLike | undefined;
};

/**
 * Disable / restore interactive pop on the focused screen **and** every parent
 * navigator. Nested Expo Router stacks (root → class → assignments) otherwise
 * leave the outer full-screen back gesture enabled, so LTR while a row is open
 * pops the whole class instead of closing Preview/Delete.
 */
export function setSwipeRowStackGestures(navigation: SwipeRowNavLike, enabled: boolean): void {
  const opts = {
    gestureEnabled: enabled,
    fullScreenGestureEnabled: enabled,
  };
  const seen = new Set<SwipeRowNavLike>();
  let nav: SwipeRowNavLike | undefined = navigation;
  while (nav && !seen.has(nav)) {
    seen.add(nav);
    try {
      nav.setOptions(opts);
    } catch {
      // Navigator may already be unmounted.
    }
    nav = typeof nav.getParent === 'function' ? nav.getParent() : undefined;
  }
}
