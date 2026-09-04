/**
 * Class syllabus weighted average (AVG v1).
 * Pure: approved_score 0–100 only. Nothing is a grade until Approve.
 * include_in_average = counts in its type average, not a slice of the final.
 */

import {
  GRADE_TERM_ROLLUP,
  matchesGradeTermFilter,
  numericScoreForAverage,
  parseGradeTerm,
  type GradeTerm,
  type ScoreMark,
} from './marks.ts';

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
};

export type SyllabusCategoryInput = {
  key: string;
  label: string;
  weight_percent: number;
  sort_order?: number;
  active?: boolean;
  rules?: CategoryRules;
};

export type SyllabusInput = {
  status?: 'draft' | 'published' | 'archived' | null;
  categories: SyllabusCategoryInput[];
  policies?: SyllabusPolicies | null;
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
};

export type AverageCell = {
  assignmentId: string;
  approvedScore: number | null;
  scoreMark?: ScoreMark | null;
  /** Graded / approved only when approvedAt or explicit graded flag. */
  approvedAt?: string | null;
  status?: string | null;
  excused?: boolean;
};

export type AverageOptions = {
  termFilter?: 'all' | GradeTerm | string;
  /** Clock for not-due checks. Defaults to now. */
  now?: Date | string | number;
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
};

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

function mean(scores: number[]): number | null {
  if (!scores.length) return null;
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
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

function isDue(assignment: AverageAssignment, now: Date): boolean {
  if (!assignment.due_at) return true;
  const due = new Date(assignment.due_at);
  if (Number.isNaN(due.getTime())) return true;
  return due.getTime() <= now.getTime();
}

function isNotDueYet(assignment: AverageAssignment, now: Date): boolean {
  if (!assignment.due_at) return false;
  const due = new Date(assignment.due_at);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() > now.getTime();
}

function cellApproved(cell: AverageCell | undefined): boolean {
  if (!cell) return false;
  if (cell.approvedAt) return true;
  if (cell.status === 'graded') return true;
  return false;
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
    };
  }

  const policies: SyllabusPolicies = syllabus!.policies ?? {};
  const missingAsZero = policies.missing_as_zero === true;
  const floor = policies.min_floor_percent ?? null;
  const rounding = policies.rounding ?? 'nearest_whole';

  const activeCategories = [...syllabus!.categories]
    .filter((c) => c.active !== false && Number(c.weight_percent) > 0)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label));

  const categoryKeys = new Set(activeCategories.map((c) => c.key));
  const termAssignments = assignments.filter((row) => matchesGradeTermFilter(row, termFilter));

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

    const avg = mean(eligible.map((row) => row.score));
    categoryResults.push({
      key: category.key,
      label: category.label,
      weightPercent: Number(category.weight_percent),
      average: avg,
      eligibleCount: eligible.length,
      omitted: avg == null,
      renormalizedWeightPercent: null,
      contributions,
    });
  }

  const withData = categoryResults.filter((row) => row.average != null);
  const renormalized = withData.length > 0 && withData.length < categoryResults.length;
  if (renormalized) {
    disclosures.push(
      'Categories with no graded work yet are left out and the other weights are scaled so they still add to 100%.',
    );
  }

  if (!withData.length) {
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
    };
  }

  const weightTotal = withData.reduce((sum, row) => sum + row.weightPercent, 0);
  let overallUnrounded = 0;
  for (const row of categoryResults) {
    if (row.average == null || weightTotal <= 0) {
      row.renormalizedWeightPercent = null;
      continue;
    }
    const w = (row.weightPercent / weightTotal) * 100;
    row.renormalizedWeightPercent = w;
    overallUnrounded += row.average * (w / 100);
  }

  if (floor != null && Number.isFinite(floor)) {
    overallUnrounded = Math.max(overallUnrounded, Number(floor));
  }

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
  };
}

/** Plain-English rule lines for family syllabus summary. */
export function plainSyllabusRules(
  categories: SyllabusCategoryInput[],
  policies?: SyllabusPolicies | null,
): string[] {
  const lines: string[] = [];
  const p = policies ?? {};
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
  if (p.extra_credit_allowed) {
    lines.push('Extra-credit columns are allowed.');
  }
  for (const category of categories) {
    if (category.active === false) continue;
    const drop = category.rules?.drop_lowest_n ?? 0;
    if (drop > 0) {
      lines.push(`Drops the lowest ${drop} ${category.label} score${drop === 1 ? '' : 's'}.`);
    }
    const replace = category.rules?.replace_lowest_with_makeup;
    if (replace?.enabled) {
      const cap = replace.cap_percent != null ? `, at most ${replace.cap_percent}%` : '';
      lines.push(`A makeup can replace the lowest ${category.label}${cap}.`);
    }
  }
  return lines;
}

export function termKeysForFilter(filter: string): GradeTerm[] {
  if (filter === 'all') return GRADE_TERM_ROLLUP.all;
  return GRADE_TERM_ROLLUP[parseGradeTerm(filter)] ?? GRADE_TERM_ROLLUP.year;
}
