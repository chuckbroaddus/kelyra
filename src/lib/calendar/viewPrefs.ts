import AsyncStorage from '@react-native-async-storage/async-storage';

import { clampMultidayCount, isMultidayCount, type MultidayCount } from './multiday.ts';
import type { CalendarSeat } from './types.ts';

export const CAL_VIEW_PREFS_VERSION = 3 as const;

export type CalendarViewId = 'agenda' | 'day' | 'week' | 'month' | 'year' | 'multiday';

/** Month presentation — Compact + List only (CAL-R4 C-B). No Stacked/Detail stubs. */
export type MonthMode = 'compact' | 'list';

/** Day presentation — Single Day + List (CAL-R4 C-B). Day List lives in the gear customizer. */
export type DayMode = 'single' | 'list';

export type CalViewPrefsV1 = {
  version: typeof CAL_VIEW_PREFS_VERSION;
  view: CalendarViewId;
  /** Multi-day column count when view=multiday (also remembered across week pinch). */
  days: MultidayCount;
  monthMode: MonthMode;
  dayMode: DayMode;
};

const VIEWS: CalendarViewId[] = ['agenda', 'day', 'week', 'month', 'year', 'multiday'];
const MONTH_MODES: MonthMode[] = ['compact', 'list'];
const DAY_MODES: DayMode[] = ['single', 'list'];

export function calViewPrefsKey(
  profileId: string,
  seat: CalendarSeat,
  deviceClass: 'phone' | 'web',
  childStudentId?: string | null,
): string {
  const child = childStudentId && childStudentId.length ? childStudentId : 'none';
  return `calview:v1:${profileId}:${seat}:${deviceClass}:${child}`;
}

/**
 * Calendar default is Year for phone and web, every seat.
 * Desk ≠ Year (Desk is a different route — do not change desk).
 */
export function defaultViewFor(
  _deviceClass: 'phone' | 'web',
  _seat: CalendarSeat,
): CalendarViewId {
  return 'year';
}

export function emptyViewPrefs(
  deviceClass: 'phone' | 'web',
  seat: CalendarSeat,
): CalViewPrefsV1 {
  return {
    version: CAL_VIEW_PREFS_VERSION,
    view: defaultViewFor(deviceClass, seat),
    days: 5,
    monthMode: 'compact',
    dayMode: 'single',
  };
}

export function parseCalViewPrefsJson(
  raw: string | null | undefined,
  deviceClass: 'phone' | 'web',
  seat: CalendarSeat,
): CalViewPrefsV1 {
  const fallback = emptyViewPrefs(deviceClass, seat);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      view?: CalendarViewId;
      days?: number;
      monthMode?: MonthMode;
      dayMode?: DayMode;
    };
    const ver = parsed.version;
    if (!parsed || (ver !== 1 && ver !== 2 && ver !== 3)) {
      return fallback;
    }
    let view = VIEWS.includes(parsed.view as CalendarViewId)
      ? (parsed.view as CalendarViewId)
      : fallback.view;
    // v3: one-time migrate persisted web Week/Month/Agenda defaults → Year.
    if (deviceClass === 'web' && (ver === 1 || ver === 2) && (view === 'week' || view === 'month' || view === 'agenda')) {
      view = 'year';
    }
    const days =
      typeof parsed.days === 'number' && isMultidayCount(parsed.days)
        ? parsed.days
        : clampMultidayCount(typeof parsed.days === 'number' ? parsed.days : 5);
    const monthMode = MONTH_MODES.includes(parsed.monthMode as MonthMode)
      ? (parsed.monthMode as MonthMode)
      : 'compact';
    const dayMode = DAY_MODES.includes(parsed.dayMode as DayMode)
      ? (parsed.dayMode as DayMode)
      : 'single';
    return {
      version: CAL_VIEW_PREFS_VERSION,
      view,
      days,
      monthMode,
      dayMode,
    };
  } catch {
    return fallback;
  }
}

export async function loadCalViewPrefs(
  profileId: string,
  seat: CalendarSeat,
  deviceClass: 'phone' | 'web',
  childStudentId?: string | null,
): Promise<CalViewPrefsV1> {
  try {
    const raw = await AsyncStorage.getItem(
      calViewPrefsKey(profileId, seat, deviceClass, childStudentId),
    );
    return parseCalViewPrefsJson(raw, deviceClass, seat);
  } catch {
    return emptyViewPrefs(deviceClass, seat);
  }
}

export async function saveCalViewPrefs(
  profileId: string,
  seat: CalendarSeat,
  deviceClass: 'phone' | 'web',
  childStudentId: string | null | undefined,
  prefs: CalViewPrefsV1,
): Promise<void> {
  await AsyncStorage.setItem(
    calViewPrefsKey(profileId, seat, deviceClass, childStudentId),
    JSON.stringify({ ...prefs, version: CAL_VIEW_PREFS_VERSION }),
  );
}

/** Tap-zoom ladder: Day → Month → Year (CAL-R4 L-C). No RTL-only back gesture. */
export function zoomParentView(view: CalendarViewId): CalendarViewId | null {
  if (view === 'day') return 'month';
  if (view === 'month') return 'year';
  return null;
}

export function canZoomUp(view: CalendarViewId): boolean {
  return zoomParentView(view) != null;
}
