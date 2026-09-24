/**
 * CAL-P6-5C — shared Day List period SoT (`listAnchorDay`).
 * List scroll and drum pan both write; the other view is a pure projection.
 * Center drum leaf = day at top of list viewport.
 *
 * Painted window slides when the top day nears either edge so Day List can
 * scroll infinitely (CEO 2026-09-24). Rebase always pairs with a scroll reset
 * onto the same top day so the viewport does not jump.
 */
import { agendaRangeFrom, shiftDay } from './day.ts';
import { CAL_P6_5C_LIST_ANCHOR } from './p6Laws.ts';

export { CAL_P6_5C_LIST_ANCHOR };

/** Continuous Day List painted length (CAL-R5-11 density A spirit). */
export const DAY_LIST_WINDOW_DAYS = 21;

/**
 * Rebase when the top day is within this many slots of either painted edge.
 * Leaves runway above/below so the user can keep scrolling.
 */
export const DAY_LIST_EDGE_PAD = 5;

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
 * Place `target` at EDGE_PAD inside the painted window so both directions
 * have runway after a rebase.
 */
export function dayListOriginAround(
  target: string,
  windowDays: number = DAY_LIST_WINDOW_DAYS,
  edgePad: number = DAY_LIST_EDGE_PAD,
): string {
  const pad = Math.max(0, Math.min(edgePad, Math.max(0, windowDays - 1)));
  return shiftDay(target, -pad);
}

function dayNeedsWindowRebase(
  origin: string,
  day: string,
  windowDays: number,
  edgePad: number,
): boolean {
  const days = dayListWindowDays(origin, windowDays);
  const idx = days.indexOf(day);
  if (idx < 0) return true;
  const pad = Math.max(0, Math.min(edgePad, Math.max(0, days.length - 1)));
  return idx < pad || idx > days.length - 1 - pad;
}

/**
 * Keep painted origin stable while `target` stays in the safe middle band.
 * Near either edge (or outside), rebase so target sits at EDGE_PAD.
 */
export function dayListOriginForTarget(
  origin: string,
  target: string,
  windowDays: number = DAY_LIST_WINDOW_DAYS,
  edgePad: number = DAY_LIST_EDGE_PAD,
): string {
  if (!dayNeedsWindowRebase(origin, target, windowDays, edgePad)) return origin;
  return dayListOriginAround(target, windowDays, edgePad);
}

export type DayListDrumShiftPlan = {
  nextAnchor: string;
  nextOrigin: string;
  /**
   * `section` = scroll using current layout;
   * `rebase` = window moved — wait for section layout then scroll to nextAnchor.
   */
  scroll: 'section' | 'rebase';
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
  edgePad?: number;
}): DayListDrumShiftPlan {
  const windowDays = args.windowDays ?? DAY_LIST_WINDOW_DAYS;
  const edgePad = args.edgePad ?? DAY_LIST_EDGE_PAD;
  const nextAnchor = shiftDay(args.anchor, args.steps);
  const nextOrigin = dayListOriginForTarget(args.origin, nextAnchor, windowDays, edgePad);
  return {
    nextAnchor,
    nextOrigin,
    scroll: nextOrigin === args.origin ? 'section' : 'rebase',
  };
}

export type DayListScrollSettlePlan = {
  nextAnchor: string;
  nextOrigin: string;
  originChanged: boolean;
  /** When origin changes, caller must pending-scroll to nextAnchor after layout. */
  scroll: 'none' | 'rebase';
};

/**
 * List settle writes SoT and slides the painted window when the top day nears
 * either edge so scroll stays infinite (CEO 2026-09-24).
 */
export function planDayListScrollSettle(args: {
  origin: string;
  currentAnchor: string;
  topDay: string;
  windowDays?: number;
  edgePad?: number;
}): DayListScrollSettlePlan {
  const windowDays = args.windowDays ?? DAY_LIST_WINDOW_DAYS;
  const edgePad = args.edgePad ?? DAY_LIST_EDGE_PAD;
  const nextOrigin = dayListOriginForTarget(args.origin, args.topDay, windowDays, edgePad);
  const originChanged = nextOrigin !== args.origin;
  return {
    nextAnchor: args.topDay,
    nextOrigin,
    originChanged,
    scroll: originChanged ? 'rebase' : 'none',
  };
}
