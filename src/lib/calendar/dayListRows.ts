/**
 * Day List infinite scroll (CEO 2026-09-24 v2).
 *
 * One continuous run of days. Each day is a sticky section header (same look as the
 * Single Day title: `Feb. 4, 2026, Wed.`), then its events, or a single "No events"
 * row, indented under the header. Rows have fixed heights so the list can use
 * `getItemLayout`: jumps land exactly, the top day is a binary search on offsets, and
 * prepending days shifts the scroll by a known amount (no pause, no jump).
 *
 * The loaded range grows in chunks ahead of the viewport in both directions, so a
 * swipe never reaches the end of the painted days.
 */
import { shiftDay } from './day.ts';

/** Sticky day header row height (22pt title + padding). */
export const DAY_LIST_HEADER_H = 48;
/** Event row: 52pt card + 8pt gap. Title is one line so the height stays fixed. */
export const DAY_LIST_ITEM_H = 60;
/** "No events" row. */
export const DAY_LIST_EMPTY_H = 36;
/** Events and "No events" sit this far right of the header. */
export const DAY_LIST_INDENT = 16;

/** Initial paint: this many days before / after the target day. */
export const DAY_LIST_SEED_BEFORE = 60;
export const DAY_LIST_SEED_AFTER = 90;
/** Load another chunk once the top day is within this many days of a loaded edge. */
export const DAY_LIST_EXTEND_THRESHOLD = 45;
/** Days fetched per extension. */
export const DAY_LIST_CHUNK_DAYS = 90;
/** A refresh re-seeds instead of refetching when the loaded span grows past this. */
export const DAY_LIST_MAX_RELOAD_DAYS = 400;

export type DayListRow<T> =
  | { kind: 'header'; day: string; key: string }
  | { kind: 'item'; day: string; key: string; item: T }
  | { kind: 'empty'; day: string; key: string };

export type DayListLayout<T> = {
  rows: DayListRow<T>[];
  /** Row offsets (px from list top), same length as rows. */
  offsets: number[];
  lengths: number[];
  /** Index in `rows` of each day header (same order as `days`). */
  headerIndices: number[];
  /** Offset of each day header (same order as `days`). */
  headerOffsets: number[];
  days: string[];
  totalHeight: number;
};

export function dayListRowHeight(kind: DayListRow<unknown>['kind']): number {
  if (kind === 'header') return DAY_LIST_HEADER_H;
  if (kind === 'item') return DAY_LIST_ITEM_H;
  return DAY_LIST_EMPTY_H;
}

/** Inclusive run of ISO days. */
export function dayListDaysBetween(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  let d = startIso;
  let guard = 0;
  while (d <= endIso && guard < 5000) {
    out.push(d);
    d = shiftDay(d, 1);
    guard += 1;
  }
  return out;
}

/** Build flat rows + fixed-height layout for days `start..end`. */
export function buildDayListLayout<T>(
  days: string[],
  itemsByDay: Map<string, T[]>,
  itemKey: (item: T) => string,
): DayListLayout<T> {
  const rows: DayListRow<T>[] = [];
  const offsets: number[] = [];
  const lengths: number[] = [];
  const headerIndices: number[] = [];
  const headerOffsets: number[] = [];
  let y = 0;
  const push = (row: DayListRow<T>) => {
    const h = dayListRowHeight(row.kind);
    rows.push(row);
    offsets.push(y);
    lengths.push(h);
    y += h;
  };
  for (const day of days) {
    headerIndices.push(rows.length);
    headerOffsets.push(y);
    push({ kind: 'header', day, key: `h:${day}` });
    const list = itemsByDay.get(day) ?? [];
    if (list.length === 0) push({ kind: 'empty', day, key: `e:${day}` });
    else for (const item of list) push({ kind: 'item', day, key: `i:${day}:${itemKey(item)}`, item });
  }
  return { rows, offsets, lengths, headerIndices, headerOffsets, days, totalHeight: y };
}

/** Whole days since 1970-01-01 for an ISO day (UTC math; DST-safe). */
export function dayListDayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/**
 * CAL-DRUM-FOLLOW worklet (UI-thread scroll handler): same math as
 * `dayListFollowPosition` on plain arrays. NaN before layout.
 * Self-contained — calls no other function (Reanimated worklet rule).
 */
