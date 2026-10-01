/**
 * GB-10 period scoping for gradebook columns / averages.
 * Pure. When calendar is null, legacy GradeTerm filter behavior is bit-identical.
 */
import {
  childrenOf,
  legacyFilterCodes,
  nineWeeksCodeToLegacy,
  periodById,
  periodForDate,
  type GradingCalendar,
  type MarkingPeriod,
} from '../../lib/grade/calendar/index.ts';
import {
  gradeTermLabel,
  matchesGradeTermFilter,
  parseGradeTerm,
  type GradeTerm,
} from '../../lib/grade/marks.ts';
import { sixWeeksLabel } from '../ui/periodGlyphs.ts';

export type ScopeAssignment = {
  id?: string;
  marking_period_id?: string | null;
  term?: string | null;
  due_at?: string | null;
  created_at?: string | null;
};

/** Normalize glyph / filter ids (q1, 6w1, S1) for case-insensitive compare. */
export function normPeriodKey(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Resolve a filter chip id (glyph id, period code, or period uuid) to a calendar period.
 */
export function resolveFilterPeriod(
  calendar: GradingCalendar,
  filterId: string,
): MarkingPeriod | null {
  const key = normPeriodKey(filterId);
  if (!key || key === 'all') return null;
  const byId = periodById(calendar, filterId);
  if (byId) return byId;
  return (
    calendar.periods.find(
      (p) => normPeriodKey(p.id) === key || normPeriodKey(p.code) === key,
    ) ?? null
  );
}

/**
 * Period ids + codes included by a filter chip.
 * Credit terms include child marking periods; year includes everything transcript-ish.
 */
export function includedPeriodKeys(
  calendar: GradingCalendar,
  filterId: string,
): { ids: Set<string>; codes: Set<string> } {
  const ids = new Set<string>();
  const codes = new Set<string>();
  const add = (p: MarkingPeriod) => {
    ids.add(p.id);
    codes.add(normPeriodKey(p.code));
    codes.add(normPeriodKey(p.id));
  };

  if (normPeriodKey(filterId) === 'all' || !filterId) {
    for (const p of calendar.periods) add(p);
    return { ids, codes };
  }

  const root = resolveFilterPeriod(calendar, filterId);
  if (!root) {
    // Unknown chip: still allow code-only match on the raw filter string.
    codes.add(normPeriodKey(filterId));
    return { ids, codes };
  }

  add(root);

  if (root.kind === 'year') {
    for (const p of calendar.periods) {
      if (p.kind === 'progress') continue;
      add(p);
    }
    return { ids, codes };
  }

  if (root.kind === 'credit_term') {
    for (const child of childrenOf(calendar, root.id)) {
      if (child.kind === 'marking_period' || child.kind === 'exam') add(child);
      // templates often parent by code; also try parent_id === root.code
    }
    // Templates may wire parent_id to code string before SQL uuids exist.
    for (const p of calendar.periods) {
      if (
        (p.parent_id === root.id || p.parent_id === root.code) &&
        (p.kind === 'marking_period' || p.kind === 'exam')
      ) {
        add(p);
      }
    }
  }

  return { ids, codes };
}

function dueIso(assignment: ScopeAssignment): string | null {
  const raw = assignment.due_at ?? assignment.created_at ?? null;
  if (!raw) return null;
  return String(raw).trim().slice(0, 10) || null;
}

/**
 * Whether an assignment belongs under the selected period filter.
 * Priority: marking_period_id → legacy term mapping → due_at via periodForDate.
 * No calendar → matchesGradeTermFilter (today's behavior).
 */
export function matchesPeriodFilter(
  assignment: ScopeAssignment,
  filterId: string,
  calendar: GradingCalendar | null | undefined,
): boolean {
  const filter = filterId || 'all';
  if (filter === 'all') return true;

  if (!calendar) {
    return matchesGradeTermFilter({ term: assignment.term }, filter);
  }

  const { ids, codes } = includedPeriodKeys(calendar, filter);

  const mp = assignment.marking_period_id;
  if (mp) {
    if (ids.has(mp) || codes.has(normPeriodKey(mp))) return true;
    const period = periodById(calendar, mp);
    if (period && (ids.has(period.id) || codes.has(normPeriodKey(period.code)))) {
      return true;
    }
    // explicit MP that is outside the filter → exclude (do not fall through)
    return false;
  }

  if (assignment.term != null && String(assignment.term).trim() !== '') {
    const legacy = parseGradeTerm(assignment.term);
    // Map filter chip → legacy membership when the chip is a nine_weeks code.
    const filterLegacy = nineWeeksCodeToLegacy(filter.toUpperCase());
    if (filterLegacy) {
      return matchesGradeTermFilter({ term: legacy }, filterLegacy);
    }
    // Filter is e.g. 6W1: include if legacy term's nine_weeks code is in set.
    const legacyCodes = legacyFilterCodes(legacy as GradeTerm | 'all');
    if (legacyCodes.some((c) => codes.has(normPeriodKey(c)))) return true;
    // Semester-style: if filter includes Q1 and assignment is q1
    const termCode = legacyFilterCodes(legacy)[0];
    if (termCode && codes.has(normPeriodKey(termCode))) return true;
  }

  const iso = dueIso(assignment);
  if (iso) {
    const hit = periodForDate(calendar, iso);
    if (hit && (ids.has(hit.id) || codes.has(normPeriodKey(hit.code)))) return true;
  }

  return false;
}

export function filterAssignmentsByPeriod<T extends ScopeAssignment>(
  assignments: T[],
  filterId: string,
  calendar: GradingCalendar | null | undefined,
): T[] {
  return assignments.filter((row) => matchesPeriodFilter(row, filterId, calendar));
}

/** Label for empty-state copy when a period is selected. */
export function periodFilterLabel(
  filterId: string,
  calendar: GradingCalendar | null | undefined,
): string {
  if (!filterId || filterId === 'all') return 'All';
  if (!calendar) return gradeTermLabel(filterId);
  const p = resolveFilterPeriod(calendar, filterId);
  return sixWeeksLabel(p?.code ?? filterId) ?? p?.name ?? filterId.toUpperCase();
}
