import { addDaysISO, parseISODate, todayISO } from '../date/iso.ts';

/** Single local day as Agenda/Day range. */
export function dayRangeContaining(anchorIso?: string | null, now = new Date()): {
  fromIso: string;
  toIso: string;
  day: string;
} {
  const day = anchorIso && parseISODate(anchorIso) ? anchorIso : todayISO(now);
  return { fromIso: day, toIso: day, day };
}

export function shiftDay(iso: string, days: number): string {
  return addDaysISO(iso, days) ?? iso;
}

/** Agenda window: from today (or anchor) forward N days inclusive. */
export function agendaRangeFrom(anchorIso?: string | null, days = 14, now = new Date()): {
  fromIso: string;
  toIso: string;
  days: string[];
} {
  const fromIso = anchorIso && parseISODate(anchorIso) ? anchorIso : todayISO(now);
  const list: string[] = [];
  for (let i = 0; i < days; i += 1) {
    list.push(addDaysISO(fromIso, i)!);
  }
  return { fromIso, toIso: list[list.length - 1]!, days: list };
}

export function dayRpcBounds(fromIso: string, toIso: string): { from: string; to: string } {
  const start = parseISODate(fromIso);
  const end = parseISODate(toIso);
  if (!start || !end) {
    return { from: `${fromIso}T00:00:00.000Z`, to: `${toIso}T23:59:59.999Z` };
  }
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function formatDayHeading(iso: string, locale?: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' });
}
