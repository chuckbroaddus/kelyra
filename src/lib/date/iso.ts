/** Date-only ISO helpers. Never time-of-day. Local calendar math only. */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function isISODate(value: string | null | undefined): value is string {
  if (!value) return false;
  return Boolean(parseISODate(value));
}

/**
 * Coerce birthday storage/input to ISO YYYY-MM-DD.
 * Empty → null. Valid ISO or loose ("Mar 14 2017", "3/14/2017") → ISO.
 * Unparsable non-empty → null (caller must not silent-delete; see birthdayForSave).
 */
export function coerceBirthdayISO(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;
  if (isISODate(value)) return value;
  return parseLooseDate(value);
}

export type BirthdaySaveResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Save path for birthday draft. Never silent-deletes an unparsable present value.
 * Empty → clear (null). Parsable in today−22y…today−3y → ISO.
 * Unparsable or out-of-range → error, no write (DATE-12; no silent clamp).
 */
export function birthdayForSave(draftRaw: string, now = new Date()): BirthdaySaveResult {
  const raw = draftRaw.trim();
  if (!raw) return { ok: true, value: null };
  const iso = coerceBirthdayISO(raw);
  if (!iso) return { ok: false, error: 'Enter a valid birthday' };
  const { min, max } = birthdayBounds(now);
  const err = rangeError(iso, min, max);
  if (err) return { ok: false, error: err };
  return { ok: true, value: iso };
}

/** True when draft matches stored (raw or coerced ISO). Unchanged optional birthday must not block name-only save. */
export function birthdayUnchanged(draftRaw: string, storedRaw: string | null | undefined): boolean {
  const draft = draftRaw.trim();
  const stored = (storedRaw ?? '').trim();
  if (draft === stored) return true;
  const draftIso = coerceBirthdayISO(draft);
  const storedIso = coerceBirthdayISO(stored);
  return Boolean(draftIso && storedIso && draftIso === storedIso);
}

