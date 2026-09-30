/**
 * Allowed §6 / SetupDraft / syllabus wizard paths for AI ingest (FR-AI-16).
 * Unknown model paths are dropped by the parser.
 */

export const SCHOOL_POLICY_PATHS = [
  'level',
  'calendar.template',
  'calendar.year_start',
  'calendar.year_end',
  'calendar.model',
  'calendar.period_model',
  'credit.policy',
  'credit.unit',
  'credit.year_link',
  'credit.attendance_gate',
  'credit.passing_threshold',
  'rollup.preset',
  'rollup.custom_weights',
  'rollup.exam_enabled',
  'scale.default_id',
  'scale.list',
  'scale.bands',
  'scale.passing_pct',
  'scale.rounding',
  'qp.tables',
  'qp.method',
  'levels.list',
  'gpa.mode',
  'gpa.profiles',
  'gpa.include',
  'gpa.repeat',
  'locks.map',
  'school.notes',
] as const;

export const SYLLABUS_PATHS = [
  'syllabus.title',
  'syllabus.engine',
  'syllabus.within_category',
  'syllabus.categories',
  'syllabus.late_rule',
  'syllabus.missing_rule',
  'syllabus.extra_credit_method',
  'syllabus.ec_cap',
  'syllabus.floor',
  'syllabus.ceiling',
  'syllabus.book_mode',
  'syllabus.exam_weight',
  'syllabus.rollup_preset',
  'syllabus.rounding',
  'syllabus.empty_category',
  'syllabus.narrative',
  'syllabus.term_structure',
] as const;

export type SchoolPolicyPath = (typeof SCHOOL_POLICY_PATHS)[number];
export type SyllabusPath = (typeof SYLLABUS_PATHS)[number];

const SCHOOL_SET = new Set<string>(SCHOOL_POLICY_PATHS);
const SYLLABUS_SET = new Set<string>(SYLLABUS_PATHS);

export function isAllowedPath(wizard: 'school' | 'syllabus', path: string): boolean {
  if (wizard === 'school') return SCHOOL_SET.has(path);
  return SYLLABUS_SET.has(path);
}

export function allowedPathsFor(wizard: 'school' | 'syllabus'): readonly string[] {
  return wizard === 'school' ? SCHOOL_POLICY_PATHS : SYLLABUS_PATHS;
}

/** Map lock keys on SyllabusLocks → draft field paths that conflict. */
export const LOCK_TO_PATHS: Record<string, string[]> = {
  engine: ['syllabus.engine', 'syllabus.within_category'],
  categories: ['syllabus.categories'],
  scale: ['scale.list', 'scale.bands', 'scale.default_id'],
  floor: ['syllabus.floor'],
  late: ['syllabus.late_rule'],
  drop_lowest: ['syllabus.categories'],
  book_mode: ['syllabus.book_mode'],
  rollup: ['syllabus.rollup_preset', 'syllabus.exam_weight', 'rollup.preset'],
};

export const ENGINE_VALUES = [
  'total_points',
  'weighted_points_inside',
  'weighted_percent_inside',
  'item_weights',
  'none',
] as const;

export const PERIOD_MODELS = [
  'six_weeks',
  'nine_weeks',
  'trimester',
  'semester',
  'year',
  'college',
  'custom',
] as const;

export const CALENDAR_TEMPLATES = [
  'tx_six_weeks',
  'nine_weeks',
  'trimester',
  'college_term',
  'elementary_year_4',
  'elementary_year_6',
] as const;

export const ROLLUP_PRESETS = [
  '2/7+1/7',
  '40/40/20',
  '45/45/10',
  '3/7+3/7+1/7',
  '85/15',
  '25x4',
  '50/50',
  'year_mean',
] as const;
