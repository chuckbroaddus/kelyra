/**
 * Class syllabus weighted average (AVG v1).
 * Pure: approved_score 0–100 only. Nothing is a grade until Approve.
 * include_in_average = counts in its type average, not a slice of the final.
 *
 * GB-01: final weighted sum / floor / empty-category renormalize route through
 * engine v2 (`computePeriod`) as weighted_percent_inside. Makeup replace,
 * contribution explain rows, and legacy cell gates stay in this adapter.
 */

import { isAwaitingGrade, isOpenWork } from '../assignments/status.ts';
import { computePeriod } from './engine/index.ts';
import type {
  CellStatus,
  Engine,
  EngineAssignment,
  EngineCell,
  EngineSyllabus,
  LateRule,
  PeriodResult,
} from './engine/types.ts';
import {
  GRADE_TERM_ROLLUP,
  matchesGradeTermFilter,
  numericScoreForAverage,
  parseGradeTerm,
  type GradeTerm,
  type ScoreMark,
} from './marks.ts';
import {
  LEGACY_TO_NINE_WEEKS,
  NINE_WEEKS_TO_LEGACY,
} from './calendar/legacy.ts';

export type SyllabusPolicies = {
  extra_credit_allowed?: boolean;
  late_penalty_mode?: 'none' | 'manual';
  makeup_window_days?: number | null;
  redo_max_percent?: number | null;
  min_floor_percent?: number | null;
  rounding?: 'nearest_whole' | 'none';
  missing_as_zero?: boolean;
  publish_to_family?: boolean;
};

export type ReplaceLowestWithMakeup = {
  enabled?: boolean;
  makeup_category_key?: string;
  cap_percent?: number | null;
  max_replacements?: number;
};

export type CategoryRules = {
  drop_lowest_n?: number;
  replace_lowest_with_makeup?: ReplaceLowestWithMakeup;
  /** This category is the extra-credit category (method C: its weight is added on top of 100%). */
  extra_credit?: boolean;
};

export type SyllabusCategoryInput = {
  key: string;
  label: string;
  weight_percent: number;
  sort_order?: number;
  active?: boolean;
  rules?: CategoryRules;
  /** v2 */
  drop_highest_n?: number;
  keep_highest_n?: number | null;
  droppable?: boolean;
  never_drop_flags?: string[];
  empty_policy?: 'renormalize' | 'zero' | null;
  min_grades_per_term?: number | null;
};

export type SyllabusInput = {
  status?: 'draft' | 'published' | 'archived' | null;
  categories: SyllabusCategoryInput[];
  policies?: SyllabusPolicies | null;
  /** When any of these are set (beyond defaults), adapter uses full engine v2 mapping. */
  engine?: Engine;
  within_category?: 'points_inside' | 'percent_inside' | null;
  book_mode?: 'reset_each_marking_period' | 'rolling_year';
  extra_credit_method?: 'A' | 'B' | 'C';
  ec_cap?: number | null;
  late_rule?: LateRule | null;
  missing_rule?: 'zero' | 'floor' | 'omit';
  rounding?: 'nearest_whole' | 'half_up' | 'truncate' | 'none';
  floor?: number | null;
  ceiling?: number | null;
  exam_weight?: number | null;
  rollup_preset?: string | null;
  syllabus_version?: number;
  marking_period_scope?: string | null;
  /** Force v2 path even with defaults (tests / gradebook). */
  use_engine_v2?: boolean;
};

export type AverageAssignment = {
  id: string;
  title: string;
  category: string;
  term?: string | null;
  include_in_average?: boolean;
  due_at?: string | null;
  is_makeup?: boolean;
  score_scheme?: string | null;
  /** Ignored when syllabus is published. */
  weight_percent?: number | null;
  weight_band?: string | null;
  /** v2 */
  max_points?: number | null;
  item_weight?: number | null;
  extra_credit?: boolean;
  droppable?: boolean;
  marking_period_id?: string | null;
  period_id?: string | null;
  flags?: string[];
  item_factor?: number;
  can_exceed_max?: boolean;
};

export type AverageCell = {
  assignmentId: string;
  approvedScore: number | null;
  scoreMark?: ScoreMark | null;
  /** Graded / approved only when approvedAt or explicit graded flag. */
  approvedAt?: string | null;
  status?: string | null;
  excused?: boolean;
  /** v2 */
  rawPoints?: number | null;
  lateAppliedAt?: string | null;
  gradeStatus?: string | null;
  submittedAt?: string | null;
};

export type AverageOptions = {
  termFilter?: 'all' | GradeTerm | string;
  /** Clock for not-due checks. Defaults to now. */
  now?: Date | string | number;
  /** When set, restrict to this marking period id (calendar-bound class). */
  markingPeriodId?: string | null;
  /** True when class has a grading_calendar_id (else legacy term mapping). */
  hasCalendar?: boolean;
};

export type CellContribution = {
  assignmentId: string;
  title: string;
  categoryKey: string;
  score: number;
  role: 'counted' | 'dropped' | 'replaced' | 'makeup_vehicle' | 'excluded';
  note?: string;
};

export type CategoryAverageResult = {
  key: string;
  label: string;
  weightPercent: number;
  /** Unrounded type average, or null when omitted. */
  average: number | null;
  eligibleCount: number;
  omitted: boolean;
  renormalizedWeightPercent: number | null;
  contributions: CellContribution[];
};

