/**
 * CAL-P6-6B — Month List soft rubber-band then commit adjacent month.
 */
import {
  CAL_P6_6B_COMMIT_OVERSCROLL_PX,
  CAL_P6_6B_SOFT_BOUNDARY,
} from './p6Laws.ts';

export { CAL_P6_6B_SOFT_BOUNDARY, CAL_P6_6B_COMMIT_OVERSCROLL_PX };

/** Fling speed at a hard edge (no rubber-band platforms) that counts as intentional pull. */
export const CAL_P6_6B_EDGE_VELOCITY = 0.85;

/**
 * Decide month commit after a scroll settle.
 * Prefers measured rubber-band overscroll; falls back to edge + outward velocity
 * when the platform clamps contentOffset (Android / some web).
 */
export function monthListCommitDir(args: {
  overscrollPx: number;
  y: number;
  maxY: number;
  velocityY?: number;
  thresholdPx?: number;
  velocityThreshold?: number;
}): -1 | 1 | 0 {
  const threshold = args.thresholdPx ?? CAL_P6_6B_COMMIT_OVERSCROLL_PX;
  const vThresh = args.velocityThreshold ?? CAL_P6_6B_EDGE_VELOCITY;
  const over = args.overscrollPx;
  if (over <= -threshold) return -1;
  if (over >= threshold) return 1;

  const y = args.y;
  const maxY = Math.max(0, args.maxY);
  const vy = args.velocityY ?? 0;
  // Match hideOnScroll: positive vy = contentOffset increasing (reading down);
  // negative vy = contentOffset decreasing (pull toward / past start).
  // At top, pull past start (negative vy) → previous month.
  if (y <= 0.5 && vy <= -vThresh) return -1;
  // At bottom, push past end (positive vy) → next month.
  if (y >= maxY - 0.5 && vy >= vThresh) return 1;
  return 0;
}
