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
