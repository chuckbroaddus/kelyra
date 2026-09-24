/**
 * Sticky calendar period titles (Month / Week / Day) + Week↔Day morph segments.
 * Keep strings continuous across Month→Week; morph text at Week↔Day.
 *
 * Week: `February 2026` (long month). Day: `Feb 4, 2026, Wed` (short month + short weekday).
 * Morph: month trims `February`→`Feb`, then `4,` slides in, then `Wed` types in.
 */
import { parseISODate } from '../date/iso.ts';

/** Month word finishes trimming long→short by this progress. */
export const MORPH_MONTH_TRIM_END = 0.3;
/** Day insert (`4,`) completes by this progress; weekday letters follow. */
export const MORPH_DAY_INSERT_END = 0.6;

export type PeriodTitleMorphSegments = {
  /** Long month name, e.g. "February" (Week / collapsed title). */
  month: string;
  /** Short month name, e.g. "Feb" (Day title). */
  monthShort: string;
  /** Day + comma, e.g. "4," — inserted between month and year. */
  dayPart: string;
  /** Calendar year, e.g. "2026". */
  year: string;
  /** Short weekday, e.g. "Wed" (Day title). */
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
  return {
    month: d.toLocaleDateString(locale, { month: 'long' }),
    monthShort: d.toLocaleDateString(locale, { month: 'short' }),
    dayPart: `${d.getDate()},`,
    year: String(d.getFullYear()),
    weekday: d.toLocaleDateString(locale, { weekday: 'short' }),
    weekdayLong: d.toLocaleDateString(locale, { weekday: 'long' }),
  };
}

/** `Feb 4, 2026, Wed` (short month first; short weekday after year). */
export function formatDayPeriodTitle(iso: string, locale?: string): string {
  const seg = dayPeriodTitleSegments(iso, locale);
  if (!seg) return iso;
  return joinDayPeriodTitle(seg);
}

/** Visible Day title: `Feb 4, 2026, Wed`. */
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

/** Week→Day morph duration (runs alongside the week-day drill spring). */
export const PERIOD_TITLE_MORPH_IN_MS = 560;

/** Day→Week reverse morph (starts with Day exit, finishes during climb). */
export const PERIOD_TITLE_MORPH_OUT_MS = 420;

/**
 * How many letters of the LONG month are visible while it trims to the short form
 * (`February` 8 → `Feb` 3). Only meaningful when short is a prefix of long.
 */
export function morphMonthLetterCount(progress: number, longLen: number, shortLen: number): number {
  'worklet';
  const p = clamp01(progress);
  if (longLen <= shortLen) return longLen;
  const t = p >= MORPH_MONTH_TRIM_END ? 1 : p / MORPH_MONTH_TRIM_END;
  return longLen - Math.round(t * (longLen - shortLen));
}

/** 0→1 progress for inserting `dayPart` between month and year (after the month trim). */
export function morphDayInsertProgress(progress: number): number {
  'worklet';
  const p = clamp01(progress);
  if (p <= MORPH_MONTH_TRIM_END) return 0;
  if (p >= MORPH_DAY_INSERT_END) return 1;
  return (p - MORPH_MONTH_TRIM_END) / (MORPH_DAY_INSERT_END - MORPH_MONTH_TRIM_END);
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
  const t = (p - MORPH_DAY_INSERT_END) / (1 - MORPH_DAY_INSERT_END);
  return Math.min(weekdayLen, Math.max(1, Math.ceil(t * weekdayLen - 1e-9)));
}

/**
 * Month word at a letter count. Prefix locales (`Feb` ⊂ `February`) trim letter by
 * letter; others swap to the short form halfway through the trim.
 */
export function morphMonthText(seg: PeriodTitleMorphSegments, letterCount: number): string {
  const { month, monthShort } = seg;
  if (month.startsWith(monthShort)) return month.slice(0, Math.max(monthShort.length, letterCount));
  const mid = (month.length + monthShort.length) / 2;
  return letterCount > mid ? month : monthShort;
}

/**
 * Progressive title string at morph progress (reduceMotion snap + unit tests).
 * 0 → `February 2026`; 1 → `Feb 4, 2026, Wed`.
 * The `, ` before the weekday appears together with its first letter.
 */
export function formatMorphTitleAtProgress(
  seg: PeriodTitleMorphSegments,
  progress: number,
): string {
  const p = clamp01(progress);
  if (p <= 0) return joinMonthYearTitle(seg);
  if (p >= 1) return joinDayPeriodTitle(seg);
  const monthText = morphMonthText(
    seg,
    morphMonthLetterCount(p, seg.month.length, seg.monthShort.length),
  );
  const insert = morphDayInsertProgress(p);
  const shown = Math.ceil(insert * seg.dayPart.length - 1e-9);
  const mid = shown <= 0 ? ' ' : ` ${seg.dayPart.slice(0, shown)} `;
  const core = `${monthText}${mid}${seg.year}`;
  const letters = morphWeekdayLetterCount(p, seg.weekday.length);
  if (letters <= 0) return core;
  return `${core}, ${seg.weekday.slice(0, letters)}`;
}
