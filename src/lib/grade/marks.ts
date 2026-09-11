export type ScoreMark = 'numeric' | 'pass' | 'fail';
export type GradeKind =
  | 'homework'
  | 'quiz'
  | 'test'
  | 'midterm'
  | 'final'
  | 'project'
  | 'presentation'
  | 'participation'
  | 'behavior'
  | 'other';

export const GRADE_KINDS: Array<{ key: GradeKind; label: string }> = [
  { key: 'homework', label: 'Homework' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'test', label: 'Test' },
  { key: 'midterm', label: 'Mid-term' },
  { key: 'final', label: 'Final' },
  { key: 'project', label: 'Project' },
  { key: 'presentation', label: 'Presentation' },
  { key: 'participation', label: 'Class participation' },
  { key: 'behavior', label: 'Behavior' },
  { key: 'other', label: 'Other' },
];

export type WeightBand = 'none' | 'daily' | 'major' | 'custom';
export type GradeTerm = 'q1' | 'q2' | 'q3' | 'q4' | 's1' | 's2' | 'year';
export type ScoreScheme = 'numeric' | 'pass_fail' | 'either';

export const WEIGHT_BANDS: Array<{ key: WeightBand; label: string }> = [
  { key: 'none', label: 'No weight' },
  { key: 'daily', label: 'Daily' },
  { key: 'major', label: 'Major' },
  { key: 'custom', label: 'Custom %' },
];

export const GRADE_TERMS: Array<{ key: GradeTerm; label: string }> = [
  { key: 'q1', label: 'Quarter 1' },
  { key: 'q2', label: 'Quarter 2' },
  { key: 'q3', label: 'Quarter 3' },
  { key: 'q4', label: 'Quarter 4' },
  { key: 's1', label: 'Semester 1' },
  { key: 's2', label: 'Semester 2' },
  { key: 'year', label: 'Year' },
];

const GRADE_TERM_KEYS = new Set<string>(GRADE_TERMS.map((row) => row.key));

export function isGradeTerm(value: string | null | undefined): value is GradeTerm {
  return Boolean(value && GRADE_TERM_KEYS.has(value));
}

/** Map stored / legacy terms onto the Counts toward chips. */
export function parseGradeTerm(value: string | null | undefined): GradeTerm {
  if (isGradeTerm(value)) return value;
  if (value === 'semester') return 's1';
  return 'year';
}

/**
 * Default Counts-toward quarter for a **new** assignment on local calendar date `d`.
 *
 * Nine-week quarters · mid-August start · Christmas break · mid-January restart.
 *
 * School year (SY) for calendar date D:
 * - Aug 15–Dec 31 → SY starts Aug 15 of that calendar year
 * - Jan 1–Aug 14 → SY starts Aug 15 of the prior calendar year
 *
 * Fixed midpoints (inclusive):
 * - **Q1:** Aug 15 → Oct 16
 * - **Q2:** Oct 17 → Dec 19 (Christmas break starts Dec 20). Break days Dec 20–Jan 11
 *   still map to **q2** until school restarts.
 * - **Q3:** Jan 12 (fixed “second week of January”) → Mar 12
 * - **Q4:** Mar 13 → Aug 14 (summer stays **q4** of that SY until Aug 14;
 *   Aug 15 opens **q1** of the next SY — “current quarter” for fall planning)
 *
 * Does not return s1/s2/year. Edit flows must keep the stored term; only create/empty
 * form defaults use this helper.
 */
export function defaultGradeTermForDate(d: Date): GradeTerm {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const md = month * 100 + day;

  if (md >= 815 && md <= 1016) return 'q1';
  if (md >= 1017 && md <= 1231) return 'q2';
  if (md >= 101 && md <= 111) return 'q2';
  if (md >= 112 && md <= 312) return 'q3';
  // Mar 13 – Aug 14
  return 'q4';
}

export function gradeTermLabel(value: string | null | undefined): string {
  if (value === 'all') return 'All';
  return GRADE_TERMS.find((row) => row.key === parseGradeTerm(value))?.label ?? 'Year';
}

export const GRADE_TERM_FILTERS: Array<{ key: 'all' | GradeTerm; label: string }> = [
  { key: 'all', label: 'All' },
  ...GRADE_TERMS,
];

/**
 * What a filter tab includes.
 * Quarter tabs are exact. Semester 1 = Q1 + Q2 + semester-only.
 * Semester 2 = Q3 + Q4 + semester-only. Year = both semesters + year-only.
 */
