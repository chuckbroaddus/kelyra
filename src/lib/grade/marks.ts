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
export type GradeTerm = 'none' | 'q1' | 'q2' | 'q3' | 'q4' | 'semester' | 'year';
export type ScoreScheme = 'numeric' | 'pass_fail' | 'either';

export const WEIGHT_BANDS: Array<{ key: WeightBand; label: string }> = [
  { key: 'none', label: 'No weight' },
  { key: 'daily', label: 'Daily' },
  { key: 'major', label: 'Major' },
  { key: 'custom', label: 'Custom %' },
];

export const GRADE_TERMS: Array<{ key: GradeTerm; label: string }> = [
  { key: 'none', label: 'This year' },
  { key: 'q1', label: 'Quarter 1' },
  { key: 'q2', label: 'Quarter 2' },
  { key: 'q3', label: 'Quarter 3' },
  { key: 'q4', label: 'Quarter 4' },
  { key: 'semester', label: 'Semester' },
  { key: 'year', label: 'Year' },
];

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
  const term = GRADE_TERMS.find((row) => row.key === input.term && row.key !== 'none')?.label;
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
