/** Shared student-column header so heatmap and grade book match. */
export const studentHead = {
  height: 96,
  colWidth: 72,
  avatar: 56,
} as const;

/**
 * Phone landscape: half-size avatars + name. Shorter + slightly narrower so the
 * Assignment frozen column + student strip fit a sideways phone without a tall header.
 * Portrait / tablet keep `studentHead`.
 */
export const studentHeadLandscape = {
  height: 48,
  colWidth: 56,
  avatar: 28,
} as const;

/** StickyTable body row — portrait / tablet default (tap-friendly). */
export const tableRowHeightDefault = 44;
/**
 * Phone landscape body row — tighter so more assignments fit.
 * Keep ≥36 so marks stay tappable; target ~38.
 */
export const tableRowHeightLandscape = 38;

export type StudentHeadMetrics = {
  height: number;
  colWidth: number;
  avatar: number;
};

export type StudentHeadBreakpoint = 'phone-portrait' | 'phone-landscape' | 'tablet';

/** Pick header metrics for the current layout breakpoint. */
export function studentHeadFor(breakpoint: StudentHeadBreakpoint): StudentHeadMetrics {
  return breakpoint === 'phone-landscape' ? studentHeadLandscape : studentHead;
}

/**
 * True on phone landscape: tighter student head (half avatar) and heatmap legend collapse.
 * Avatars stay visible at `studentHeadLandscape.avatar`.
 */
export function studentHeadCompact(breakpoint: StudentHeadBreakpoint): boolean {
  return breakpoint === 'phone-landscape';
}

/** Body row height for gradebook + heatmap grids. Portrait unchanged at 44. */
export function tableRowHeight(breakpoint: StudentHeadBreakpoint): number {
  return breakpoint === 'phone-landscape' ? tableRowHeightLandscape : tableRowHeightDefault;
}
