/**
 * Day List soft rubber-band then commit adjacent day (Month List twin — CEO 2026-09-24).
 * Reuses the Month List commit math (CAL-P6-6B).
 */
import {
  CAL_P6_6B_COMMIT_OVERSCROLL_PX,
  CAL_P6_6B_EDGE_VELOCITY,
  monthListCommitDir,
} from './monthListBoundary.ts';

export const CAL_DAY_LIST_SOFT_BOUNDARY = 'CAL-DAY-LIST-SOFT' as const;
export { CAL_P6_6B_COMMIT_OVERSCROLL_PX as CAL_DAY_LIST_COMMIT_OVERSCROLL_PX };
export { CAL_P6_6B_EDGE_VELOCITY as CAL_DAY_LIST_EDGE_VELOCITY };

/** Same edge/velocity rules as Month List — dir −1 previous day, +1 next day. */
export function dayListCommitDir(args: Parameters<typeof monthListCommitDir>[0]): -1 | 1 | 0 {
  return monthListCommitDir(args);
}
