/**
 * Sticky calendar period titles (Month / Week / Day) + Week↔Day morph segments.
 * Keep strings continuous across Month→Week; morph text at Week↔Day.
 *
 * Week: `February 2026` (long month). Day: `Feb. 4, 2026, Wed.` (abbreviations carry a period).
 * Morph (three sequential phases, reversed for Day→Week):
 *   1. `February` shrinks to `Feb.` (tail clips away, period fades in); the year rides left.
 *   2. The year shifts right as `4,` appears.
 *   3. A comma appears at once, then `Wed` slides out to the right from behind it.
 */
import { parseISODate } from '../date/iso.ts';

/** Phase 1 (month shrink) ends here. */
export const MORPH_MONTH_TRIM_END = 1 / 3;
/** Phase 2 (`4,` insert, year shifts right) ends here; phase 3 (comma + weekday) follows. */
export const MORPH_DAY_INSERT_END = 2 / 3;

export type PeriodTitleMorphSegments = {
  /** Long month name, e.g. "February" (Week / collapsed title). */
  month: string;
  /** Abbreviated month with period, e.g. "Feb." (Day title). Unabbreviated months stay bare ("May"). */
  monthShort: string;
  /** Day + comma, e.g. "4," — inserted between month and year. */
  dayPart: string;
  /** Calendar year, e.g. "2026". */
  year: string;
  /** Abbreviated weekday with period, e.g. "Wed." (Day title). */
  weekday: string;
  /** Long weekday, e.g. "Wednesday" (spoken label only). */
  weekdayLong: string;
};

