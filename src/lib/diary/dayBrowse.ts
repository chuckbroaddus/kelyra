/** DB-B Journal day-browse helpers. Diary-named only — never CalendarItem / roleTint. */

import {
  buildMonthGrid,
  daysInMonth,
  isoFromParts,
  partsFromISO,
  todayISO,
} from '../date/iso.ts';

export const DIARY_EMPTY_DAY_COPY = 'No entries yet on this day.';
export const DIARY_PRESENCE_HONESTY =
  'Your journal only. Presence marks never show other people.';
export const DIARY_TWIN_FAIL_CLOSED =
  'Pick a child to open that journal. Twin streams never mix.';

/** Presence display cap (PR-BOTH). */
export const DIARY_PRESENCE_COUNT_CAP = 9;

export type DiaryPresenceMark =
  | { kind: 'none' }
  | { kind: 'dot' }
  | { kind: 'count'; label: string };

export type JournalMonthModel = {
  year: number;
  monthIndex0: number;
  fromIso: string;
  toIso: string;
  label: string;
};

export type JournalAgendaGroup<T extends { entry_date: string }> = {
  day: string;
  rows: T[];
  isSelected: boolean;
  empty: boolean;
};

/** Owner-only counts keyed by entry_date (YYYY-MM-DD). */
export function presenceCountByDay(
  entries: Array<{ entry_date: string }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of entries) {
    const day = row.entry_date;
    if (!day) continue;
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

/** PR-BOTH: dot when count=1; count when >1; display cap 9+. */
export function presenceMark(count: number): DiaryPresenceMark {
  if (!Number.isFinite(count) || count <= 0) return { kind: 'none' };
  if (count === 1) return { kind: 'dot' };
  if (count >= DIARY_PRESENCE_COUNT_CAP) return { kind: 'count', label: '9+' };
  return { kind: 'count', label: String(count) };
}

export function journalMonthContaining(
  anchorIso?: string | null,
  now = new Date(),
): JournalMonthModel {
  const iso = partsFromISO(anchorIso ?? '') ? (anchorIso as string) : todayISO(now);
  const parts = partsFromISO(iso)!;
  const year = parts.year;
  const monthIndex0 = parts.month - 1;
  const last = daysInMonth(year, monthIndex0);
  const fromIso = isoFromParts(year, monthIndex0 + 1, 1)!;
  const toIso = isoFromParts(year, monthIndex0 + 1, last)!;
  const label = new Date(year, monthIndex0, 1, 12, 0, 0, 0).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  return { year, monthIndex0, fromIso, toIso, label };
}

/** Keep day-of-month when valid; else clamp to last day of target month. */
export function shiftJournalSelectedDay(selectedIso: string, deltaMonths: number): string {
  const parts = partsFromISO(selectedIso);
  if (!parts) return selectedIso;
  const target = new Date(parts.year, parts.month - 1 + deltaMonths, 1, 12, 0, 0, 0);
  const year = target.getFullYear();
  const monthIndex0 = target.getMonth();
  const day = Math.min(parts.day, daysInMonth(year, monthIndex0));
  return isoFromParts(year, monthIndex0 + 1, day) ?? selectedIso;
}

export function journalMonthWeeks(year: number, monthIndex0: number) {
  return buildMonthGrid(year, monthIndex0, 0);
}

/**
 * Agenda groups for the loaded window.
 * Always includes selected day (empty card when no rows). Other days only when they have rows.
 * Newest: selected first, then remaining days newest→oldest.
 * Oldest: selected first, then remaining days oldest→newest.
 */
export function buildJournalAgendaGroups<T extends { entry_date: string }>(
  entries: T[],
  selectedDay: string,
  sortOldest: boolean,
): JournalAgendaGroup<T>[] {
  const byDay = new Map<string, T[]>();
  for (const row of entries) {
    const day = row.entry_date;
    if (!day) continue;
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  }

  const otherDays = [...byDay.keys()].filter((day) => day !== selectedDay);
  otherDays.sort((a, b) => (sortOldest ? (a < b ? -1 : a > b ? 1 : 0) : a > b ? -1 : a < b ? 1 : 0));

  const selectedRows = byDay.get(selectedDay) ?? [];
  const groups: JournalAgendaGroup<T>[] = [
    {
      day: selectedDay,
      rows: selectedRows,
      isSelected: true,
      empty: selectedRows.length === 0,
    },
  ];
  for (const day of otherDays) {
    const rows = byDay.get(day) ?? [];
    if (!rows.length) continue;
    groups.push({ day, rows, isSelected: false, empty: false });
  }
  return groups;
}

/** Readable sticky header (e.g. Wed, Sep 17). */
export function formatJournalDayHeader(iso: string, selected = false): string {
  const parts = partsFromISO(iso);
  if (!parts) return iso;
  const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  const base = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return selected ? `${base} · selected` : base;
}

export function parentTwinsFailClosed(
  childCount: number,
  focusedChildId: string | null | undefined,
): boolean {
  return childCount >= 2 && !focusedChildId;
}