export const GRADE_TERM_ROLLUP: Record<'all' | GradeTerm, GradeTerm[]> = {
  all: ['q1', 'q2', 'q3', 'q4', 's1', 's2', 'year'],
  q1: ['q1'],
  q2: ['q2'],
  q3: ['q3'],
  q4: ['q4'],
  s1: ['q1', 'q2', 's1'],
  s2: ['q3', 'q4', 's2'],
  year: ['q1', 'q2', 'q3', 'q4', 's1', 's2', 'year'],
};

export function matchesGradeTermFilter(row: { term?: string | null }, filter: string): boolean {
  if (filter === 'all') return true;
  const included = GRADE_TERM_ROLLUP[filter as GradeTerm];
  if (!included) return false;
  return included.includes(parseGradeTerm(row.term));
}

export function gradeKindLabel(kind: GradeKind | string | null | undefined): string {
  return GRADE_KINDS.find((row) => row.key === kind)?.label ?? 'Grade';
}

export function formatScoreMark(mark: ScoreMark | null | undefined, score: number | null | undefined): string {
  if (mark === 'pass') return 'Pass';
  if (mark === 'fail') return 'Fail';
  if (score != null && Number.isFinite(score)) return String(score);
  return '';
}

/** Pass / Fail never enter a numeric average. */
export function numericScoreForAverage(
  mark: ScoreMark | null | undefined,
  score: number | null | undefined,
): number | null {
  if (mark && mark !== 'numeric') return null;
  if (score == null || !Number.isFinite(score)) return null;
  return score;
}

export function parseScoreInput(value: string): { mark: ScoreMark; score: number | null } {
  const text = value.trim().toLowerCase();
  if (!text) return { mark: 'numeric', score: null };
  if (/^(pass|passed|p)$/.test(text)) return { mark: 'pass', score: null };
  if (/^(fail|failed|f)$/.test(text)) return { mark: 'fail', score: null };
  const n = Number(text);
  if (Number.isFinite(n) && n >= 0 && n <= 100) return { mark: 'numeric', score: n };
  return { mark: 'numeric', score: null };
}

export function looksLikeSkipGrade(text: string): boolean {
  return /\b(no grade|don'?t grade|do not grade|no need to grade|forget( trying to)? grade|skip( the)? grade|ungraded|don'?t (need to )?grade|no score)\b/i.test(
    text,
  );
}

export function parseSpokenGradeKind(text: string): GradeKind | null {
  const t = text.toLowerCase();
  if (/\b(class )?participation|participate|participating\b/.test(t)) return 'participation';
  if (/\bpresentation|presenting\b/.test(t)) return 'presentation';
  if (/\bbehavior|conduct|citizenship\b/.test(t)) return 'behavior';
  if (/\bmid[-\s]?term\b/.test(t)) return 'midterm';
  if (/\bfinal\b/.test(t)) return 'final';
  if (/\bunit test|chapter test|\btest\b/.test(t)) return 'test';
  if (/\bquiz|exit ticket\b/.test(t)) return 'quiz';
  if (/\bproject\b/.test(t)) return 'project';
  if (/\bhomework|worksheet|packet|hw\b/.test(t)) return 'homework';
  return null;
}

export function weightSummary(input: {
  weight_band?: string | null;
  weight_percent?: number | null;
  term?: string | null;
}): string {
  const band = WEIGHT_BANDS.find((row) => row.key === input.weight_band)?.label;
  const parsedTerm = parseGradeTerm(input.term);
  const term = parsedTerm === 'year' ? undefined : GRADE_TERMS.find((row) => row.key === parsedTerm)?.label;
  const parts: string[] = [];
  if (input.weight_band === 'custom' && input.weight_percent != null) {
    parts.push(`${input.weight_percent}%`);
  } else if (band && input.weight_band && input.weight_band !== 'none') {
    parts.push(band);
  }
  if (term) parts.push(term);
  return parts.join(' · ');
}

export function parseSpokenScore(text: string): { mark: ScoreMark; score: number | null } | null {
  if (looksLikeSkipGrade(text)) return { mark: 'pass', score: null };
  if (/\b(pass|passed|passing|credit)\b/i.test(text) && !/\bfail/.test(text.toLowerCase())) {
    return { mark: 'pass', score: null };
  }
  if (/\b(fail|failed|failing|no credit)\b/i.test(text)) return { mark: 'fail', score: null };
  const numbered = text.match(/\b(\d{1,3})\b/);
  if (!numbered) return null;
  const n = Number(numbered[1]);
  if (!Number.isFinite(n) || n > 100) return null;
  return { mark: 'numeric', score: n };
}
