/** Gradebook calendar shapes — CONTRACT.md "Calendar" (GB-02). snake_case for JSON round-trip. */

export type PeriodModel =
  | 'six_weeks'
  | 'nine_weeks'
  | 'trimester'
  | 'semester'
  | 'year'
  | 'college'
  | 'custom';

export type PeriodKind = 'marking_period' | 'credit_term' | 'year' | 'progress' | 'exam';

export type CalendarLevel = 'elementary' | 'middle' | 'high' | 'college';

export type MarkingPeriod = {
  id: string;
  code: string;
  name: string;
  kind: PeriodKind;
  /** MP → credit term → year */
  parent_id: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
};

export type TermRollup = {
  term_id: string;
  /** 'exam' allowed as period_id; weights must sum to 1 (±0.0001). */
  components: { period_id: string; weight: number }[];
  exam: { enabled: boolean; code: string };
  missing_child: 'renormalize' | 'block';
};

export type GradingCalendar = {
  id: string;
  school_id: string | null;
  name: string;
  level: CalendarLevel;
  period_model: PeriodModel;
  periods: MarkingPeriod[];
  rollups: TermRollup[];
  show_interims_in_filter: boolean;
  glyph_scope: 'semester' | 'year';
};

export type RollupPresetKey =
  | '2/7+1/7'
  | '40/40/20'
  | '45/45/10'
  | '3/7+3/7+1/7'
  | '85/15'
  | '25x4'
  | '50/50'
  | 'year_mean';

export type TemplateKey =
  | 'tx_six_weeks'
  | 'nine_weeks'
  | 'trimester'
  | 'college_term'
  | 'elementary_year_4'
  | 'elementary_year_6'
  | 'semester';

export type YearRange = {
  start: string;
  end: string;
};

export type TemplateOptions = {
  id?: string;
  school_id?: string | null;
  name?: string;
  year?: YearRange | null;
  /** Include midpoint progress checkpoints under each marking period (FR-CAL-05). */
  progress_checkpoints?: boolean;
  rollup_preset?: RollupPresetKey;
};
