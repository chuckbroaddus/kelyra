/**
 * Calendar period window helpers (shared by 3D period wheel).
 * Wheel look/curves: src/lib/calendar/periodWheel.ts + calendar-item2-p0p1-* SoT.
 * Uses existing shifters only; no new SQL.
 */
import {
  formatCalendarDisplayDate,
  formatCalendarMonthYear,
  formatCalendarNumericRange,
} from './displayDate.ts';
import { agendaRangeFrom, dayRangeContaining, shiftDay } from './day.ts';
import { monthContaining, shiftMonth } from './month.ts';
import {
  multidayRangeContaining,
  shiftMultiday,
  type MultidayCount,
} from './multiday.ts';
import type { CalendarViewId, DayMode } from './viewPrefs.ts';
import { shiftWeek, weekRangeContaining } from './week.ts';
import { yearContaining } from './year.ts';
import { WHEEL_MAX_FLING_SLOTS, WHEEL_SLOT_OFFSETS } from './periodWheel.ts';

/** Local SoT mirrors (pitch only — slot offsets / fling from periodWheel). */
const SLOT_PITCH = 78;

export type PeriodKind = 'year' | 'month' | 'week' | 'multiday' | 'day' | 'agenda';

export type PeriodTileModel = {
  key: string;
  kind: PeriodKind;
  /** ISO date or year string used as recycle key. */
  anchor: string;
  /** Side tile short caption (e.g. '26, Sep, MM/DD). */
  sideCaption: string;
  /** Center caption after snap (full year / Month Year / range). */
  centerCaption: string;
  /** Plain label for << label >> leaf-fail fallback. */
  fallbackLabel: string;
  year?: number;
  monthYear?: number;
  monthIndex0?: number;
  fromIso?: string;
  toIso?: string;
  dayIso?: string;
};

/** Nine-slot SlotPool window: center ±4 (matches WHEEL_SLOT_OFFSETS). */
export type PeriodWindow = {
  /** Slots aligned 1:1 with WHEEL_SLOT_OFFSETS. Center at index of 0. */
  slots: PeriodTileModel[];
  prev4: PeriodTileModel;
  prev3: PeriodTileModel;
  prev2: PeriodTileModel;
  prev: PeriodTileModel;
  current: PeriodTileModel;
  next: PeriodTileModel;
  next2: PeriodTileModel;
  next3: PeriodTileModel;
  next4: PeriodTileModel;
};

/**
 * Surfaces that mount the period wheel (Set B drum).
 * CAL-P6-5C-01: Day List mounts drum (drops CAL-R5-11 / CAL-3DW-14 no-drum).
 * dayMode kept for call-site compat; list no longer excludes the pager.
 */
export function showsPeriodPager(view: CalendarViewId, _dayMode?: DayMode): boolean {
  return (
    view === 'year' ||
    view === 'month' ||
    view === 'week' ||
    view === 'multiday' ||
    view === 'day' ||
    view === 'agenda'
  );
}

export function periodKindForView(view: CalendarViewId): PeriodKind | null {
  if (view === 'year') return 'year';
  if (view === 'month') return 'month';
  if (view === 'week') return 'week';
  if (view === 'multiday') return 'multiday';
  if (view === 'day') return 'day';
  if (view === 'agenda') return 'agenda';
  return null;
}

function yearAbbrev(year: number): string {
  return `'${String(year).slice(-2)}`;
}

function yearTile(year: number): PeriodTileModel {
  return {
    key: `year:${year}`,
    kind: 'year',
    anchor: String(year),
    sideCaption: yearAbbrev(year),
    centerCaption: String(year),
    fallbackLabel: String(year),
    year,
  };
}

function monthTile(anchorIso: string): PeriodTileModel {
  const m = monthContaining(anchorIso);
  const side = new Date(m.year, m.monthIndex0, 1, 12, 0, 0, 0).toLocaleDateString(undefined, {
    month: 'short',
  });
  const center = formatCalendarMonthYear(m.fromIso);
  return {
    key: `month:${m.fromIso.slice(0, 7)}`,
    kind: 'month',
    anchor: m.fromIso,
    sideCaption: side,
    centerCaption: center,
    fallbackLabel: center,
    monthYear: m.year,
    monthIndex0: m.monthIndex0,
    fromIso: m.fromIso,
    toIso: m.toIso,
  };
}

