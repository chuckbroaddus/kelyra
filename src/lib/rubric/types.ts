/**
 * GB-13 Rubrics — reserved names per CONTRACT / SRS §5.16 / §6.8.
 * Snake_case fields for JSON + SQL round-trip.
 */

export type RubricKind = 'analytic' | 'holistic' | 'single_point' | 'checklist';

export type RubricScope = 'user' | 'class' | 'school';

export type RubricScoringMethod =
  | 'sum_points'
  | 'weighted_criteria'
  | 'holistic_points'
  | 'none';

export type MapToAssignment = 'set_max' | 'scale';

export type RubricStatus = 'draft' | 'published' | 'archived';

export type AssessmentStatus = 'draft' | 'confirmed';

export type RubricLevel = {
  id: string;
  label: string;
  rank: number;
  default_points?: number | null;
};

export type RubricCriterion = {
  id: string;
  name: string;
  description: string;
  max_points: number;
  weight_pct?: number | null;
  extra_credit: boolean;
  na_allowed: boolean;
};

export type RubricCellDef = {
  criterion_id: string;
  level_id: string;
  descriptor: string;
  points: number;
  range_min?: number | null;
  range_max?: number | null;
};

export type RubricScoring = {
  method: RubricScoringMethod;
  use_for_grading: boolean;
  hide_score_from_family: boolean;
};

/** Library / published rubric definition (FR-RUB-04). */
export type Rubric = {
  id: string;
  owner_id: string;
  school_id: string | null;
  class_id: string | null;
  scope: RubricScope;
  title: string;
  kind: RubricKind;
  scoring: RubricScoring;
  levels: RubricLevel[];
  criteria: RubricCriterion[];
  cells: RubricCellDef[];
  version: number;
  status: RubricStatus;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RubricAssociation = {
  id: string;
  rubric_id: string;
  rubric_version: number;
  assignment_id: string;
  use_for_grading: boolean;
  map_to_assignment: MapToAssignment;
  snapshot_id: string | null;
  /** Frozen definition at attach/publish time (FR-RUB-07). */
  snapshot: Rubric | null;
  created_at?: string;
};

export type AssessmentSelection = {
  criterion_id: string;
  level_id?: string | null;
  points_awarded: number | null;
  comment: string;
  na: boolean;
};

export type RubricAssessment = {
  id: string;
  association_id: string;
  submission_id: string;
  student_id: string;
  selections: AssessmentSelection[];
  holistic_level_id: string | null;
  override_total: number | null;
  total_points: number | null;
  max_points: number | null;
  percent: number | null;
  mapped_raw_points: number | null;
  status: AssessmentStatus;
  posted_to_gradebook: boolean;
  source: 'teacher' | 'ai_draft';
  confirmed_by: string | null;
  confirmed_at: string | null;
  cells: AssessmentSelection[];
  created_at?: string;
  updated_at?: string;
};

export type ScoreResult = {
  earned: number;
  max: number;
  percent: number | null;
  method: RubricScoringMethod;
  overridden: boolean;
  criterion_results: Array<{
    criterion_id: string;
    earned: number | null;
    max: number;
    na: boolean;
    weight_used: number | null;
  }>;
};

export type MapScoreResult = {
  raw_points: number;
  max_points: number;
  percent: number;
  map: MapToAssignment;
};

export type RubricIssue = {
  path: string;
  message: string;
  severity: 'error' | 'warn';
};