/** Local calendar YYYY-MM-DD from a Date (ignores clock / UTC drift). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse ISO date-only into a local Date at noon (avoids DST edge flips). */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = ISO_RE.exec(iso.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function addDaysISO(iso: string, days: number): string | null {
  const date = parseISODate(iso);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addYearsISO(iso: string, years: number): string | null {
  const date = parseISODate(iso);
  if (!date) return null;
  const day = date.getDate();
  date.setFullYear(date.getFullYear() + years);
  // Feb 29 → clamp if needed
  if (date.getDate() !== day) date.setDate(0);
  return toISODate(date);
}

export function compareISO(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function clampDay(year: number, monthIndex0: number, day: number): number {
  const max = daysInMonth(year, monthIndex0);
  return Math.min(Math.max(1, day), max);
}

export function partsFromISO(iso: string): { year: number; month: number; day: number } | null {
  const date = parseISODate(iso);
  if (!date) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

export function isoFromParts(year: number, month: number, day: number): string | null {
  const clamped = clampDay(year, month - 1, day);
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
  return parseISODate(iso) ? iso : null;
}

/** Locale display of a full date (not raw ISO). */
export function formatLocaleDate(iso: string | null | undefined, locale?: string): string | null {
  const date = parseISODate(iso ?? null);
  if (!date) return null;
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Parent read: month/day only (e.g. Mar 14). */
export function formatBirthdayMd(iso: string | null | undefined, locale?: string): string | null {
  const date = parseISODate(iso ?? null);
  if (!date) return null;
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export type DateMode = 'birthday' | 'due' | 'generic';

export function birthdayBounds(now = new Date()): { min: string; max: string } {
  const today = toISODate(now);
  return {
    min: addYearsISO(today, -22)!,
    max: addYearsISO(today, -3)!,
  };
}

/** Smart open default when committed value is empty. */
export function smartDefaultISO(mode: DateMode | undefined, now = new Date()): string {
  const today = toISODate(now);
  if (mode === 'birthday') return addYearsISO(today, -10)!;
  if (mode === 'due') return addDaysISO(today, 1)!;
  return today;
}

export function rangeError(
  iso: string,
  min?: string | null,
  max?: string | null,
): string | null {
  if (!parseISODate(iso)) return 'Enter a valid date';
  if (min && compareISO(iso, min) < 0) {
    return `Pick a date on or after ${formatLocaleDate(min)}`;
  }
  if (max && compareISO(iso, max) > 0) {
    return `Pick a date on or before ${formatLocaleDate(max)}`;
  }
  return null;
}

/**
 * Parse typed dates: ISO, locale numeric, or loose "Mar 14 2017".
 * Returns ISO or null. Does not clamp to min/max.
 */
export function parseLooseDate(raw: string, locale?: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (ISO_RE.test(value)) {
    return parseISODate(value) ? value : null;
  }

  const monthName = parseMonthNameDate(value);
  if (monthName) return monthName;

  const numeric = parseNumericDate(value, locale);
  if (numeric) return numeric;

  // Last resort: Date.parse for unambiguous forms; verify round-trip parts.
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) return null;
  // Prefer local Y/M/D from the parsed instant when the string had no TZ.
  return toISODate(date);
}

function parseMonthNameDate(value: string): string | null {
  const match =
    /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(value) ||
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})$/.exec(value);
  if (!match) return null;
  let monthToken: string;
  let day: number;
  let year: number;
  if (/^[A-Za-z]+$/.test(match[1]!)) {
    monthToken = match[1]!;
    day = Number(match[2]);
    year = Number(match[3]);
  } else {
    day = Number(match[1]);
    monthToken = match[2]!;
    year = Number(match[3]);
  }
  const month = monthIndexFromToken(monthToken);
  if (month == null || !year || !day) return null;
  return isoFromParts(year, month + 1, day);
}

function monthIndexFromToken(token: string): number | null {
  const lower = token.toLowerCase();
  const shortIdx = MONTH_SHORT.findIndex((m) => m.toLowerCase() === lower.slice(0, 3));
  if (shortIdx >= 0) return shortIdx;
  const longIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === lower);
  return longIdx >= 0 ? longIdx : null;
}

function prefersDayFirst(locale?: string): boolean {
  const tag = locale ?? (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : 'en-US');
  // US and similar: month first. Most others: day first for numeric.
  if (/^en-US\b/i.test(tag) || /^en-PH\b/i.test(tag) || /^en-CA\b/i.test(tag)) return false;
  try {
    const parts = new Intl.DateTimeFormat(tag, { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(
      new Date(2000, 10, 22),
    );
    const first = parts.find((p) => p.type === 'day' || p.type === 'month');
    return first?.type === 'day';
  } catch {
    return false;
  }
}

function parseNumericDate(value: string, locale?: string): string | null {
  const match = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})$/.exec(value);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = Number(match[3]);
  let year: number;
  let month: number;
  let day: number;
  if (match[1]!.length === 4) {
    year = a;
    month = b;
    day = c;
  } else if (match[3]!.length === 4) {
    year = c;
    if (prefersDayFirst(locale)) {
      day = a;
      month = b;
    } else {
      month = a;
      day = b;
    }
  } else {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000) return null;
  return isoFromParts(year, month, day);
}

/** Wheel column order for the device locale: 'mdy' | 'dmy' | 'ymd'. */
export function localeDateOrder(locale?: string): 'mdy' | 'dmy' | 'ymd' {
  const tag = locale ?? (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : 'en-US');
  try {
    const parts = new Intl.DateTimeFormat(tag, { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(
      new Date(2001, 1, 3),
    );
    const order = parts.filter((p) => p.type === 'year' || p.type === 'month' || p.type === 'day').map((p) => p.type);
    const key = order.join('');
    if (key.startsWith('daymonth')) return 'dmy';
    if (key.startsWith('year')) return 'ymd';
    return 'mdy';
  } catch {
    return 'mdy';
  }
}

export function monthLabels(locale?: string): string[] {
  const tag = locale;
  return MONTH_NAMES.map((_, index) => {
    const date = new Date(2000, index, 1);
    return date.toLocaleDateString(tag, { month: 'short' });
  });
}

export function weekdayLabels(weekStartsOn: 0 | 1 = 0, locale?: string): string[] {
  // 2023-01-01 was Sunday.
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = (weekStartsOn + i) % 7;
    const date = new Date(2023, 0, 1 + day);
    labels.push(date.toLocaleDateString(locale, { weekday: 'narrow' }));
  }
  return labels;
}

export function buildMonthGrid(
  year: number,
  monthIndex0: number,
  weekStartsOn: 0 | 1 = 0,
): Array<Array<{ day: number; iso: string } | null>> {
  const first = new Date(year, monthIndex0, 1, 12, 0, 0, 0);
  const startPad = (first.getDay() - weekStartsOn + 7) % 7;
  const total = daysInMonth(year, monthIndex0);
  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= total; day++) {
    cells.push({ day, iso: isoFromParts(year, monthIndex0 + 1, day)! });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: Array<Array<{ day: number; iso: string } | null>> = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function yearOptions(min?: string | null, max?: string | null, center?: string | null): number[] {
  const centerYear = partsFromISO(center ?? todayISO())?.year ?? new Date().getFullYear();
  const minYear = partsFromISO(min ?? '')?.year ?? centerYear - 100;
  const maxYear = partsFromISO(max ?? '')?.year ?? centerYear + 50;
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);
  if (!years.length) years.push(centerYear);
  return years;
}