export type SyllabusAverageResult = {
  mode: 'weighted' | 'unpublished' | 'empty';
  overall: number | null;
  overallUnrounded: number | null;
  categories: CategoryAverageResult[];
  renormalized: boolean;
  disclosures: string[];
  countedAssignmentIds: string[];
  adjustedNotes: string[];
  notCounted: Array<{ assignmentId: string; title: string; reason: string }>;
  /** Engine v2 period result when v2 path ran (explain / gradebook). */
  enginePeriod?: PeriodResult | null;
};

/** True when caller supplied non-default v2 settings or points fields. */
export function syllabusHasV2Fields(
  syllabus: SyllabusInput | null | undefined,
  assignments: AverageAssignment[] = [],
  cells: AverageCell[] = [],
): boolean {
  if (!syllabus) return false;
  if (syllabus.use_engine_v2 === true) return true;
  if (syllabus.engine && syllabus.engine !== 'weighted_percent_inside') return true;
  if (syllabus.within_category === 'points_inside') return true;
  if (syllabus.book_mode === 'rolling_year') return true;
  if (syllabus.extra_credit_method && syllabus.extra_credit_method !== 'B') return true;
  if (syllabus.ec_cap != null) return true;
  if (syllabus.late_rule && syllabus.late_rule.type && syllabus.late_rule.type !== 'none') return true;
  if (syllabus.missing_rule && syllabus.missing_rule !== 'omit') return true;
  if (syllabus.ceiling != null) return true;
  if (syllabus.floor != null && syllabus.policies?.min_floor_percent == null) return true;
  if (syllabus.categories.some(
    (c) =>
      (c.drop_highest_n ?? 0) > 0 ||
      (c.keep_highest_n != null && c.keep_highest_n > 0) ||
      (Array.isArray(c.never_drop_flags) && c.never_drop_flags.length > 0) ||
      c.empty_policy === 'zero',
  )) {
    return true;
  }
  if (assignments.some(
    (a) =>
      a.max_points != null ||
      a.item_weight != null ||
      a.extra_credit === true ||
      a.droppable === false,
  )) {
    return true;
  }
  if (cells.some((c) => c.rawPoints != null || (c.gradeStatus != null && c.gradeStatus !== ''))) {
    return true;
  }
  return false;
}

function assignmentInScope(
  assignment: AverageAssignment,
  options: AverageOptions,
): boolean {
  const termFilter = options.termFilter ?? 'all';
  if (options.markingPeriodId) {
    if (assignment.marking_period_id) {
      return assignment.marking_period_id === options.markingPeriodId;
    }
    // No MP id: fall through to legacy term when unbound calendar
    if (options.hasCalendar) return false;
  }
  if (options.hasCalendar && assignment.period_id) {
    // period_id may be a store code (Q1) or uuid — match termFilter codes
    if (termFilter === 'all') return true;
    if (assignment.period_id === termFilter) return true;
    const legacy = NINE_WEEKS_TO_LEGACY[assignment.period_id];
    if (legacy && matchesGradeTermFilter({ term: legacy }, termFilter)) return true;
    if (LEGACY_TO_NINE_WEEKS[termFilter as GradeTerm] === assignment.period_id) return true;
  }
  return matchesGradeTermFilter(assignment, termFilter);
}

function resolveMaxPoints(assignment: AverageAssignment): number {
  if (assignment.max_points != null && Number.isFinite(Number(assignment.max_points))) {
    return Math.max(0, Number(assignment.max_points));
  }
  return 100;
}

function resolveRawPoints(
  assignment: AverageAssignment,
  cell: AverageCell | undefined,
  percentScore: number | null,
): number | null {
  if (cell?.rawPoints != null && Number.isFinite(Number(cell.rawPoints))) {
    return Number(cell.rawPoints);
  }
  if (percentScore == null) return null;
  const max = resolveMaxPoints(assignment);
  // approved_score is 0–100 percent when raw_points absent
  if (max === 100) return percentScore;
  return (percentScore / 100) * max;
}

function mapGradeStatus(cell: AverageCell | undefined, hasNumeric: boolean): CellStatus {
  if (cell?.excused) return 'excused';
  const gs = (cell?.gradeStatus ?? '').toLowerCase();
  if (gs === 'incomplete') return 'incomplete';
  if (gs === 'dropped') return 'dropped';
  if (gs === 'excused') return 'excused';
  if (gs === 'missing') return 'missing';
  if (gs === 'late') return 'late';
  if (gs === 'ungraded') return 'ungraded';
  if (gs === 'graded') return 'graded';
  if (hasNumeric) return cell?.lateAppliedAt ? 'late' : 'graded';
  return 'ungraded';
}

