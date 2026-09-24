/**
 * Sticky calendar period titles (Month / Week / Day) + Week↔Day morph segments.
 * Keep strings continuous across Month→Week; morph text at Week↔Day.
 */
import { parseISODate } from '../date/iso.ts';

/** Morph insert (day digits) completes by this progress; weekday letters follow. */
export const MORPH_DAY_INSERT_END = 0.4;

export type PeriodTitleMorphSegments = {
  /** Long month name, e.g. "February". */
  month: string;
  /** Day + comma, e.g. "4," — inserted between month and year. */
  dayPart: string;
  /** Calendar year, e.g. "2026". */
  year: string;
  /** Long weekday, e.g. "Wednesday". */
  weekday: string;
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

/** Segments for `February 4, 2026, Wednesday` morph. */
export function dayPeriodTitleSegments(
  iso: string,
  locale?: string,
): PeriodTitleMorphSegments | null {
  const d = parseISODate(iso);
  if (!d) return null;
  const month = d.toLocaleDateString(locale, { month: 'long' });
  const dayNum = d.getDate();
  const year = String(d.getFullYear());
  const weekday = d.toLocaleDateString(locale, { weekday: 'long' });
  return {
    month,
    dayPart: `${dayNum},`,
    year,
    weekday,
  };
}

/** `February 4, 2026, Wednesday` (month first; weekday after year). */
export function formatDayPeriodTitle(iso: string, locale?: string): string {
  const seg = dayPeriodTitleSegments(iso, locale);
  if (!seg) return iso;
  return joinDayPeriodTitle(seg);
}

export function joinDayPeriodTitle(seg: PeriodTitleMorphSegments): string {
  return `${seg.month} ${seg.dayPart} ${seg.year}, ${seg.weekday}`;
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

/** Week→Day morph duration (runs alongside the week-day drill spring). */
export const PERIOD_TITLE_MORPH_IN_MS = 480;

/** Day→Week reverse morph (starts with Day exit, finishes during climb). */
export const PERIOD_TITLE_MORPH_OUT_MS = 340;

/** 0→1 progress for inserting `dayPart` between month and year (year slides right). */
export function morphDayInsertProgress(progress: number): number {
  'worklet';
  const p = clamp01(progress);
  if (p >= MORPH_DAY_INSERT_END) return 1;
  return p / MORPH_DAY_INSERT_END;
}

/**
 * How many weekday letters are visible (0…weekdayLen).
 * Letters roll in one by one after the day insert completes (Y, We, Wed…).
 */
export function morphWeekdayLetterCount(progress: number, weekdayLen: number): number {
  'worklet';
  const p = clamp01(progress);
  if (weekdayLen <= 0) return 0;
  if (p <= MORPH_DAY_INSERT_END) return 0;
  const t = (p - MORPH_DAY_INSERT_END) / (1 - MORPH_DAY_INSERT_END);
  return Math.min(weekdayLen, Math.max(1, Math.ceil(t * weekdayLen - 1e-9)));
}

/**
 * Progressive title string at morph progress (reduceMotion snap + unit tests).
 * 0 → `February 2026`; 1 → `February 4, 2026, Wednesday`.
 * The `, ` before the weekday appears together with its first letter.
 */
export function formatMorphTitleAtProgress(
  seg: PeriodTitleMorphSegments,
  progress: number,
): string {
  const p = clamp01(progress);
  if (p <= 0) return joinMonthYearTitle(seg);
  if (p >= 1) return joinDayPeriodTitle(seg);
  const insert = morphDayInsertProgress(p);
  const shown = Math.ceil(insert * seg.dayPart.length - 1e-9);
  const mid = shown <= 0 ? ' ' : ` ${seg.dayPart.slice(0, shown)} `;
  const core = `${seg.month}${mid}${seg.year}`;
  const letters = morphWeekdayLetterCount(p, seg.weekday.length);
  if (letters <= 0) return core;
  return `${core}, ${seg.weekday.slice(0, letters)}`;
}
