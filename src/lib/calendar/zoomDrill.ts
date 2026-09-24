/** Shared-source rect for calendar drill zoom (window coordinates). */
export type ZoomSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Drill ladder steps (inbound kinds; reverse uses same kind + direction `'out'`). */
export type ZoomDrillKind = 'year-month' | 'month-week' | 'week-day';

export type ZoomDrillDirection = 'in' | 'out';

export type ZoomDrillRequest = {
  kind: ZoomDrillKind;
  /** `'in'` = parent cell → child body; `'out'` = reverse (progress plays 1→0). */
  direction: ZoomDrillDirection;
  /** Tapped parent cell / week row / day column (window coords). */
  source: ZoomSourceRect;
  /** Short label (month name, week range, day) — diagnostics / a11y only. */
  label: string;
  /** Destination body rect in window coords (measured calendar body host). */
  dest: ZoomSourceRect;
  /** Host that receives the live transform (usually same as dest / body). */
  host: ZoomSourceRect;
  /** Optional week-row or day-column index for sibling band fade. */
  focusIndex?: number;
};

/** Cached inbound geometry so climb can reverse-morph back to the tapped cell. */
export type ZoomDrillCacheEntry = {
  kind: ZoomDrillKind;
  source: ZoomSourceRect;
  dest: ZoomSourceRect;
  host: ZoomSourceRect;
  label: string;
  focusIndex?: number;
};

/** Snappy Apple-Calendar-like duration (~400–500ms). */
export const ZOOM_DRILL_MS = 420;

/** Stiff spring, high damping, no bounce/overshoot. */
export const ZOOM_DRILL_SPRING = {
  damping: 30,
  stiffness: 300,
  mass: 1,
  overshootClamping: true as const,
};

export function isValidZoomRect(rect: ZoomSourceRect | null | undefined): boolean {
  return (
    rect != null &&
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    rect.width > 1 &&
    rect.height > 1
  );
}

/**
 * Child view → reverse drill kind when climbing (`zoomUp`).
 * Day→Week, Week→Month, Month→Year.
 */
export function reverseDrillKind(activeView: string): ZoomDrillKind | null {
  switch (activeView) {
    case 'day':
      return 'week-day';
    case 'week':
    case 'multiday':
      return 'month-week';
    case 'month':
      return 'year-month';
    default:
      return null;
  }
}

/** Abbreviated month-style label for diagnostics (September → Sep). */
export function abbreviateDrillLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '';
  if (/\d/.test(trimmed) || /\s/.test(trimmed)) {
    const first = trimmed.split(/\s+/)[0] ?? trimmed;
    return first.length > 3 ? first.slice(0, 3) : first;
  }
  return trimmed.length > 3 ? trimmed.slice(0, 3) : trimmed;
}