export function mapSyllabusToEngineV2(
  syllabus: SyllabusInput,
  assignments: AverageAssignment[],
  cells: AverageCell[],
  options: AverageOptions = {},
): {
  engineSyllabus: EngineSyllabus;
  engineAssignments: EngineAssignment[];
  engineCells: EngineCell[];
  periodId: string;
} {
  const policies = syllabus.policies ?? {};
  let engine: Engine = syllabus.engine ?? 'weighted_percent_inside';
  if (syllabus.within_category === 'points_inside' && engine === 'weighted_percent_inside') {
    engine = 'weighted_points_inside';
  }
  if (syllabus.within_category === 'percent_inside' && engine === 'weighted_points_inside') {
    engine = 'weighted_percent_inside';
  }

  const missing: EngineSyllabus['missing'] =
    syllabus.missing_rule ??
    (policies.missing_as_zero === true ? 'zero' : 'omit');

  const floor =
    syllabus.floor != null && Number.isFinite(syllabus.floor)
      ? Number(syllabus.floor)
      : policies.min_floor_percent != null && Number.isFinite(policies.min_floor_percent)
        ? Number(policies.min_floor_percent)
        : null;

  const engineSyllabus: EngineSyllabus = {
    engine,
    categories: syllabus.categories
      .filter((c) => c.active !== false && Number(c.weight_percent) > 0)
      .map((c) => ({
        key: c.key,
        label: c.label,
        weight: Number(c.weight_percent),
        include: true,
        min_grades: c.min_grades_per_term ?? undefined,
        drop_lowest: c.rules?.drop_lowest_n ?? 0,
        drop_highest: c.drop_highest_n ?? 0,
        keep_highest: c.keep_highest_n == null ? undefined : Number(c.keep_highest_n),
        never_drop_flags: c.never_drop_flags ?? [],
      })),
    missing,
    missing_floor_pct: floor == null ? undefined : floor,
    late: syllabus.late_rule ?? { type: 'none' },
    extra_credit: {
      method: syllabus.extra_credit_method ?? 'B',
      cap_pct: syllabus.ec_cap ?? null,
    },
    period_floor_pct: floor,
    ceiling_pct: syllabus.ceiling ?? null,
    empty_category:
      syllabus.categories.find((c) => c.empty_policy === 'zero') != null ? 'zero' : 'renormalize',
    book_mode: syllabus.book_mode ?? 'reset_each_marking_period',
    rounding: 'none',
  };

  const periodId =
    options.markingPeriodId ||
    (options.termFilter && options.termFilter !== 'all'
      ? LEGACY_TO_NINE_WEEKS[options.termFilter as GradeTerm] ?? String(options.termFilter)
      : 'legacy');

  const cellBy = new Map(cells.map((c) => [c.assignmentId, c]));
  const engineAssignments: EngineAssignment[] = [];
  const engineCells: EngineCell[] = [];
  const now = asDate(options.now);

  for (const assignment of assignments) {
    if (!assignmentInScope(assignment, options)) continue;
    if (assignment.include_in_average === false && !assignment.extra_credit) continue;
    const cell = cellBy.get(assignment.id);
    if (isNotDueYet(assignment, now) && !cellApproved(cell)) continue;

    const max = resolveMaxPoints(assignment);
    const approved = cellApproved(cell);
    const percent = approved
      ? clampScore(
          numericScoreForAverage(cell?.scoreMark ?? 'numeric', cell?.approvedScore ?? null) ?? NaN,
        )
      : null;
    const raw = resolveRawPoints(assignment, cell, percent);
    const status = mapGradeStatus(
      cell,
      raw != null,
    );
    // missing_as_zero for due ungraded
    let cellStatus = status;
    if (
      !approved &&
      raw == null &&
      isDue(assignment, now) &&
      (missing === 'zero' || missing === 'floor') &&
      status === 'ungraded'
    ) {
      cellStatus = 'missing';
    }

    const pid =
      assignment.marking_period_id ||
      assignment.period_id ||
      (assignment.term
        ? LEGACY_TO_NINE_WEEKS[parseGradeTerm(assignment.term)] ?? assignment.term
        : periodId);

    engineAssignments.push({
      id: assignment.id,
      category: assignment.category,
      period_id: String(pid),
      max_points: max,
      due_at: assignment.due_at ?? null,
      count_toward_final: assignment.include_in_average !== false,
      extra_credit: assignment.extra_credit === true,
      can_exceed_max: assignment.can_exceed_max === true,
      item_factor: assignment.item_factor != null && assignment.item_factor > 0 ? assignment.item_factor : 1,
      droppable: assignment.droppable !== false,
      flags: assignment.flags,
      item_weight_pct: assignment.item_weight ?? null,
    });
    engineCells.push({
      assignment_id: assignment.id,
      raw: cellStatus === 'missing' || cellStatus === 'ungraded' ? null : raw,
      status: cellStatus,
      submitted_at: cell?.submittedAt ?? null,
      graded_at: cell?.approvedAt ?? null,
    });
  }

  // book_mode rolling uses one period id for all when not filtering
  const runPeriod =
    engineSyllabus.book_mode === 'rolling_year' && !options.markingPeriodId
      ? 'rolling'
      : periodId;

  if (engineSyllabus.book_mode === 'rolling_year' && runPeriod === 'rolling') {
    for (const a of engineAssignments) a.period_id = 'rolling';
  }

  return { engineSyllabus, engineAssignments, engineCells, periodId: runPeriod };
}

function asDate(value: Date | string | number | undefined): Date {
  if (value instanceof Date) return value;
  if (value == null) return new Date();
  return new Date(value);
}

