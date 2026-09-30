/**
 * Legacy GradeTerm bridge (q1..q4 / s1 / s2 / year) ↔ nine_weeks codes.
 * A class with no grading_calendar_id behaves exactly like today (marks.ts).
 */

import {
  GRADE_TERM_ROLLUP,
  type GradeTerm,
} from '../marks.ts';
import { nineWeeks } from './templates.ts';
import type { GradingCalendar } from './types.ts';

/** Legacy GradeTerm → nine_weeks store code. */
export const LEGACY_TO_NINE_WEEKS: Record<GradeTerm, string> = {
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
  s1: 'S1',
  s2: 'S2',
  year: 'Y1',
};

/** nine_weeks store code → legacy GradeTerm (only the seven legacy keys). */
export const NINE_WEEKS_TO_LEGACY: Record<string, GradeTerm> = {
  Q1: 'q1',
  Q2: 'q2',
  Q3: 'q3',
  Q4: 'q4',
  S1: 's1',
  S2: 's2',
  Y1: 'year',
};

export function legacyToNineWeeksCode(term: GradeTerm): string {
  return LEGACY_TO_NINE_WEEKS[term];
}

export function nineWeeksCodeToLegacy(code: string): GradeTerm | null {
  return NINE_WEEKS_TO_LEGACY[code] ?? null;
}

export function legacyToNineWeeksRoundTrip(term: GradeTerm): GradeTerm {
  const code = legacyToNineWeeksCode(term);
  const back = nineWeeksCodeToLegacy(code);
  if (!back) throw new Error(`round-trip failed for ${term}`);
  return back;
}

/**
 * Calendar a class with no binding uses: nine_weeks skeleton (codes Q1–Q4, S1, S2, Y1).
 * Filter membership must match marks.GRADE_TERM_ROLLUP exactly — see legacyGradeTermRollup().
 */
export function legacyCalendar(): GradingCalendar {
  return nineWeeks({
    id: 'legacy_nine_weeks',
    name: 'Legacy nine-weeks (unbound class)',
    school_id: null,
  });
}

/**
 * Exact copy of today's GRADE_TERM_ROLLUP membership.
 * Kept here so calendar consumers can stay off marks.ts filter helpers while
 * unbound classes remain bit-identical to the pre-calendar behavior.
 */
export function legacyGradeTermRollup(): Record<'all' | GradeTerm, GradeTerm[]> {
  const out = {} as Record<'all' | GradeTerm, GradeTerm[]>;
  for (const key of Object.keys(GRADE_TERM_ROLLUP) as Array<'all' | GradeTerm>) {
    out[key] = [...GRADE_TERM_ROLLUP[key]];
  }
  return out;
}

/**
 * Map a legacy filter key through the nine_weeks tree the same way GRADE_TERM_ROLLUP does:
 * quarter = self; semester = child MPs + self; year = all legacy terms.
 */
export function legacyFilterCodes(filter: 'all' | GradeTerm): string[] {
  const terms = GRADE_TERM_ROLLUP[filter];
  return terms.map((t) => LEGACY_TO_NINE_WEEKS[t]);
}
