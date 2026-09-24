/**
 * CAL-P6-9A / iOS back-gate: while the finger is on the PeriodPager drum stage,
 * disable interactive pop on the focused screen and parent stacks so LTR pages
 * the drum instead of popping Calendar. Reuses setSwipeRowStackGestures (same
 * parent-walk as open ListRow). Hold only for the gesture lifetime — not the
 * whole Calendar mount. Web setOptions is harmless.
 */
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { setSwipeRowStackGestures, type SwipeRowNavLike } from '@/lib/ui/swipeRowStackGestures';

export type DrumStackGestureGate = {
  /** Disable stack back gestures (idempotent while already held). */
  hold: () => void;
  /** Restore stack back gestures (idempotent; no-op if not held). */
  release: () => void;
};

/**
 * Finger-down on the drum → hold; finger-up / terminate / unmount → release.
 * Restoring on release (not spring rest) is correct — interactive pop only
 * races while the finger is down.
 */
export function useDrumStackGestureGate(): DrumStackGestureGate {
  const navigation = useNavigation();
  const gesturesHeld = useRef(false);

  const hold = useCallback(() => {
    if (gesturesHeld.current) return;
    gesturesHeld.current = true;
    setSwipeRowStackGestures(navigation as SwipeRowNavLike, false);
  }, [navigation]);

  const release = useCallback(() => {
    if (!gesturesHeld.current) return;
    gesturesHeld.current = false;
    setSwipeRowStackGestures(navigation as SwipeRowNavLike, true);
  }, [navigation]);

  useEffect(() => {
    return () => {
      if (!gesturesHeld.current) return;
      gesturesHeld.current = false;
      setSwipeRowStackGestures(navigation as SwipeRowNavLike, true);
    };
  }, [navigation]);

  return { hold, release };
}