function clampScore(score: number): number | null {
  if (!Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  return score;
}

function roundFinal(value: number, rounding: SyllabusPolicies['rounding']): number {
  if (rounding === 'none') return value;
  return Math.round(value);
}

type WorkingCell = {
  assignment: AverageAssignment;
  score: number;
  isMakeup: boolean;
};

export function isAssignmentDue(assignment: AverageAssignment, now: Date = new Date()): boolean {
  if (!assignment.due_at) return true;
  const due = new Date(assignment.due_at);
  if (Number.isNaN(due.getTime())) return true;
  return due.getTime() <= now.getTime();
}

export function isAssignmentNotDueYet(assignment: AverageAssignment, now: Date = new Date()): boolean {
  if (!assignment.due_at) return false;
  const due = new Date(assignment.due_at);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() > now.getTime();
}

function isDue(assignment: AverageAssignment, now: Date): boolean {
  return isAssignmentDue(assignment, now);
}

function isNotDueYet(assignment: AverageAssignment, now: Date): boolean {
  return isAssignmentNotDueYet(assignment, now);
}

export function cellApproved(cell: AverageCell | undefined): boolean {
  if (!cell) return false;
  if (cell.approvedAt) return true;
  if (cell.status === 'graded') return true;
  return false;
}

export type MissingUpcomingItem = {
  assignmentId: string;
  title: string;
  dueAt: string | null;
  categoryKey: string;
};

/**
 * P-M1 / F-05: split due-missing vs not-due.
 * Missing = due + no work only (not excused).
 * Turned in / graded leave both lists. Assigned / In progress leave Missing when due
 * but still appear in Upcoming when not due yet. Not-due never counts as Missing.
 */
export function cellHasTurnedInOrGradedWork(cell: AverageCell | undefined): boolean {
  if (!cell) return false;
  if (cellApproved(cell)) return true;
  if (isAwaitingGrade(cell.status)) return true;
  return false;
}

export function partitionMissingUpcoming(
  assignments: AverageAssignment[],
  cells: AverageCell[],
  options: { now?: Date | string | number } = {},
): { missing: MissingUpcomingItem[]; upcoming: MissingUpcomingItem[] } {
  const now = asDate(options.now);
  const cellByAssignment = new Map(cells.map((cell) => [cell.assignmentId, cell]));
  const missing: MissingUpcomingItem[] = [];
  const upcoming: MissingUpcomingItem[] = [];

  for (const assignment of assignments) {
    const cell = cellByAssignment.get(assignment.id);
    if (cell?.excused) continue;
    // Turned in (awaiting grade) or graded: neither Missing nor Upcoming.
    if (cellHasTurnedInOrGradedWork(cell)) continue;

    const item: MissingUpcomingItem = {
      assignmentId: assignment.id,
      title: assignment.title,
      dueAt: assignment.due_at ?? null,
      categoryKey: assignment.category,
    };

    if (isNotDueYet(assignment, now)) {
      upcoming.push(item);
      continue;
    }
    // Due (or no due date): Assigned / In progress is not Missing (family §4.2).
    if (isOpenWork(cell?.status)) continue;
    // Due + no work (no cell / unknown): Missing.
    missing.push(item);
  }

  return { missing, upcoming };
}

export type FamilyAssignmentRoleLabel =
  | { kind: 'counts'; categoryLabel: string }
  | { kind: 'does_not_count' }
  | { kind: 'dropped' }
  | { kind: 'replaced'; note?: string }
  | { kind: 'makeup' };

/** Explicit boolean only — unknown/null/undefined stay unknown (never !== false). */
export function coerceIncludeInAverage(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Family-facing category chip: syllabus label when known; else raw key.
 * Unknown / invented key "other" → omit (accurate-or-omit).
 */
export function familyFacingCategoryLabel(
  categoryKey: string | null | undefined,
  syllabusLabel?: string | null,
): string | null {
  const label = syllabusLabel?.trim();
  if (label) return label;
  const key = (categoryKey ?? '').trim();
  if (!key) return null;
  if (key.toLowerCase() === 'other') return null;
  return key;
}

/** S-G4 / P-G4 labels from engine contributions + assignment include flag. */
export function familyAssignmentRoleLabels(
  average: SyllabusAverageResult | null | undefined,
  assignment:
    | (Pick<AverageAssignment, 'id' | 'include_in_average'> & { category?: string | null })
    | null
    | undefined,
  categoryLabel?: string | null,
): FamilyAssignmentRoleLabel[] {
  const labels: FamilyAssignmentRoleLabel[] = [];
  if (!assignment) return labels;

  // Fail-closed: unknown include → omit Counts / Does not count (never default-true).
  const include = coerceIncludeInAverage(assignment.include_in_average);
  if (include === true) {
    const raw = categoryLabel?.trim() || (assignment.category ?? '').trim();
    const catLabel = raw && raw.toLowerCase() !== 'other' ? raw : 'the class';
    labels.push({ kind: 'counts', categoryLabel: catLabel });
  } else if (include === false) {
    labels.push({ kind: 'does_not_count' });
  }

  if (!average) return labels;
  for (const category of average.categories) {
    for (const row of category.contributions) {
      if (row.assignmentId !== assignment.id) continue;
      if (row.role === 'dropped') labels.push({ kind: 'dropped' });
      if (row.role === 'replaced') labels.push({ kind: 'replaced', note: row.note });
      if (row.role === 'makeup_vehicle' || (row.role === 'counted' && /makeup/i.test(row.note ?? ''))) {
        labels.push({ kind: 'makeup' });
      }
    }
  }
  return labels;
}

/**
 * Compute type averages → weighted final for one student in one class.
 * Empty categories are omitted and remaining weights renormalized.
 */
export function computeSyllabusAverage(
  syllabus: SyllabusInput | null | undefined,
  assignments: AverageAssignment[],
  cells: AverageCell[],
  options: AverageOptions = {},
): SyllabusAverageResult {
  const disclosures: string[] = [];
  const adjustedNotes: string[] = [];
  const notCounted: SyllabusAverageResult['notCounted'] = [];
  const now = asDate(options.now);
  const termFilter = options.termFilter ?? 'all';
  const cellByAssignment = new Map(cells.map((cell) => [cell.assignmentId, cell]));

  const published =
    syllabus != null &&
    (syllabus.status == null || syllabus.status === 'published') &&
    Array.isArray(syllabus.categories) &&
    syllabus.categories.some((c) => c.active !== false && c.weight_percent > 0);

  if (!published) {
    disclosures.push('Syllabus weights not set.');
    return {
      mode: 'unpublished',
      overall: null,
      overallUnrounded: null,
      categories: [],
      renormalized: false,
      disclosures,
      countedAssignmentIds: [],
      adjustedNotes,
      notCounted,
      enginePeriod: null,
    };
  }

  // Full engine v2 path (points, late, EC methods, drop high/keep high, …)
  if (syllabusHasV2Fields(syllabus, assignments, cells) || options.markingPeriodId) {
    return computeSyllabusAverageV2(syllabus!, assignments, cells, options, disclosures, adjustedNotes, notCounted);
  }

  const policies: SyllabusPolicies = syllabus!.policies ?? {};
  const missingAsZero = policies.missing_as_zero === true;
  const floor = policies.min_floor_percent ?? null;
  const rounding = policies.rounding ?? 'nearest_whole';

  const activeCategories = [...syllabus!.categories]
    .filter((c) => c.active !== false && Number(c.weight_percent) > 0)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label));

  const categoryKeys = new Set(activeCategories.map((c) => c.key));
  const termAssignments = assignments.filter((row) => assignmentInScope(row, options));

  for (const assignment of termAssignments) {
    if (!categoryKeys.has(assignment.category)) {
      notCounted.push({
        assignmentId: assignment.id,
        title: assignment.title,
        reason: 'Uncategorized — not in published syllabus keys',
      });
    }
  }

  const categoryResults: CategoryAverageResult[] = [];
  const countedAssignmentIds: string[] = [];

  for (const category of activeCategories) {
    const contributions: CellContribution[] = [];
    const inCategory = termAssignments.filter((row) => row.category === category.key);
    const working: WorkingCell[] = [];

    for (const assignment of inCategory) {
      const cell = cellByAssignment.get(assignment.id);
      const include = assignment.include_in_average !== false;

      if (!include) {
        notCounted.push({
          assignmentId: assignment.id,
          title: assignment.title,
          reason: 'Does not count toward the type average',
        });
        contributions.push({
          assignmentId: assignment.id,
          title: assignment.title,
          categoryKey: category.key,
          score: NaN,
          role: 'excluded',
          note: 'Does not count',
        });
        continue;
      }

      if (cell?.excused) {
        notCounted.push({
          assignmentId: assignment.id,
          title: assignment.title,
          reason: 'Excused',
        });
        contributions.push({
          assignmentId: assignment.id,
          title: assignment.title,
          categoryKey: category.key,
          score: NaN,
          role: 'excluded',
          note: 'Excused',
        });
        continue;
      }

      if (isNotDueYet(assignment, now)) {
        // Canvas trap: not-due is never a grade and never a zero — even if missing_as_zero.
        notCounted.push({
          assignmentId: assignment.id,
          title: assignment.title,
          reason: 'Not due yet',
        });
        contributions.push({
          assignmentId: assignment.id,
          title: assignment.title,
          categoryKey: category.key,
          score: NaN,
          role: 'excluded',
          note: 'Not due yet',
        });
        continue;
      }

      const approved = cellApproved(cell);
      const numeric = approved
        ? clampScore(
            numericScoreForAverage(cell?.scoreMark ?? 'numeric', cell?.approvedScore ?? null) ?? NaN,
          )
        : null;

      if (numeric == null) {
        if (missingAsZero && isDue(assignment, now) && !approved) {
          working.push({
            assignment,
            score: 0,
            isMakeup: Boolean(assignment.is_makeup),
          });
          contributions.push({
            assignmentId: assignment.id,
            title: assignment.title,
            categoryKey: category.key,
            score: 0,
            role: 'counted',
            note: 'Missing (counts as zero)',
          });
        } else {
          notCounted.push({
            assignmentId: assignment.id,
            title: assignment.title,
            reason: approved ? 'Non-numeric / Pass-Fail' : 'Missing (not counted as zero)',
          });
          contributions.push({
            assignmentId: assignment.id,
            title: assignment.title,
            categoryKey: category.key,
            score: NaN,
            role: 'excluded',
            note: approved ? 'Pass/Fail or out of range' : 'Missing',
          });
        }
        continue;
      }

      working.push({
        assignment,
        score: numeric,
        isMakeup: Boolean(assignment.is_makeup),
      });
    }


    // Apply makeup replace + drop lowest on a copy of working scores.
    let eligible = working.map((row) => ({ ...row }));
    const replace = category.rules?.replace_lowest_with_makeup;
    if (replace?.enabled) {
      const makeupKey = replace.makeup_category_key || category.key;
      const cap = replace.cap_percent ?? null;
      const maxRep = Math.max(0, replace.max_replacements ?? 1);
      const makeups = eligible.filter(
        (row) =>
          row.isMakeup &&
          (row.assignment.category === makeupKey || row.assignment.category === category.key),
      );
      const nonMakeup = eligible.filter((row) => !row.isMakeup);
      let replacements = 0;
      for (const makeup of makeups) {
        if (replacements >= maxRep) {
          // Extra makeups beyond max_replacements stay out of the mean (vehicle only).
          eligible = eligible.filter((row) => row.assignment.id !== makeup.assignment.id);
          contributions.push({
            assignmentId: makeup.assignment.id,
            title: makeup.assignment.title,
            categoryKey: category.key,
            score: makeup.score,
            role: 'makeup_vehicle',
            note: 'Makeup not applied (max replacements reached)',
          });
          continue;
        }
        if (!nonMakeup.length) {
          eligible = eligible.filter((row) => row.assignment.id !== makeup.assignment.id);
          continue;
        }
        nonMakeup.sort((a, b) => a.score - b.score);
        const lowest = nonMakeup[0]!;
        let makeupScore = makeup.score;
        if (cap != null && Number.isFinite(cap)) {
          makeupScore = Math.min(makeupScore, cap);
        }
        if (makeupScore >= lowest.score) {
          adjustedNotes.push(
            `Makeup (${makeup.score}%) replaced ${lowest.assignment.title} (${lowest.score}%)${
              cap != null ? `, capped at ${cap}%` : ''
            }.`,
          );
          contributions.push({
            assignmentId: lowest.assignment.id,
            title: lowest.assignment.title,
            categoryKey: category.key,
            score: lowest.score,
            role: 'replaced',
            note: `Replaced by makeup${cap != null ? ` (cap ${cap}%)` : ''}`,
          });
          contributions.push({
            assignmentId: makeup.assignment.id,
            title: makeup.assignment.title,
            categoryKey: category.key,
            score: makeupScore,
            role: 'counted',
            note: cap != null && makeup.score > cap ? `Capped at ${cap}%` : 'Makeup',
          });
          eligible = eligible
            .filter((row) => row.assignment.id !== lowest.assignment.id)
            .map((row) =>
              row.assignment.id === makeup.assignment.id ? { ...row, score: makeupScore, isMakeup: false } : row,
            );
          nonMakeup.shift();
          replacements += 1;
        } else {
          // Makeup worse than lowest after cap — do not double-count vehicle.
          eligible = eligible.filter((row) => row.assignment.id !== makeup.assignment.id);
          contributions.push({
            assignmentId: makeup.assignment.id,
            title: makeup.assignment.title,
            categoryKey: category.key,
            score: makeupScore,
            role: 'makeup_vehicle',
            note: 'Makeup not higher than lowest after cap',
          });
        }
      }
      // Any remaining is_makeup rows that were identity vehicles: exclude from mean.
      eligible = eligible.filter((row) => {
        if (!row.isMakeup) return true;
        contributions.push({
          assignmentId: row.assignment.id,
          title: row.assignment.title,
          categoryKey: category.key,
          score: row.score,
          role: 'makeup_vehicle',
          note: 'Makeup vehicle excluded from mean',
        });
        return false;
      });
    } else {
      // No replace rule: makeups still count as normal columns if include_in_average.
    }

    const dropN = Math.max(0, Math.min(3, category.rules?.drop_lowest_n ?? 0));
    if (dropN > 0 && eligible.length > dropN) {
      const sorted = [...eligible].sort((a, b) => a.score - b.score);
      const dropped = sorted.slice(0, dropN);
      const dropIds = new Set(dropped.map((row) => row.assignment.id));
      for (const row of dropped) {
        adjustedNotes.push(`Lowest score dropped: ${row.assignment.title} (${row.score}%).`);
        contributions.push({
          assignmentId: row.assignment.id,
          title: row.assignment.title,
          categoryKey: category.key,
          score: row.score,
          role: 'dropped',
          note: 'Dropped as lowest',
        });
      }
      eligible = eligible.filter((row) => !dropIds.has(row.assignment.id));
    }

    for (const row of eligible) {
      countedAssignmentIds.push(row.assignment.id);
      if (!contributions.some((c) => c.assignmentId === row.assignment.id && c.role === 'counted')) {
        contributions.push({
          assignmentId: row.assignment.id,
          title: row.assignment.title,
          categoryKey: category.key,
          score: row.score,
          role: 'counted',
        });
      }
    }

    // Defer category average to engine; stash eligible scores on contributions path.
    categoryResults.push({
      key: category.key,
      label: category.label,
      weightPercent: Number(category.weight_percent),
      average: null,
      eligibleCount: eligible.length,
      omitted: eligible.length === 0,
      renormalizedWeightPercent: null,
      contributions,
      // temporary: carry scores for engine adapter (stripped below)
      ...({ _eligibleScores: eligible.map((row) => ({ id: row.assignment.id, score: row.score })) } as object),
    } as CategoryAverageResult & { _eligibleScores?: { id: string; score: number }[] });
  }

  type CatWithScores = CategoryAverageResult & {
    _eligibleScores?: { id: string; score: number }[];
  };
  const cats = categoryResults as CatWithScores[];

  const engineAssignments: EngineAssignment[] = [];
  const engineCells: EngineCell[] = [];
  for (const cat of cats) {
    for (const row of cat._eligibleScores ?? []) {
      engineAssignments.push({
        id: row.id,
        category: cat.key,
        period_id: 'legacy',
        max_points: 100,
        count_toward_final: true,
        extra_credit: false,
        can_exceed_max: false,
        item_factor: 1,
        droppable: true,
      });
      engineCells.push({
        assignment_id: row.id,
        raw: row.score,
        status: 'graded',
      });
    }
  }

  const engineSyllabus: EngineSyllabus = {
    engine: 'weighted_percent_inside',
    categories: cats.map((c) => ({
      key: c.key,
      label: c.label,
      weight: c.weightPercent,
      include: true,
      // drops already applied in adapter
    })),
    missing: 'omit',
    late: { type: 'none' },
    extra_credit: { method: 'B' },
    period_floor_pct: floor != null && Number.isFinite(floor) ? Number(floor) : null,
    empty_category: 'renormalize',
    book_mode: 'reset_each_marking_period',
    rounding: 'none',
  };

  const period = computePeriod(engineSyllabus, engineAssignments, engineCells, 'legacy');

  for (const cat of cats) {
    const eng = period.categories.find((c) => c.key === cat.key);
    cat.average = eng?.pct ?? null;
    cat.eligibleCount = eng?.eligible_count ?? cat.eligibleCount;
    cat.omitted = cat.average == null;
    cat.renormalizedWeightPercent =
      eng && eng.weight_used > 0 ? storeWeightPercent(eng.weight_used) : null;
    delete cat._eligibleScores;
  }

  const renormalized = period.renormalized;
  if (renormalized) {
    disclosures.push(
      'Categories with no graded work yet are left out and the other weights are scaled so they still add to 100%.',
    );
  }

  if (period.pct == null) {
    return {
      mode: 'empty',
      overall: null,
      overallUnrounded: null,
      categories: categoryResults,
      renormalized,
      disclosures,
      countedAssignmentIds,
      adjustedNotes,
      notCounted,
      enginePeriod: period,
    };
  }

  const overallUnrounded = period.pct;
  const overall = roundFinal(overallUnrounded, rounding);

  return {
    mode: 'weighted',
    overall,
    overallUnrounded,
    categories: categoryResults,
    renormalized,
    disclosures,
    countedAssignmentIds,
    adjustedNotes,
    notCounted,
    enginePeriod: period,
  };
}

