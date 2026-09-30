/**
 * Layer 2/3 stored grades — SRS §5.7 / §6.7, CONTRACT reserved names.
 * snake_case for SQL/JSON round-trip.
 */

export type PostedSource = 'computed' | 'override';

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
  /** Optional snapshot points (GB-16). */
  unweighted_points?: number | null;
  weighted_points?: number | null;
  /** SRS §6.7 include flags (defaults true/true/false when omitted). */
  include_unweighted?: boolean;
  include_weighted?: boolean;
  include_rank?: boolean;
  repeat: boolean;
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
  syllabus_version: string | number;
  stored_by: string;
  stored_at?: string;
  source?: PostedSource;
};
