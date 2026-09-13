import { addDaysISO, parseISODate, toISODate, todayISO } from '../date/iso.ts';

/** Sunday-start local week containing `anchor` (ISO date or today). */
export function weekRangeContaining(anchorIso?: string | null, now = new Date()): {
  fromIso: string;
  toIso: string;
  days: string[];
} {
  const anchor = anchorIso && parseISODate(anchorIso) ? anchorIso : todayISO(now);
  const date = parseISODate(anchor)!;
  const dow = date.getDay(); // 0=Sun
  const fromIso = addDaysISO(anchor, -dow)!;
  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(addDaysISO(fromIso, i)!);
  }
  const toIso = days[6]!;
  return { fromIso, toIso, days };
}

/** Inclusive RPC window: local day start → end of last day (UTC instants via local noon±). */
export function weekRpcBounds(fromIso: string, toIso: string): { from: string; to: string } {
  const start = parseISODate(fromIso);
  const end = parseISODate(toIso);
  if (!start || !end) {
    return { from: `${fromIso}T00:00:00.000Z`, to: `${toIso}T23:59:59.999Z` };
  }
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function shiftWeek(fromIso: string, weeks: number): string {
  return addDaysISO(fromIso, weeks * 7) ?? fromIso;
}

export function weekdayShort(iso: string, locale?: string): string {
  const d = parseISODate(iso);
  if (!d) return '';
  return d.toLocaleDateString(locale, { weekday: 'short' });
}

export function dayNumber(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso.slice(8, 10);
  return String(d.getDate());
}

export function isSameDayIso(a: string, b: string): boolean {
  return a === b;
}

export function todayInWeek(days: string[], now = new Date()): string | null {
  const t = todayISO(now);
  return days.includes(t) ? t : null;
}

export { toISODate, todayISO };
