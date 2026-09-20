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
 * Must be today's ISO — not the Sunday of the enclosing week — so today stays
 * visible in center-3 and Mon–Fri windows (CAL-R5-04 / CAL-29 Today essential).
 */
export function multidayTodayAnchor(todayIso?: string | null, now = new Date()): string {
  return todayIso && parseISODate(todayIso) ? todayIso : todayISO(now);
}

/**
 * Inclusive local range for 3/5/7 (CAL-R5-04):
 * - 3 → center on anchor (yesterday · today · tomorrow) → TUE WED THU when today=Wed
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
  // count === 3: center on anchor
  const fromIso = addDaysISO(anchor, -1)!;
  const days = [fromIso, anchor, addDaysISO(anchor, 1)!];
  return { fromIso, toIso: days[2]!, days, count };
}

/** Step the multiday window: 3 by 3 days; 5/7 by one calendar week. */
export function shiftMultiday(anchorIso: string, count: MultidayCount, dir: -1 | 1): string {
  const step = count === 3 ? 3 : 7;
  return addDaysISO(anchorIso, dir * step) ?? anchorIso;
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
