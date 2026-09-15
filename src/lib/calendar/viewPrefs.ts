import AsyncStorage from '@react-native-async-storage/async-storage';

import { clampMultidayCount, isMultidayCount, type MultidayCount } from './multiday.ts';
import type { CalendarSeat } from './types.ts';

export const CAL_VIEW_PREFS_VERSION = 1 as const;

export type CalendarViewId = 'agenda' | 'day' | 'week' | 'month' | 'year' | 'multiday';

export type CalViewPrefsV1 = {
  version: typeof CAL_VIEW_PREFS_VERSION;
  view: CalendarViewId;
  /** Multi-day column count when view=multiday (also remembered across week pinch). */
  days: MultidayCount;
};

const VIEWS: CalendarViewId[] = ['agenda', 'day', 'week', 'month', 'year', 'multiday'];

export function calViewPrefsKey(
  profileId: string,
  seat: CalendarSeat,
  deviceClass: 'phone' | 'web',
  childStudentId?: string | null,
): string {
  const child = childStudentId && childStudentId.length ? childStudentId : 'none';
  return `calview:v1:${profileId}:${seat}:${deviceClass}:${child}`;
}

export function defaultViewFor(deviceClass: 'phone' | 'web', seat: CalendarSeat): CalendarViewId {
  if (deviceClass === 'phone') return 'agenda';
  if (seat === 'office') return 'month';
  if (seat === 'teacher') return 'week';
  return 'agenda';
}

export function emptyViewPrefs(
  deviceClass: 'phone' | 'web',
  seat: CalendarSeat,
): CalViewPrefsV1 {
  return {
    version: CAL_VIEW_PREFS_VERSION,
    view: defaultViewFor(deviceClass, seat),
    days: 5,
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
    const parsed = JSON.parse(raw) as Partial<CalViewPrefsV1>;
    if (!parsed || parsed.version !== CAL_VIEW_PREFS_VERSION) return fallback;
    const view = VIEWS.includes(parsed.view as CalendarViewId)
      ? (parsed.view as CalendarViewId)
      : fallback.view;
    const days =
      typeof parsed.days === 'number' && isMultidayCount(parsed.days)
        ? parsed.days
        : clampMultidayCount(typeof parsed.days === 'number' ? parsed.days : 5);
    return { version: CAL_VIEW_PREFS_VERSION, view, days };
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
    JSON.stringify(prefs),
  );
}
