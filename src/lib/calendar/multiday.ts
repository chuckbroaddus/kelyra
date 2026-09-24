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
 * Today's ISO (not week Sunday) so 5 = Mon–Fri containing today and 3 =
 * Tue–Thu of today's week (CAL-R5-04 / CAL-29 Today essential).
 */
export function multidayTodayAnchor(todayIso?: string | null, now = new Date()): string {
  return todayIso && parseISODate(todayIso) ? todayIso : todayISO(now);
}

/**
 * Inclusive local range for 3/5/7 (CAL-R5-04 / CEO 2026-09-24):
 * - 3 → Tuesday–Thursday of the Sunday-start week containing anchor
 * - 5 → Mon–Fri of the week containing anchor
 * - 7 → Sunday-start full week (HOLD)
 */
export function multidayRangeContaining(
  count: MultidayCount,
  anchorIso?: string | null,
  now = new Date(),
): { fromIso: string; toIso: string; days: string[]; count: MultidayCount } {
  const anchor = anchorIso && parseISODate(anchorIso) ? anchorIso : todayISO(now);
  if (count === 7) {
    const date = parseISODate(anchor)!;
    const dow = date.getDay();
    const fromIso = addDaysISO(anchor, -dow)!;
    const days: string[] = [];
    for (let i = 0; i < 7; i += 1) days.push(addDaysISO(fromIso, i)!);
    return { fromIso, toIso: days[6]!, days, count };
  }
  if (count === 5) {
    const date = parseISODate(anchor)!;
    const dow = date.getDay(); // 0=Sun … 6=Sat
    // Monday of this week (Sun→next Mon would leave weekend; use prior Mon).
    const toMon = dow === 0 ? -6 : 1 - dow;
    const fromIso = addDaysISO(anchor, toMon)!;
    const days: string[] = [];
    for (let i = 0; i < 5; i += 1) days.push(addDaysISO(fromIso, i)!);
    return { fromIso, toIso: days[4]!, days, count };
  }
  // count === 3: always Tue–Wed–Thu of the Sun–Sat week containing anchor.
  const date = parseISODate(anchor)!;
  const dow = date.getDay(); // 0=Sun … 6=Sat
  const toTue = 2 - dow;
  const fromIso = addDaysISO(anchor, toTue)!;
  const days = [fromIso, addDaysISO(fromIso, 1)!, addDaysISO(fromIso, 2)!];
  return { fromIso, toIso: days[2]!, days, count };
}

/** Step the multiday window by one calendar week (3/5/7 are week-scoped sets). */
export function shiftMultiday(anchorIso: string, count: MultidayCount, dir: -1 | 1): string {
  void count;
  return addDaysISO(anchorIso, dir * 7) ?? anchorIso;
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
