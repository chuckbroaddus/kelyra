/**
 * CAL-P6-9A — in-memory Calendar surface anchors for stack-honest forward restore.
 * Survives remount within the same JS context (interactive pop → forward).
 * View kind / dayMode still rehydrate from view prefs; anchors live here.
 */
import type { CalendarViewId, DayMode, MonthMode } from './viewPrefs.ts';
import type { MultidayCount } from './multiday.ts';
import { CAL_P6_9A_STACK_RESTORE } from './p6Laws.ts';

export { CAL_P6_9A_STACK_RESTORE };

export type CalendarSessionAnchors = {
  activeView: CalendarViewId;
  dayMode: DayMode;
  monthMode: MonthMode;
  dayCount: MultidayCount;
  dayAnchor: string;
  gridAnchor: string;
  monthAnchor: string;
  yearAnchor: number;
  agendaAnchor: string;
  monthSelectedDay: string | null;
  zoomStack: CalendarViewId[];
};

const byKey = new Map<string, CalendarSessionAnchors>();

export function calendarSessionKey(
  profileId: string | null | undefined,
  seat: string | null | undefined,
  childStudentId?: string | null,
): string {
  const child = childStudentId && childStudentId.length ? childStudentId : 'none';
  return `cal:${profileId ?? 'anon'}:${seat ?? 'none'}:${child}`;
}

export function saveCalendarSession(
  key: string,
  anchors: CalendarSessionAnchors,
): void {
  byKey.set(key, { ...anchors, zoomStack: [...anchors.zoomStack] });
}

export function loadCalendarSession(key: string): CalendarSessionAnchors | null {
  const hit = byKey.get(key);
  if (!hit) return null;
  return { ...hit, zoomStack: [...hit.zoomStack] };
}