/** `February 2026` — same shape as `monthContaining(...).label`. */
export function formatMonthYearTitle(
  year: number,
  monthIndex0: number,
  locale?: string,
): string {
  if (!Number.isFinite(year) || monthIndex0 < 0 || monthIndex0 > 11) {
    return '';
  }
  return new Date(year, monthIndex0, 1, 12, 0, 0, 0).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

/** `{ month: 'February', year: '2026' }` — collapsed sticky title pieces. */
export function monthYearTitleParts(
  year: number,
  monthIndex0: number,
  locale?: string,
): { month: string; year: string } {
  if (!Number.isFinite(year) || monthIndex0 < 0 || monthIndex0 > 11) {
    return { month: '', year: String(year) };
  }
  const month = new Date(year, monthIndex0, 1, 12, 0, 0, 0).toLocaleDateString(locale, {
    month: 'long',
  });
  return { month, year: String(year) };
}

/** Segments for the `February 2026` ↔ `Feb 4, 2026, Wed` morph. */
export function dayPeriodTitleSegments(
  iso: string,
  locale?: string,
): PeriodTitleMorphSegments | null {
  const d = parseISODate(iso);
  if (!d) return null;
  const month = d.toLocaleDateString(locale, { month: 'long' });
  const weekdayLong = d.toLocaleDateString(locale, { weekday: 'long' });
  return {
    month,
    monthShort: withAbbrevPeriod(d.toLocaleDateString(locale, { month: 'short' }), month),
    dayPart: `${d.getDate()},`,
    year: String(d.getFullYear()),
    weekday: withAbbrevPeriod(d.toLocaleDateString(locale, { weekday: 'short' }), weekdayLong),
    weekdayLong,
  };
}

/** `Feb`→`Feb.`; leaves full words (`May`) and locale forms that already end in `.` alone. */
export function withAbbrevPeriod(short: string, full: string): string {
  if (!short || short === full || short.endsWith('.')) return short;
  return `${short}.`;
}

/** `Feb. 4, 2026, Wed.` (abbreviated month first; abbreviated weekday after year). */
export function formatDayPeriodTitle(iso: string, locale?: string): string {
  const seg = dayPeriodTitleSegments(iso, locale);
  if (!seg) return iso;
  return joinDayPeriodTitle(seg);
}

/** Visible Day title: `Feb. 4, 2026, Wed.`. */
export function joinDayPeriodTitle(seg: PeriodTitleMorphSegments): string {
  return `${seg.monthShort} ${seg.dayPart} ${seg.year}, ${seg.weekday}`;
}

/** Spoken Day title (VoiceOver): `February 4, 2026, Wednesday`. */
export function spokenDayPeriodTitle(seg: PeriodTitleMorphSegments): string {
  return `${seg.month} ${seg.dayPart} ${seg.year}, ${seg.weekdayLong}`;
}

export function joinMonthYearTitle(seg: Pick<PeriodTitleMorphSegments, 'month' | 'year'>): string {
  return `${seg.month} ${seg.year}`;
}

/**
 * Defined before its worklet callers: the Reanimated plugin turns worklet
 * function declarations into non-hoisted consts, so a later clamp01 is
 * undefined when morph* run (device crash, #215).
 */
function clamp01(p: number): number {
  'worklet';
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return p;
}

/** Per-phase ease. Declared before callers (Reanimated no-hoist). */
function easeInOutCubic(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Eased 0→1 inside [start, end] of overall progress. Declared before callers. */
function phaseProgress(progress: number, start: number, end: number): number {
  'worklet';
  const p = clamp01(progress);
  if (p <= start) return 0;
  if (p >= end) return 1;
  return easeInOutCubic((p - start) / (end - start));
}

/**
 * Week→Day morph duration. Overall progress is LINEAR; each phase eases itself so
 * the three steps read as separate beats (runs alongside the week-day drill spring).
 */
export const PERIOD_TITLE_MORPH_IN_MS = 720;

/** Day→Week reverse morph (same phases backwards). */
export const PERIOD_TITLE_MORPH_OUT_MS = 540;

/** Phase 1: 0→1 as `February` shrinks to `Feb` (year rides left). */
export function morphMonthTrimProgress(progress: number): number {
  'worklet';
  return phaseProgress(progress, 0, MORPH_MONTH_TRIM_END);
}

/** Phase 3: 0→1 as the weekday slides out to the right from behind the comma. */
export function morphWeekdayRevealProgress(progress: number): number {
  'worklet';
  return phaseProgress(progress, MORPH_DAY_INSERT_END, 1);
}

/** Phase 3 starts with the comma appearing at once (no fade). */
export function morphCommaVisible(progress: number): boolean {
  'worklet';
  return clamp01(progress) > MORPH_DAY_INSERT_END;
}

/**
 * Phase-1 pieces: `Feb` stays, `ruary` clips away, `.` fades in. null when the
 * abbreviation is not a prefix of the long month (swap at the midpoint instead).
 */
export function monthTrimParts(
  seg: Pick<PeriodTitleMorphSegments, 'month' | 'monthShort'>,
): { stem: string; tail: string; dot: string } | null {
  const dot = seg.monthShort.endsWith('.') && !seg.month.endsWith('.') ? '.' : '';
  const stem = dot ? seg.monthShort.slice(0, -1) : seg.monthShort;
  if (!seg.month.startsWith(stem)) return null;
  return { stem, tail: seg.month.slice(stem.length), dot };
}

/** Phase 2: 0→1 as `dayPart` opens between month and year (year shifts right). */
export function morphDayInsertProgress(progress: number): number {
  'worklet';
  return phaseProgress(progress, MORPH_MONTH_TRIM_END, MORPH_DAY_INSERT_END);
}

/**
 * How many weekday letters are visible (0…weekdayLen).
 * Letters roll in one by one after the day insert completes (W, We, Wed).
 */
export function morphWeekdayLetterCount(progress: number, weekdayLen: number): number {
  'worklet';
  const p = clamp01(progress);
  if (weekdayLen <= 0) return 0;
  if (p <= MORPH_DAY_INSERT_END) return 0;
  const t = morphWeekdayRevealProgress(p);
  return Math.min(weekdayLen, Math.max(1, Math.ceil(t * weekdayLen - 1e-9)));
}

/**
 * Month word at phase-1 progress `trim` (string form for reduceMotion + tests).
 * Prefix: `February` → `Febru` → `Feb` → `Feb.` (period lands when the trim does).
 * Non-prefix: swap long→short at the midpoint.
 */
export function morphMonthText(seg: PeriodTitleMorphSegments, trim: number): string {
  const t = clamp01(trim);
  if (t >= 1) return seg.monthShort;
  if (t <= 0) return seg.month;
  const parts = monthTrimParts(seg);
  if (!parts) return t < 0.5 ? seg.month : seg.monthShort;
  return parts.stem + parts.tail.slice(0, Math.round((1 - t) * parts.tail.length));
}

/**
 * Progressive title string at morph progress (reduceMotion snap + unit tests).
 * 0 → `February 2026`; 1 → `Feb. 4, 2026, Wed.`.
 * The `, ` before the weekday appears together with its first letter.
 */
export function formatMorphTitleAtProgress(
  seg: PeriodTitleMorphSegments,
  progress: number,
): string {
  const p = clamp01(progress);
  if (p <= 0) return joinMonthYearTitle(seg);
  if (p >= 1) return joinDayPeriodTitle(seg);
  const monthText = morphMonthText(seg, morphMonthTrimProgress(p));
  const insert = morphDayInsertProgress(p);
  const shown = Math.ceil(insert * seg.dayPart.length - 1e-9);
  const mid = shown <= 0 ? ' ' : ` ${seg.dayPart.slice(0, shown)} `;
  const core = `${monthText}${mid}${seg.year}`;
  const letters = morphWeekdayLetterCount(p, seg.weekday.length);
  if (letters <= 0) return core;
  return `${core}, ${seg.weekday.slice(0, letters)}`;
}
