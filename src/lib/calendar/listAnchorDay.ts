/**
 * CAL-P6-5C — shared Day List period SoT (`listAnchorDay`).
 * List scroll and drum pan both write; the other view is a pure projection.
 * Center drum leaf = day at top of list viewport.
 *
 * Painted window origin is separate from listAnchorDay so settling/snapping
 * never rebuilds the range under the viewport without a matching scroll reset.
 */
import { agendaRangeFrom, shiftDay } from './day.ts';
import { CAL_P6_5C_LIST_ANCHOR } from './p6Laws.ts';

export { CAL_P6_5C_LIST_ANCHOR };

/** Continuous Day List painted length (CAL-R5-11 density A spirit). */
export const DAY_LIST_WINDOW_DAYS = 14;

export type DaySectionOffset = { day: string; y: number };

/**
 * Pick the top-of-viewport day from measured section offsets + scrollY.
 * Sections should be sorted by y ascending.
 */
export function listAnchorDayFromScroll(
  sections: DaySectionOffset[],
  scrollY: number,
  /** Sticky header / pin band inset above list content (pt). */
  topInset = 0,
): string | null {
  if (!sections.length) return null;
  const y = Math.max(0, scrollY) + topInset + 1;
  let current = sections[0]!.day;
  for (const section of sections) {
    if (section.y <= y) current = section.day;
    else break;
  }
  return current;
}

/** Scroll Y that places `day` at the top of the list viewport. */
export function scrollYForListAnchorDay(
  sections: DaySectionOffset[],
  day: string,
): number | null {
  const hit = sections.find((s) => s.day === day);
  return hit ? Math.max(0, hit.y) : null;
}

export function dayListWindowDays(
  origin: string,
  windowDays: number = DAY_LIST_WINDOW_DAYS,
): string[] {
  return agendaRangeFrom(origin, windowDays).days;
}

export function dayInListWindow(
  origin: string,
  day: string,
  windowDays: number = DAY_LIST_WINDOW_DAYS,
): boolean {
  return dayListWindowDays(origin, windowDays).includes(day);
}

/**
 * Keep painted origin stable while `target` stays inside the window.
 * If target falls outside, rebase origin onto target (scroll must reset to that header).
 */
export function dayListOriginForTarget(
  origin: string,
  target: string,
  windowDays: number = DAY_LIST_WINDOW_DAYS,
): string {
  if (dayInListWindow(origin, target, windowDays)) return origin;
  return target;
}

export type DayListDrumShiftPlan = {
  nextAnchor: string;
  nextOrigin: string;
  /** `section` = scroll using current layout; `zero` = window rebased, scroll to new origin header. */
  scroll: 'section' | 'zero';
};

/**
 * Pure drum → list projection plan (CAL-P6-5C-04).
 * Does not mutate React state — caller applies anchor/origin then scrolls.
 */
export function planDayListDrumShift(args: {
  origin: string;
  anchor: string;
  steps: number;
  windowDays?: number;
}): DayListDrumShiftPlan {
  const windowDays = args.windowDays ?? DAY_LIST_WINDOW_DAYS;
  const nextAnchor = shiftDay(args.anchor, args.steps);
  const nextOrigin = dayListOriginForTarget(args.origin, nextAnchor, windowDays);
  return {
    nextAnchor,
    nextOrigin,
    scroll: nextOrigin === args.origin ? 'section' : 'zero',
  };
}

/**
 * List settle writes SoT only — painted origin must not move (CAL-P6-5C-03).
 * Returning the same origin documents the contract for callers/tests.
 */
export function planDayListScrollSettle(args: {
  origin: string;
  currentAnchor: string;
  topDay: string;
}): { nextAnchor: string; nextOrigin: string; originChanged: boolean } {
  return {
    nextAnchor: args.topDay,
    nextOrigin: args.origin,
    originChanged: false,
  };
}