function weekTile(anchorIso: string): PeriodTileModel {
  const range = weekRangeContaining(anchorIso);
  const center = formatCalendarNumericRange(range.fromIso, range.toIso);
  const side = formatCalendarNumericRange(range.fromIso, range.toIso);
  return {
    key: `week:${range.fromIso}`,
    kind: 'week',
    anchor: range.fromIso,
    sideCaption: side,
    centerCaption: center,
    fallbackLabel: center,
    fromIso: range.fromIso,
    toIso: range.toIso,
  };
}

function multidayTile(anchorIso: string, count: MultidayCount): PeriodTileModel {
  const range = multidayRangeContaining(count, anchorIso);
  const center = formatCalendarNumericRange(range.fromIso, range.toIso);
  return {
    key: `multiday:${count}:${range.fromIso}`,
    kind: 'multiday',
    anchor: anchorIso,
    sideCaption: center,
    centerCaption: center,
    fallbackLabel: center,
    fromIso: range.fromIso,
    toIso: range.toIso,
  };
}

function dayTile(anchorIso: string): PeriodTileModel {
  const range = dayRangeContaining(anchorIso);
  const center = formatCalendarDisplayDate(range.day);
  const d = range.day;
  const side = new Date(
    Number(d.slice(0, 4)),
    Number(d.slice(5, 7)) - 1,
    Number(d.slice(8, 10)),
    12,
    0,
    0,
    0,
  ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return {
    key: `day:${range.day}`,
    kind: 'day',
    anchor: range.day,
    sideCaption: side,
    centerCaption: center,
    fallbackLabel: center,
    dayIso: range.day,
    fromIso: range.day,
    toIso: range.day,
  };
}

function agendaTile(anchorIso: string): PeriodTileModel {
  const range = agendaRangeFrom(anchorIso, 14);
  const center = 'Next 2 weeks';
  const side = formatCalendarNumericRange(range.fromIso, range.toIso);
  return {
    key: `agenda:${range.fromIso}`,
    kind: 'agenda',
    anchor: range.fromIso,
    sideCaption: side,
    centerCaption: center,
    fallbackLabel: center,
    fromIso: range.fromIso,
    toIso: range.toIso,
  };
}

export type BuildPeriodWindowArgs = {
  kind: PeriodKind;
  /** Year number for year kind; ISO for others. */
  anchor: string;
  dayCount?: MultidayCount;
};

function packWindow(slots: PeriodTileModel[]): PeriodWindow {
  if (slots.length !== WHEEL_SLOT_OFFSETS.length) {
    throw new Error(
      `packWindow: expected ${WHEEL_SLOT_OFFSETS.length} slots, got ${slots.length}`,
    );
  }
  const centerIdx = WHEEL_SLOT_OFFSETS.indexOf(0);
  return {
    slots,
    prev4: slots[centerIdx - 4]!,
    prev3: slots[centerIdx - 3]!,
    prev2: slots[centerIdx - 2]!,
    prev: slots[centerIdx - 1]!,
    current: slots[centerIdx]!,
    next: slots[centerIdx + 1]!,
    next2: slots[centerIdx + 2]!,
    next3: slots[centerIdx + 3]!,
    next4: slots[centerIdx + 4]!,
  };
}

function shiftMultidayBy(anchor: string, count: MultidayCount, steps: number): string {
  let a = anchor;
  const dir: -1 | 1 = steps >= 0 ? 1 : -1;
  const n = Math.abs(steps);
  for (let i = 0; i < n; i += 1) {
    a = shiftMultiday(a, count, dir);
  }
  return a;
}

/** Build tiles for every WHEEL_SLOT_OFFSETS entry (center ±4 → N=9). */
export function buildPeriodWindow(args: BuildPeriodWindowArgs): PeriodWindow {
  const { kind, anchor, dayCount = 3 } = args;
  const offsets = WHEEL_SLOT_OFFSETS;

  if (kind === 'year') {
    const y = Number(anchor) || yearContaining(anchor);
    return packWindow(offsets.map((d) => yearTile(y + d)));
  }
  if (kind === 'month') {
    return packWindow(offsets.map((d) => monthTile(shiftMonth(anchor, d))));
  }
  if (kind === 'week') {
    const cur = weekRangeContaining(anchor).fromIso;
    return packWindow(offsets.map((d) => weekTile(shiftWeek(cur, d))));
  }
  if (kind === 'multiday') {
    return packWindow(
      offsets.map((d) => multidayTile(shiftMultidayBy(anchor, dayCount, d), dayCount)),
    );
  }
  if (kind === 'day') {
    return packWindow(offsets.map((d) => dayTile(shiftDay(anchor, d))));
  }
  // agenda — step by 7 days (existing toolbar law)
  return packWindow(offsets.map((d) => agendaTile(shiftDay(anchor, d * 7))));
}


/** Shift a period anchor by signed integer steps (kind-aware). Used for mid-fling SlotPool rebound. */
export function shiftPeriodAnchor(
  kind: PeriodKind,
  anchor: string,
  steps: number,
  dayCount: MultidayCount = 3,
): string {
  if (steps === 0) return anchor;
  if (kind === 'year') {
    const y = Number(anchor) || yearContaining(anchor);
    return String(y + steps);
  }
  if (kind === 'month') return shiftMonth(anchor, steps);
  if (kind === 'week') {
    const cur = weekRangeContaining(anchor).fromIso;
    return shiftWeek(cur, steps);
  }
  if (kind === 'multiday') return shiftMultidayBy(anchor, dayCount, steps);
  if (kind === 'day') return shiftDay(anchor, steps);
  // agenda — step by 7 days (existing toolbar law)
  return shiftDay(anchor, steps * 7);
}

/**
 * Map finger release to integer slot steps (−max…+max soft ceiling).
 * Negative translation (drag left) → next (+); positive → prev (−).
 * Soft max = WHEEL_MAX_FLING_SLOTS (~48); must not clamp realistic 30+ coasts to 4.
 */
export function snapPeriodPage(
  translationX: number,
  pitch: number = SLOT_PITCH,
  velocityX = 0,
  distanceRatio = 0.28,
  velocityThreshold = 600,
  maxSlots = WHEEL_MAX_FLING_SLOTS,
): number {
  const P = pitch > 0 ? pitch : SLOT_PITCH;
  // Content follows finger: slots advanced ≈ −translationX / P
  const distanceSlots = -translationX / P;
  const speed = Math.abs(velocityX);

  let slots: number;
  if (speed < velocityThreshold) {
    if (Math.abs(distanceSlots) < distanceRatio) {
      slots = 0;
    } else {
      const rounded = Math.round(distanceSlots);
      slots = rounded === 0 ? (distanceSlots > 0 ? 1 : -1) : rounded;
    }
  } else {
    // Momentum coast (mockup ~180ms * v): add velocity contribution then round
    const coast = (-velocityX / 1000) * (180 / P);
    slots = Math.round(distanceSlots + coast);
    if (slots === 0) {
      slots = velocityX < 0 ? 1 : -1;
    }
  }

  if (slots > maxSlots) return maxSlots;
  if (slots < -maxSlots) return -maxSlots;
  return slots;
}

/** Scale at a tile's center given drag offset (0 = parked on current). Legacy helper. */
export function rolodexScaleForOffset(
  tileOffsetX: number,
  pageWidth: number,
  sideScale = 0.82,
  centerScale = 1,
): number {
  const width = pageWidth > 0 ? pageWidth : 1;
  const t = Math.min(1, Math.abs(tileOffsetX) / width);
  return centerScale + (sideScale - centerScale) * t;
}

/** Opacity for side vs center. Legacy helper. */
export function rolodexOpacityForOffset(
  tileOffsetX: number,
  pageWidth: number,
  sideOpacity = 0.55,
  centerOpacity = 1,
): number {
  const width = pageWidth > 0 ? pageWidth : 1;
  const t = Math.min(1, Math.abs(tileOffsetX) / width);
  return centerOpacity + (sideOpacity - centerOpacity) * t;
}

/**
 * CAL-P6-1A-03: on-drum leading carve dropped (was CAL-3DW-12 ~20–24px).
 * Full-band drum stage owns LTR/RTL period paging. Off-row edge pop KEEP
 * because system interactive-pop only starts outside this stage View.
 */
export const PERIOD_PAGER_EDGE_GUARD_PX = 0;
