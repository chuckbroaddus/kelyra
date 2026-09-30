import { isoInRange } from './dates.ts';
import type { GradingCalendar, MarkingPeriod, PeriodKind } from './types.ts';

export function childrenOf(calendar: GradingCalendar, parentId: string | null): MarkingPeriod[] {
  return calendar.periods
    .filter((p) => p.parent_id === parentId)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
}

export function periodById(calendar: GradingCalendar, id: string): MarkingPeriod | undefined {
  return calendar.periods.find((p) => p.id === id || p.code === id);
}

export function periodsOfKind(calendar: GradingCalendar, kind: PeriodKind): MarkingPeriod[] {
  return calendar.periods
    .filter((p) => p.kind === kind)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
}

/** Credit-bearing terms (semesters / trimesters / college term). */
export function creditTerms(calendar: GradingCalendar): MarkingPeriod[] {
  return periodsOfKind(calendar, 'credit_term');
}

/**
 * Progress checkpoints (FR-CAL-05). kind === 'progress' only — never transcript rows.
 * When parentId is set, only children of that marking period.
 */
export function progressCheckpoints(
  calendar: GradingCalendar,
  parentId?: string | null,
): MarkingPeriod[] {
  const all = periodsOfKind(calendar, 'progress');
  if (parentId === undefined) return all;
  return all.filter((p) => p.parent_id === parentId);
}

/**
 * Finest grain period covering `date` (ISO YYYY-MM-DD).
 * Prefers marking_period, then credit_term, then year. Skips progress + exam.
 */
export function periodForDate(
  calendar: GradingCalendar,
  date: string,
): MarkingPeriod | null {
  const iso = date.trim().slice(0, 10);
  const preference: PeriodKind[] = ['marking_period', 'credit_term', 'year'];
  for (const kind of preference) {
    const hits = calendar.periods
      .filter((p) => p.kind === kind && isoInRange(iso, p.start_date, p.end_date))
      .sort((a, b) => a.sort_order - b.sort_order);
    if (hits.length > 0) return hits[0]!;
  }
  return null;
}

/** Marking periods that roll into a credit term (direct children, marking_period kind). */
export function markingPeriodsOfTerm(calendar: GradingCalendar, termId: string): MarkingPeriod[] {
  return childrenOf(calendar, termId).filter((p) => p.kind === 'marking_period');
}

export function yearPeriod(calendar: GradingCalendar): MarkingPeriod | undefined {
  return periodsOfKind(calendar, 'year')[0];
}
