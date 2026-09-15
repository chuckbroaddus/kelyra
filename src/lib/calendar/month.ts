import {
  addDaysISO,
  daysInMonth,
  isoFromParts,
  partsFromISO,
  todayISO,
} from '../date/iso.ts';

export function monthContaining(anchorIso?: string | null, now = new Date()): {
  year: number;
  monthIndex0: number;
  fromIso: string;
  toIso: string;
  label: string;
} {
  const iso = anchorIso && partsFromISO(anchorIso) ? anchorIso : todayISO(now);
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

export function shiftMonth(anchorIso: string, deltaMonths: number): string {
  const parts = partsFromISO(anchorIso);
  if (!parts) return anchorIso;
  const d = new Date(parts.year, parts.month - 1 + deltaMonths, 1, 12, 0, 0, 0);
  const day = Math.min(parts.day, daysInMonth(d.getFullYear(), d.getMonth()));
  return isoFromParts(d.getFullYear(), d.getMonth() + 1, day) ?? anchorIso;
}

/** Days in the painted month grid including leading/trailing pads from adjacent months. */
export function monthGridDays(year: number, monthIndex0: number, weekStartsOn: 0 | 1 = 0): string[] {
  const first = new Date(year, monthIndex0, 1, 12, 0, 0, 0);
  const startPad = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDaysISO(isoFromParts(year, monthIndex0 + 1, 1)!, -startPad)!;
  const total = daysInMonth(year, monthIndex0);
  const cells = startPad + total;
  const rows = Math.ceil(cells / 7);
  const days: string[] = [];
  for (let i = 0; i < rows * 7; i += 1) {
    days.push(addDaysISO(start, i)!);
  }
  return days;
}
