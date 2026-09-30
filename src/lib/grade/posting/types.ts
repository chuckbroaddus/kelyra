/**
 * Layer 2/3 stored grades — SRS §5.7 / §6.7, CONTRACT reserved names.
 * snake_case for SQL/JSON round-trip.
 * GB-17: conduct, transfer flags, eligibility, transfer letter map.
 */

export type PostedSource = 'computed' | 'override' | 'transfer';

/** Canonical transcript row flags (FR-POST-03 / §6.7). */
export const TERM_ROW_FLAGS = [
  'transfer',
  'cbe',
  'pf',
  'credit_denied',
  'repeat',
] as const;
export type TermRowFlag = (typeof TERM_ROW_FLAGS)[number];

/** FR-GPA-08 default transfer letter → percent (shipped; school may override). */
export const DEFAULT_TRANSFER_LETTER_TO_PCT: Record<string, number> = {
  'A+': 98,
  A: 95,
  'A-': 92,
  'B+': 88,
  B: 85,
  'B-': 82,
  'C+': 78,
  C: 75,
  'C-': 72,
  'D+': 68,
  D: 65,
  'D-': 62,
  F: 55,
};

/** Default conduct / citizenship marks (FR-SYL-17). */
export const DEFAULT_CONDUCT_MARKS = ['E', 'S', 'N', 'U'] as const;
export type ConductMark = (typeof DEFAULT_CONDUCT_MARKS)[number];

/** Layer-2 freeze of a marking-period average (report card). */
export type PostedPeriodGrade = {
  id?: string;
  class_id: string;
  student_id: string;
  /** Stable period code (6W1, Q1, …). */
  marking_period_code: string;
  /** DB uuid when known; pure code may leave null. */
  marking_period_id?: string | null;
  pct: number | null;
  letter: string | null;
  /** Non-GPA conduct / citizenship mark (FR-POST-01 / FR-SYL-17). */
  conduct?: string | null;
  /** Absence count snapshot at store (optional). */
  absences?: number | null;
  /** Row flags e.g. transfer. */
  flags?: string[];
  syllabus_version: string;
  stored_at: string;
  stored_by: string;
  source: PostedSource;
};

/** Layer-3 transcript / credit-term row. */
export type TermGrade = {
  id?: string;
  class_id: string;
  student_id: string;
  course: string;
  course_code?: string;
  /** Credit term code (S1, S2, Y1, T1, …). */
  credit_term: string;
  pct: number | null;
  letter: string | null;
  credits_attempted: number;
  credits_earned: number;
  course_level: string;
  quality_points: number;
  repeat: boolean;
  /** transfer | cbe | pf | credit_denied | repeat | year_link | exam_exempt … */
  flags?: string[];
  exam_pct?: number | null;
  exam_exempt?: boolean;
  stored_at?: string;
  stored_by?: string;
};

export type GradeOverride = {
  id?: string;
  target_kind: 'posted_period' | 'term';
  target_id?: string;
  class_id: string;
  student_id: string;
  old_pct: number | null;
  old_letter: string | null;
  new_pct: number | null;
  new_letter: string | null;
  /** Optional prior/next flags for admin flag edits. */
  old_flags?: string[] | null;
  new_flags?: string[] | null;
  /** Required non-empty (FR-POST-07). */
  reason: string;
  by: string;
  at: string;
};

/** School credit / year-link policy (SRS §6.3 subset). */
export type CreditPolicy = {
  credit_unit: 'semester' | 'year' | 'trimester' | 'none' | 'marking_period';
  default_credits_per_term: number;
  passing_threshold: number;
  year_link: { enabled: boolean; min_year_average?: number | null };
  attendance_gate?: { enabled: boolean; min_attendance_pct: number } | null;
};

/** Rollup shape copied from CONTRACT (avoid cross-module import collision). */
export type PostingTermRollup = {
  term_id: string;
  components: { period_id: string; weight: number }[];
  exam: { enabled: boolean; code: string };
  missing_child: 'renormalize' | 'block';
};

export type ComputedPeriodInput = {
  class_id: string;
  student_id: string;
  marking_period_code: string;
  marking_period_id?: string | null;
  pct: number | null;
  letter?: string | null;
  conduct?: string | null;
  absences?: number | null;
  flags?: string[];
  syllabus_version: string | number;
  stored_by: string;
  stored_at?: string;
  source?: PostedSource;
};

/** FR-POST-06 eligibility snapshot (not a transcript field). */
export type EligibilitySnapshot = {
  student_id: string;
  marking_period_code: string;
  ineligible: boolean;
  failing_class_ids: string[];
  stored_at?: string;
};

/** One report-card line for a student/period. */
export type ReportCardLine = {
  class_id: string;
  student_id: string;
  marking_period_code: string;
  pct: number | null;
  letter: string | null;
  conduct: string | null;
  absences: number | null;
  flags: string[];
  source: PostedSource;
};
