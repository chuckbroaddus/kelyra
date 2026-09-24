/** Shared-source rect for calendar drill zoom (window coordinates). */
export type ZoomSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ZoomDrillKind = 'year-month' | 'month-week' | 'week-day';

export type ZoomDrillRequest = {
  kind: ZoomDrillKind;
  source: ZoomSourceRect;
  /** Short label shown on the flying surface (month name, week range, day). */
  label: string;
  /** Destination body rect in window coords (measured calendar body host). */
  dest: ZoomSourceRect;
};

export const ZOOM_DRILL_MS = 340;
