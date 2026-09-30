/**
 * Gradebook engine v2 types — CONTRACT.md "Engine v2".
 * snake_case fields match SQL/JSON round-trip.
 */

export type Engine =
  | 'total_points'
  | 'weighted_points_inside'
  | 'weighted_percent_inside'
  | 'item_weights'
  | 'none';

export type CellStatus =
  | 'ungraded'
  | 'missing'
  | 'excused'
  | 'late'
  | 'dropped'
  | 'incomplete'
  | 'graded';

export type EngineCategory = {
  key: string;
  label: string;
  weight: number;
  include: boolean;
  min_grades?: number;
  drop_lowest?: number;
  drop_highest?: number;
  keep_highest?: number;
  never_drop_flags?: string[];
};

export type LateRule = {
  type: 'none' | 'flat' | 'per_day' | 'per_hour';
  amount?: number;
  unit?: 'percent' | 'points';
  floor_pct?: number | null;
  hard_deadline_days?: number | null;
  grace_hours?: number;
};

export type EngineSyllabus = {
  engine: Engine;
  categories: EngineCategory[];
  missing: 'zero' | 'floor' | 'omit';
  missing_floor_pct?: number;
  late: LateRule;
  extra_credit: { method: 'A' | 'B' | 'C'; cap_pct?: number | null };
  period_floor_pct?: number | null;
  ceiling_pct?: number | null;
  empty_category: 'renormalize' | 'zero';
  book_mode: 'reset_each_marking_period' | 'rolling_year';
  rounding: 'nearest_whole' | 'half_up' | 'truncate' | 'none';
  decimals?: number;
};

export type EngineAssignment = {
  id: string;
  category: string;
  period_id: string;
  max_points: number;
  due_at?: string | null;
  count_toward_final: boolean;
  extra_credit: boolean;
  can_exceed_max: boolean;
  item_factor: number;
  droppable: boolean;
  flags?: string[];
  item_weight_pct?: number | null;
};

export type EngineCell = {
  assignment_id: string;
  raw: number | null;
  status: CellStatus;
  submitted_at?: string | null;
  graded_at?: string | null;
};

export type ItemBreakdown = {
  assignment_id: string;
  category: string;
  earned: number | null;
  possible: number | null;
  pct: number | null;
  role: 'counted' | 'dropped' | 'omitted' | 'ec' | 'incomplete' | 'ungraded';
  note?: string;
};

export type CategoryResult = {
  key: string;
  pct: number | null;
  weight_used: number;
  items: ItemBreakdown[];
  eligible_count: number;
  min_grades_met: boolean;
};

export type PeriodResult = {
  period_id: string;
  pct: number | null;
  categories: CategoryResult[];
  renormalized: boolean;
  ec_added: number;
  floor_applied: boolean;
  blocked_by_incomplete: boolean;
  min_grades_blocked: boolean;
};

/** GB-02 rollup shape copied from CONTRACT (do not import calendar module). */
export type TermRollup = {
  term_id: string;
  components: { period_id: string; weight: number }[];
  exam: { enabled: boolean; code: string };
  missing_child: 'renormalize' | 'block';
};

export type TermResult = {
  term_id: string;
  pct: number | null;
  renormalized: boolean;
  blocked: boolean;
  components_used: { period_id: string; weight_used: number; pct: number | null }[];
};

export type WhatIfTarget = {
  target_pct: number;
  assignment_id?: string;
  /** When set, solve for term exam score instead of an assignment. */
  exam?: boolean;
};

export type WhatIfResult = {
  possible: boolean;
  raw_needed: number | null;
  note?: string;
};
