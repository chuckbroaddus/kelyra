/**
 * Pure snap decisions for WorkRow / ListRow PanResponders.
 * When open, the row claims onStart (to block stack back), so taps never reach
 * Pressable — release must treat a near-zero move as tap-to-close. Close also
 * keys off swipe direction/velocity from the grant offset, not only absolute x.
 */

export const SWIPE_TILE = 80;
export const SNAP_OPEN_PX = 56;
export const CLOSE_DX_PX = 40;
export const CLOSE_VX = 0.35;
export const TAP_SLOP_PX = 8;

export type SwipeSnapGesture = {
  dx: number;
  dy: number;
  vx: number;
};

export type SwipeSnapArgs = {
  /** translateX when the gesture was granted (after stopAnimation). */
  grantX: number;
  /** Unclamped grantX + dx at release. */
  offset: number;
  gesture: SwipeSnapGesture;
  leadCount: number;
  trailCount: number;
  rowWidth: number;
};

export type SwipeSnapResult =
  | { kind: 'snap'; to: number }
  | { kind: 'auto'; side: 'lead' | 'trail' };

function isTap(g: SwipeSnapGesture): boolean {
  return Math.abs(g.dx) < TAP_SLOP_PX && Math.abs(g.dy) < TAP_SLOP_PX;
}

/** Decide snap / auto-commit target after pan release. */
export function decideSwipeSnap(args: SwipeSnapArgs): SwipeSnapResult {
  const { grantX, offset, gesture, leadCount, trailCount, rowWidth } = args;
  const maxL = leadCount * SWIPE_TILE;
  const maxR = trailCount * SWIPE_TILE;
  const full = Math.max(120, 0.4 * (rowWidth || 320));

  // Claimed-on-start while open: Pressable never sees the press.
  if (grantX !== 0 && isTap(gesture)) {
    return { kind: 'snap', to: 0 };
  }

  // Trailing open — LTR (or velocity) closes without needing almost-fully-closed x.
  if (grantX < 0 && trailCount > 0) {
    const shouldClose =
      gesture.dx > CLOSE_DX_PX ||
      gesture.vx > CLOSE_VX ||
      offset > -SNAP_OPEN_PX;
    return { kind: 'snap', to: shouldClose ? 0 : -maxR };
  }

  // Leading open — RTL closes.
  if (grantX > 0 && leadCount > 0) {
    const shouldClose =
      gesture.dx < -CLOSE_DX_PX ||
      gesture.vx < -CLOSE_VX ||
      offset < SNAP_OPEN_PX;
    return { kind: 'snap', to: shouldClose ? 0 : maxL };
  }

  // Closed (or near-closed) — open / auto-commit / snap-back.
  if (offset > 0 && leadCount > 0) {
    if (offset > full) {
      return { kind: 'auto', side: 'lead' };
    }
    return { kind: 'snap', to: offset > SNAP_OPEN_PX ? maxL : 0 };
  }
  if (offset < 0 && trailCount > 0) {
    if (offset < -full) {
      return { kind: 'auto', side: 'trail' };
    }
    return { kind: 'snap', to: offset < -SNAP_OPEN_PX ? -maxR : 0 };
  }
  return { kind: 'snap', to: 0 };
}

/** After a stolen/terminated gesture, snap to nearest resting open or closed. */
export function decideSwipeTerminate(openOffset: number, leadCount: number, trailCount: number): number {
  const maxL = leadCount * SWIPE_TILE;
  const maxR = trailCount * SWIPE_TILE;
  if (openOffset < -SNAP_OPEN_PX && maxR) return -maxR;
  if (openOffset > SNAP_OPEN_PX && maxL) return maxL;
  return 0;
}