export function dayListFollowAt(
  headerOffsets: readonly number[],
  dayNumbers: readonly number[],
  totalHeight: number,
  y: number,
): number {
  'worklet';
  const n = headerOffsets.length;
  if (n === 0 || dayNumbers.length !== n) return NaN;
  let lo = 0;
  let hi = n - 1;
  let idx = 0;
  // Same pin rule as dayListTopIndexAt (half-pixel slack).
  const target = (y < 0 ? 0 : y) + 0.5;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (headerOffsets[mid]! <= target) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const start = headerOffsets[idx]!;
  const end = idx + 1 < n ? headerOffsets[idx + 1]! : totalHeight;
  const span = end - start;
  const raw = span > 0 ? (y - start) / span : 0;
  const frac = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  return dayNumbers[idx]! + frac;
}

/**
 * CAL-LIST-FOLLOW worklet: inverse of `dayListFollowAt` — scroll offset that puts
 * continuous day position `pos` at the top edge (drum drag drives the list).
 * Days are consecutive, so the section index is `floor(pos) - dayNumbers[0]`;
 * clamps to the loaded range. NaN before layout. Self-contained (worklet rule).
 */
export function dayListOffsetAt(
  headerOffsets: readonly number[],
  dayNumbers: readonly number[],
  totalHeight: number,
  pos: number,
): number {
  'worklet';
  const n = headerOffsets.length;
  if (n === 0 || dayNumbers.length !== n || Number.isNaN(pos)) return NaN;
  const day = Math.floor(pos);
  let idx = day - dayNumbers[0]!;
  let frac = pos - day;
  if (idx < 0) {
    idx = 0;
    frac = 0;
  } else if (idx > n - 1) {
    idx = n - 1;
    frac = 1;
  }
  const start = headerOffsets[idx]!;
  const end = idx + 1 < n ? headerOffsets[idx + 1]! : totalHeight;
  return start + frac * (end - start);
}

/**
 * CAL-DRUM-FOLLOW: continuous day position at scroll offset `y` — the pinned
 * day's number plus how far the top edge is through that day's section (0 when
 * its header pins, 1 when the next header pins). Null before layout.
 */
export function dayListFollowPosition(
  layout: Pick<DayListLayout<unknown>, 'headerOffsets' | 'days' | 'totalHeight'>,
  y: number,
): number | null {
  const pos = dayListFollowAt(
    layout.headerOffsets,
    layout.days.map(dayListDayNumber),
    layout.totalHeight,
    y,
  );
  return Number.isNaN(pos) ? null : pos;
}

/**
 * Index into `days` of the day whose header is pinned at scroll offset `y`
 * (last header at or above the top edge).
 */
export function dayListTopIndexAt(headerOffsets: number[], y: number): number {
  if (headerOffsets.length === 0) return -1;
  const target = Math.max(0, y) + 0.5;
  let lo = 0;
  let hi = headerOffsets.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (headerOffsets[mid]! <= target) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Which edges need another chunk, given the pinned day index. */
export function dayListExtendNeeds(
  topIndex: number,
  dayCount: number,
  threshold: number = DAY_LIST_EXTEND_THRESHOLD,
): { before: boolean; after: boolean } {
  if (dayCount === 0 || topIndex < 0) return { before: false, after: false };
  return {
    before: topIndex < threshold,
    after: dayCount - 1 - topIndex < threshold,
  };
}

export function dayListSeedRange(target: string): { start: string; end: string } {
  return { start: shiftDay(target, -DAY_LIST_SEED_BEFORE), end: shiftDay(target, DAY_LIST_SEED_AFTER) };
}

export function dayListChunkBefore(start: string): { start: string; end: string } {
  return { start: shiftDay(start, -DAY_LIST_CHUNK_DAYS), end: shiftDay(start, -1) };
}

export function dayListChunkAfter(end: string): { start: string; end: string } {
  return { start: shiftDay(end, 1), end: shiftDay(end, DAY_LIST_CHUNK_DAYS) };
}

/**
 * Scroll offset that keeps the same content under the top edge after a relayout
 * (prepend, refresh, or search changing row counts above). `intra` is how far the
 * top edge sat below that day's header before the change.
 */
export function dayListCompensatedOffset(
  layout: Pick<DayListLayout<unknown>, 'days' | 'headerOffsets'>,
  topDay: string,
  intra: number,
): number | null {
  const idx = layout.days.indexOf(topDay);
  if (idx < 0) return null;
  return layout.headerOffsets[idx]! + Math.max(0, intra);
}
