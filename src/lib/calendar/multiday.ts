import { addDaysISO, parseISODate, todayISO } from '../date/iso.ts';

/** Allowed multi-day column counts (CAL-29). */
export const MULTIDAY_COUNTS = [3, 5, 7] as const;
export type MultidayCount = (typeof MULTIDAY_COUNTS)[number];

export function isMultidayCount(n: number): n is MultidayCount {
  return n === 3 || n === 5 || n === 7;
}

export function clampMultidayCount(n: number): MultidayCount {
  if (n <= 3) return 3;
  if (n >= 7) return 7;
  return 5;
}

/**
 * Today jump / cold-start anchor for 3/5 multi-day.
 * Must be today's ISO — not the Sunday of the enclosing week — because
 * multidayRangeContaining(3|5) starts at the anchor (CAL-29 Today essential).
 */
export function multidayTodayAnchor(todayIso?: string | null, now = new Date()): string {
  return todayIso && parseISODate(todayIso) ? todayIso : todayISO(now);
}

/** Inclusive local range of `count` days starting at (or containing) anchor. */
export function multidayRangeContaining(
  count: MultidayCount,
  anchorIso?: string | null,
  now = new Date(),
): { fromIso: string; toIso: string; days: string[]; count: MultidayCount } {
  const anchor = anchorIso && parseISODate(anchorIso) ? anchorIso : todayISO(now);
  // Center-ish: for 7 use Sunday-start week; for 3/5 start at anchor.
  if (count === 7) {
    const date = parseISODate(anchor)!;
    const dow = date.getDay();
    const fromIso = addDaysISO(anchor, -dow)!;
    const days: string[] = [];
    for (let i = 0; i < 7; i += 1) days.push(addDaysISO(fromIso, i)!);
    return { fromIso, toIso: days[6]!, days, count };
  }
  const days: string[] = [];
  for (let i = 0; i < count; i += 1) days.push(addDaysISO(anchor, i)!);
  return { fromIso: days[0]!, toIso: days[days.length - 1]!, days, count };
}

export function shiftMultiday(fromIso: string, count: MultidayCount, dir: -1 | 1): string {
  return addDaysISO(fromIso, dir * count) ?? fromIso;
}

/**
 * Pinch scale → next column count.
 * scale < 1 (pinch in) → fewer columns; scale > 1 (spread) → more.
 */
export function nextCountFromPinch(current: MultidayCount, scale: number): MultidayCount {
  if (!(scale > 0) || !Number.isFinite(scale)) return current;
  if (scale < 0.85) {
    if (current === 7) return 5;
    if (current === 5) return 3;
    return 3;
  }
  if (scale > 1.15) {
    if (current === 3) return 5;
    if (current === 5) return 7;
    return 7;
  }
  return current;
}

/** Stepper cycle helpers. */
export function stepMultidayCount(current: MultidayCount, dir: -1 | 1): MultidayCount {
  const idx = MULTIDAY_COUNTS.indexOf(current);
  const next = MULTIDAY_COUNTS[Math.min(MULTIDAY_COUNTS.length - 1, Math.max(0, idx + dir))];
  return next ?? current;
}