function computeSyllabusAverageV2(
  syllabus: SyllabusInput,
  assignments: AverageAssignment[],
  cells: AverageCell[],
  options: AverageOptions,
  disclosures: string[],
  adjustedNotes: string[],
  notCounted: SyllabusAverageResult['notCounted'],
): SyllabusAverageResult {
  const policies = syllabus.policies ?? {};
  const roundingPolicy = syllabus.rounding ?? policies.rounding ?? 'nearest_whole';
  const mapped = mapSyllabusToEngineV2(syllabus, assignments, cells, options);
  const period = computePeriod(
    mapped.engineSyllabus,
    mapped.engineAssignments,
    mapped.engineCells,
    mapped.periodId,
  );

  const activeCategories = [...syllabus.categories]
    .filter((c) => c.active !== false && Number(c.weight_percent) > 0)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label));

  const categoryResults: CategoryAverageResult[] = activeCategories.map((c) => {
    const eng = period.categories.find((x) => x.key === c.key);
    const contributions: CellContribution[] = (eng?.items ?? []).map((item) => {
      const asg = assignments.find((a) => a.id === item.assignment_id);
      let role: CellContribution['role'] = 'counted';
      if (item.role === 'dropped') role = 'dropped';
      else if (item.role === 'omitted' || item.role === 'ungraded') role = 'excluded';
      else if (item.role === 'ec') role = 'counted';
      else if (item.role === 'incomplete') role = 'excluded';
      return {
        assignmentId: item.assignment_id,
        title: asg?.title ?? item.assignment_id,
        categoryKey: c.key,
        score: item.pct ?? NaN,
        role,
        note: item.note,
      };
    });
    return {
      key: c.key,
      label: c.label,
      weightPercent: Number(c.weight_percent),
      average: eng?.pct ?? null,
      eligibleCount: eng?.eligible_count ?? 0,
      omitted: eng?.pct == null,
      renormalizedWeightPercent:
        eng && eng.weight_used > 0 ? storeWeightPercent(eng.weight_used) : null,
      contributions,
    };
  });

  const countedAssignmentIds = categoryResults.flatMap((c) =>
    c.contributions.filter((x) => x.role === 'counted').map((x) => x.assignmentId),
  );

  if (period.renormalized) {
    disclosures.push(
      'Categories with no graded work yet are left out and the other weights are scaled so they still add to 100%.',
    );
  }
  if (period.ec_added) {
    adjustedNotes.push(`Extra credit added ${period.ec_added} percentage points.`);
  }
  if (period.floor_applied) {
    adjustedNotes.push('Period floor applied.');
  }
  if (period.blocked_by_incomplete) {
    disclosures.push('Incomplete work is holding the period average.');
  }

  if (period.pct == null) {
    return {
      mode: 'empty',
      overall: null,
      overallUnrounded: null,
      categories: categoryResults,
      renormalized: period.renormalized,
      disclosures,
      countedAssignmentIds,
      adjustedNotes,
      notCounted,
      enginePeriod: period,
    };
  }

  const overallUnrounded = period.pct;
  const overall =
    roundingPolicy === 'none' || roundingPolicy === 'truncate' || roundingPolicy === 'half_up'
      ? roundFinal(overallUnrounded, roundingPolicy === 'none' ? 'none' : 'nearest_whole')
      : roundFinal(overallUnrounded, 'nearest_whole');
  // Prefer engine-aware rounding when half_up/truncate — reuse engine round if available later
  const finalOverall =
    roundingPolicy === 'none'
      ? overallUnrounded
      : Math.round(overallUnrounded);

  return {
    mode: 'weighted',
    overall: roundingPolicy === 'none' ? overallUnrounded : finalOverall,
    overallUnrounded,
    categories: categoryResults,
    renormalized: period.renormalized,
    disclosures,
    countedAssignmentIds,
    adjustedNotes,
    notCounted,
    enginePeriod: period,
  };
}

