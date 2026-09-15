import type { CalendarItem } from './types.ts';
import { itemDayKey } from './mapItem.ts';
import { normalizeRoleTint, type RoleTintId } from './roleTint.ts';

export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 22;
export const HOUR_HEIGHT = 48;

/** Local minutes from midnight for an ISO instant. */
export function minutesFromMidnight(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours() * 60 + d.getMinutes();
}

export function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function timelineHours(
  startHour = TIMELINE_START_HOUR,
  endHour = TIMELINE_END_HOUR,
): number[] {
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h += 1) hours.push(h);
  return hours;
}

export function splitDayItems(items: CalendarItem[], day: string): {
  allDay: CalendarItem[];
  timed: CalendarItem[];
} {
  const allDay: CalendarItem[] = [];
  const timed: CalendarItem[] = [];
  for (const item of items) {
    if (itemDayKey(item) !== day) continue;
    if (item.allDay) allDay.push(item);
    else timed.push(item);
  }
  return { allDay, timed };
}

export function hasTimedInRange(items: CalendarItem[], days: string[]): boolean {
  const set = new Set(days);
  return items.some((item) => !item.allDay && set.has(itemDayKey(item)));
}

export type TimedLayout = {
  item: CalendarItem;
  top: number;
  height: number;
  startMin: number;
};

/** Place timed blocks inside the hour gutter window. */
export function layoutTimedBlocks(
  timed: CalendarItem[],
  startHour = TIMELINE_START_HOUR,
  endHour = TIMELINE_END_HOUR,
  hourHeight = HOUR_HEIGHT,
): TimedLayout[] {
  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;
  const span = Math.max(1, windowEnd - windowStart);
  return timed.map((item) => {
    const startMin = minutesFromMidnight(item.startsAt);
    const endRaw = item.endsAt ? minutesFromMidnight(item.endsAt) : startMin + 60;
    const endMin = Math.max(startMin + 15, endRaw);
    const clampedStart = Math.min(Math.max(startMin, windowStart), windowEnd - 15);
    const clampedEnd = Math.min(Math.max(endMin, clampedStart + 15), windowEnd);
    const top = ((clampedStart - windowStart) / 60) * hourHeight;
    const height = Math.max(18, ((clampedEnd - clampedStart) / 60) * hourHeight);
    return { item, top, height, startMin };
  });
}

/** Distinct role tints present on a day (≤4). Empty year days stay empty — no fake dots. */
export function dayRoleTints(items: CalendarItem[], day: string, max = 4): RoleTintId[] {
  const seen = new Set<RoleTintId>();
  for (const item of items) {
    if (itemDayKey(item) !== day) continue;
    seen.add(normalizeRoleTint(item.roleTint));
    if (seen.size >= max) break;
  }
  return ROLE_ORDER.filter((t) => seen.has(t)).slice(0, max);
}

const ROLE_ORDER: RoleTintId[] = ['academic', 'school', 'sport', 'personal'];
