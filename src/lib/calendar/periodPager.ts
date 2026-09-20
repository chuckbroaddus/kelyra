/**
 * Calendar period pager (Rolodex) — pure helpers.
 * SoT: notes/company/calendar-period-pager-*.md (dual stamp 2026-09-20).
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

export type PeriodWindow = {
  prev: PeriodTileModel;
  current: PeriodTileModel;
  next: PeriodTileModel;
};

/** Surfaces that mount the Rolodex. Day List keeps no chevron (CAL-R5-11 HOLD). */
export function showsPeriodPager(view: CalendarViewId, dayMode: DayMode): boolean {
  if (view === 'day' && dayMode === 'list') return false;
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

/** Build exactly three tiles (prev / current / next) around the current anchor. */
export function buildPeriodWindow(args: BuildPeriodWindowArgs): PeriodWindow {
  const { kind, anchor, dayCount = 3 } = args;
  if (kind === 'year') {
    const y = Number(anchor) || yearContaining(anchor);
    return {
      prev: yearTile(y - 1),
      current: yearTile(y),
      next: yearTile(y + 1),
    };
  }
  if (kind === 'month') {
    return {
      prev: monthTile(shiftMonth(anchor, -1)),
      current: monthTile(anchor),
      next: monthTile(shiftMonth(anchor, 1)),
    };
  }
  if (kind === 'week') {
    const cur = weekRangeContaining(anchor).fromIso;
    return {
      prev: weekTile(shiftWeek(cur, -1)),
      current: weekTile(cur),
      next: weekTile(shiftWeek(cur, 1)),
    };
  }
  if (kind === 'multiday') {
    return {
      prev: multidayTile(shiftMultiday(anchor, dayCount, -1), dayCount),
      current: multidayTile(anchor, dayCount),
      next: multidayTile(shiftMultiday(anchor, dayCount, 1), dayCount),
    };
  }
  if (kind === 'day') {
    return {
      prev: dayTile(shiftDay(anchor, -1)),
      current: dayTile(anchor),
      next: dayTile(shiftDay(anchor, 1)),
    };
  }
  // agenda — step by 7 days (existing toolbar law)
  return {
    prev: agendaTile(shiftDay(anchor, -7)),
    current: agendaTile(anchor),
    next: agendaTile(shiftDay(anchor, 7)),
  };
}

/**
 * Map finger release to page step.
 * Negative translation (drag left) → next (+1); positive → prev (−1).
 */
export function snapPeriodPage(
  translationX: number,
  pageWidth: number,
  velocityX = 0,
  distanceRatio = 0.28,
  velocityThreshold = 600,
): -1 | 0 | 1 {
  const width = pageWidth > 0 ? pageWidth : 1;
  if (translationX <= -width * distanceRatio || velocityX <= -velocityThreshold) return 1;
  if (translationX >= width * distanceRatio || velocityX >= velocityThreshold) return -1;
  return 0;
}

/** Scale at a tile's center given drag offset (0 = parked on current). */
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

/** Opacity for side vs center. */
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

/** Left-edge dead zone so iOS back edge-swipe is not stolen (CAL-40 / Q17). */
export const PERIOD_PAGER_EDGE_GUARD_PX = 24;