function storeWeightPercent(weightUsed01: number): number {
  return weightUsed01 * 100;
}

/** Plain-English rule lines for family syllabus summary. */
const ENGINE_PLAIN: Record<string, string> = {
  total_points: 'Total points (earned ÷ possible across the class)',
  weighted_points_inside: 'Weighted categories · points inside each category',
  weighted_percent_inside: 'Weighted categories · equal percent inside each category',
  item_weights: 'Each assignment has its own weight',
  none: 'No overall grade is computed',
};

const EC_PLAIN: Record<string, string> = {
  A: 'Extra credit is its own category weight',
  B: 'Extra credit adds to earned points (skipping it does not lower anyone)',
  C: 'Extra credit is outside the 100% category sum',
};

function lateRulePlain(rule: LateRule | null | undefined): string {
  if (!rule || rule.type === 'none') return 'Late work: teacher decides case by case (no automatic penalty).';
  const amt = rule.amount ?? 0;
  const unit = rule.unit === 'points' ? 'points' : '%';
  if (rule.type === 'flat') return `Late work: −${amt}${unit} flat.`;
  if (rule.type === 'per_day') return `Late work: −${amt}${unit} per day.`;
  if (rule.type === 'per_hour') return `Late work: −${amt}${unit} per hour.`;
  return 'Late work: teacher decides case by case (no automatic penalty).';
}

function semesterComputationPlain(input: {
  rollup_preset?: string | null;
  exam_weight?: number | null;
  book_mode?: string | null;
}): string {
  const rollup = input.rollup_preset?.trim();
  if (rollup) {
    const exam =
      input.exam_weight != null && Number.isFinite(input.exam_weight)
        ? ` Exam weight ${input.exam_weight}.`
        : '';
    return `Semester is computed with rollup ${rollup}.${exam}`;
  }
  if (input.book_mode === 'rolling_year') {
    return 'Semester uses a rolling year book (scores carry forward).';
  }
  return 'Semester combines marking-period averages per the school calendar rollup.';
}

/**
 * Parent-facing special-rule lines (§11 item 10).
 * Lists engine, scale, late, drop-lowest, extra credit method, and semester computation.
 * Category weight lines stay on FamilySyllabusSummary rows.
 */
export function plainSyllabusRules(
  categories: SyllabusCategoryInput[],
  policies?: SyllabusPolicies | null,
  extras?: {
    engine?: string | null;
    late_rule?: LateRule | null;
    extra_credit_method?: 'A' | 'B' | 'C' | string | null;
    rollup_preset?: string | null;
    exam_weight?: number | null;
    book_mode?: string | null;
    /** Optional letter-scale name when the publish payload includes one. */
    scale_label?: string | null;
  } | null,
): string[] {
  const lines: string[] = [];
  const p = policies ?? {};
  const x = extras ?? {};

  if (x.engine) {
    lines.push(`Engine: ${ENGINE_PLAIN[x.engine] ?? x.engine}.`);
  }
  lines.push(
    x.scale_label?.trim()
      ? `Letter scale: ${x.scale_label.trim()}.`
      : 'Letter scale: follows the school grading policy.',
  );
  lines.push(lateRulePlain(x.late_rule ?? null));

  if (x.extra_credit_method) {
    lines.push(
      `Extra credit: ${EC_PLAIN[x.extra_credit_method] ?? `method ${x.extra_credit_method}`}.`,
    );
  } else if (p.extra_credit_allowed) {
    lines.push('Extra-credit columns are allowed.');
  }

  lines.push(
    semesterComputationPlain({
      rollup_preset: x.rollup_preset,
      exam_weight: x.exam_weight,
      book_mode: x.book_mode,
    }),
  );

  if (p.missing_as_zero) {
    lines.push('Missing work that is due counts as zero.');
  } else {
    lines.push('Missing work does not count until the teacher enters a score.');
  }
  if (p.rounding === 'none') {
    lines.push('Scores are not rounded.');
  } else {
    lines.push('Scores round to the nearest whole number.');
  }
  if (p.min_floor_percent != null) {
    lines.push(`No score below ${p.min_floor_percent}% after rules.`);
  }

  let anyDrop = false;
  for (const category of categories) {
    if (category.active === false) continue;
    const drop = category.rules?.drop_lowest_n ?? 0;
    if (drop > 0) {
      anyDrop = true;
      lines.push(`Drop-lowest: drops the lowest ${drop} ${category.label} score${drop === 1 ? '' : 's'}.`);
    }
    const replace = category.rules?.replace_lowest_with_makeup;
    if (replace?.enabled) {
      const cap = replace.cap_percent != null ? `, at most ${replace.cap_percent}%` : '';
      lines.push(`A makeup can replace the lowest ${category.label}${cap}.`);
    }
  }
  if (!anyDrop) {
    lines.push('Drop-lowest: none.');
  }
  return lines;
}

export function termKeysForFilter(filter: string): GradeTerm[] {
  if (filter === 'all') return GRADE_TERM_ROLLUP.all;
  return GRADE_TERM_ROLLUP[parseGradeTerm(filter)] ?? GRADE_TERM_ROLLUP.year;
}
