/**
 * Rubric scoring math — FR-RUB-02 / FR-RUB-03. Pure; no I/O.
 */
import type {
  AssessmentSelection,
  MapScoreResult,
  MapToAssignment,
  Rubric,
  RubricCellDef,
  RubricCriterion,
  ScoreResult,
} from './types.ts';

function finite(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

function cellPoints(
  rubric: Rubric,
  criterionId: string,
  levelId: string | null | undefined,
  typed: number | null | undefined,
): number | null {
  if (!levelId) return finite(typed) ? typed : null;
  const def = rubric.cells.find(
    (c) => c.criterion_id === criterionId && c.level_id === levelId,
  );
  if (!def) {
    if (finite(typed)) return typed;
    const level = rubric.levels.find((l) => l.id === levelId);
    return finite(level?.default_points) ? (level!.default_points as number) : null;
  }
  if (finite(typed)) {
    const min = finite(def.range_min) ? def.range_min! : def.points;
    const max = finite(def.range_max) ? def.range_max! : def.points;
    if (def.range_min != null || def.range_max != null) {
      return Math.min(max, Math.max(min, typed));
    }
    return typed;
  }
  if (finite(def.range_max)) return def.range_max!;
  return def.points;
}

function selectionFor(
  selections: AssessmentSelection[],
  criterionId: string,
): AssessmentSelection | undefined {
  return selections.find((s) => s.criterion_id === criterionId);
}

function weightSum(criteria: RubricCriterion[], includeIds: Set<string>): number {
  let sum = 0;
  for (const c of criteria) {
    if (c.extra_credit) continue;
    if (!includeIds.has(c.id)) continue;
    sum += c.weight_pct ?? 0;
  }
  return sum;
}

/**
 * Compute earned/max from rubric definition + teacher selections.
 * N/A omits criterion from earned and max; weighted renormalizes.
 * Extra-credit adds to earned only. override_total replaces earned.
 */
export function scoreRubric(
  rubric: Rubric,
  selections: AssessmentSelection[],
  options?: { holistic_level_id?: string | null; override_total?: number | null },
): ScoreResult {
  const method = rubric.scoring.method;
  const criterion_results: ScoreResult['criterion_results'] = [];

  if (method === 'none') {
    for (const c of rubric.criteria) {
      const sel = selectionFor(selections, c.id);
      const na = Boolean(sel?.na);
      criterion_results.push({
        criterion_id: c.id,
        earned: na ? null : finite(sel?.points_awarded) ? sel!.points_awarded : null,
        max: c.max_points,
        na,
        weight_used: null,
      });
    }
    const override = options?.override_total;
    return {
      earned: finite(override) ? override : 0,
      max: 0,
      percent: null,
      method,
      overridden: finite(override),
      criterion_results,
    };
  }

  if (method === 'holistic_points' || rubric.kind === 'holistic') {
    return scoreHolistic(rubric, selections, options, criterion_results);
  }

  const active = new Set<string>();
  for (const c of rubric.criteria) {
    const sel = selectionFor(selections, c.id);
    if (sel?.na && c.na_allowed) continue;
    if (!c.extra_credit) active.add(c.id);
  }

  if (method === 'weighted_criteria') {
    return scoreWeighted(rubric, selections, active, options, criterion_results);
  }

  return scoreSumPoints(rubric, selections, options, criterion_results);
}

function scoreHolistic(
  rubric: Rubric,
  selections: AssessmentSelection[],
  options: { holistic_level_id?: string | null; override_total?: number | null } | undefined,
  criterion_results: ScoreResult['criterion_results'],
): ScoreResult {
  const levelId = options?.holistic_level_id ?? selections[0]?.level_id ?? null;
  let earned = 0;
  let max = 0;
  const level = rubric.levels.find((l) => l.id === levelId);
  if (level) {
    const holCell = rubric.cells.find((c) => c.level_id === levelId);
    earned = finite(holCell?.points)
      ? holCell!.points
      : finite(level.default_points)
        ? (level.default_points as number)
        : 0;
    max = Math.max(
      ...rubric.levels.map((l) => {
        const cell = rubric.cells.find((c) => c.level_id === l.id);
        if (finite(cell?.points)) return cell!.points;
        if (finite(l.default_points)) return l.default_points as number;
        return 0;
      }),
      0,
    );
  }
  if (rubric.criteria.length >= 1) {
    const c = rubric.criteria[0]!;
    max = Math.max(max, c.max_points);
    criterion_results.push({
      criterion_id: c.id,
      earned,
      max: c.max_points,
      na: false,
      weight_used: null,
    });
  }
  const overridden = finite(options?.override_total);
  if (overridden) earned = options!.override_total as number;
  const percent = max > 0 ? (earned / max) * 100 : null;
  return {
    earned,
    max,
    percent,
    method: 'holistic_points',
    overridden,
    criterion_results,
  };
}

function scoreWeighted(
  rubric: Rubric,
  selections: AssessmentSelection[],
  active: Set<string>,
  options: { holistic_level_id?: string | null; override_total?: number | null } | undefined,
  criterion_results: ScoreResult['criterion_results'],
): ScoreResult {
  const wTotal = weightSum(rubric.criteria, active);
  let weightedPct = 0;
  let maxPts = 0;
  for (const c of rubric.criteria) {
    const sel = selectionFor(selections, c.id);
    const na = Boolean(sel?.na && c.na_allowed);
    if (na) {
      criterion_results.push({
        criterion_id: c.id,
        earned: null,
        max: c.max_points,
        na: true,
        weight_used: 0,
      });
      continue;
    }
    const pts = cellPoints(rubric, c.id, sel?.level_id, sel?.points_awarded);
    const awarded = finite(pts) ? pts : 0;
    const maxC = c.max_points > 0 ? c.max_points : 0;
    if (c.extra_credit) {
      criterion_results.push({
        criterion_id: c.id,
        earned: awarded,
        max: maxC,
        na: false,
        weight_used: 0,
      });
      // EC: bump earned points after base weighted conversion
      continue;
    }
    const rawW = c.weight_pct ?? 0;
    const w = wTotal > 0 ? (rawW / wTotal) * 100 : 0;
    const critPct = maxC > 0 ? (awarded / maxC) * 100 : 0;
    weightedPct += (critPct * w) / 100;
    maxPts += maxC;
    criterion_results.push({
      criterion_id: c.id,
      earned: awarded,
      max: maxC,
      na: false,
      weight_used: w,
    });
  }
  // Add EC points onto weighted earned
  let ec = 0;
  for (const c of rubric.criteria) {
    if (!c.extra_credit) continue;
    const sel = selectionFor(selections, c.id);
    if (sel?.na && c.na_allowed) continue;
    const pts = cellPoints(rubric, c.id, sel?.level_id, sel?.points_awarded);
    if (finite(pts)) ec += pts;
  }
  const max = maxPts > 0 ? maxPts : 100;
  let earned = maxPts > 0 ? (weightedPct / 100) * maxPts + ec : weightedPct + ec;
  const percent = max > 0 ? (earned / max) * 100 : weightedPct;
  const overridden = finite(options?.override_total);
  if (overridden) earned = options!.override_total as number;
  const finalPct = overridden && max > 0 ? (earned / max) * 100 : percent;
  return {
    earned,
    max,
    percent: finalPct,
    method: 'weighted_criteria',
    overridden,
    criterion_results,
  };
}

function scoreSumPoints(
  rubric: Rubric,
  selections: AssessmentSelection[],
  options: { holistic_level_id?: string | null; override_total?: number | null } | undefined,
  criterion_results: ScoreResult['criterion_results'],
): ScoreResult {
  let earned = 0;
  let max = 0;
  for (const c of rubric.criteria) {
    const sel = selectionFor(selections, c.id);
    const na = Boolean(sel?.na && c.na_allowed);
    if (na) {
      criterion_results.push({
        criterion_id: c.id,
        earned: null,
        max: c.max_points,
        na: true,
        weight_used: null,
      });
      continue;
    }
    const pts = cellPoints(rubric, c.id, sel?.level_id, sel?.points_awarded);
    const awarded = finite(pts) ? pts : 0;
    earned += awarded;
    if (!c.extra_credit) max += c.max_points;
    criterion_results.push({
      criterion_id: c.id,
      earned: awarded,
      max: c.max_points,
      na: false,
      weight_used: null,
    });
  }
  const overridden = finite(options?.override_total);
  if (overridden) earned = options!.override_total as number;
  const percent = max > 0 ? (earned / max) * 100 : null;
  return {
    earned,
    max,
    percent,
    method: 'sum_points',
    overridden,
    criterion_results,
  };
}

export function mapToAssignmentScore(
  result: ScoreResult,
  assignmentMax: number | null | undefined,
  map: MapToAssignment,
): MapScoreResult {
  const rubMax = result.max;
  const rubEarned = result.earned;
  const pct =
    result.percent != null && Number.isFinite(result.percent)
      ? result.percent
      : rubMax > 0
        ? (rubEarned / rubMax) * 100
        : 0;
  if (map === 'scale') {
    const max = finite(assignmentMax) && assignmentMax! > 0 ? assignmentMax! : rubMax || 100;
    return { raw_points: (pct / 100) * max, max_points: max, percent: pct, map };
  }
  const max = rubMax > 0 ? rubMax : finite(assignmentMax) ? assignmentMax! : 0;
  return {
    raw_points: rubEarned,
    max_points: max,
    percent: max > 0 ? (rubEarned / max) * 100 : pct,
    map,
  };
}

export function defaultPointsForCell(cell: RubricCellDef): number {
  if (finite(cell.range_max)) return cell.range_max!;
  return cell.points;
}

export function emptySelections(rubric: Rubric): AssessmentSelection[] {
  return rubric.criteria.map((c) => ({
    criterion_id: c.id,
    level_id: null,
    points_awarded: null,
    comment: '',
    na: false,
  }));
}

export { cellPoints, selectionFor, weightSum, finite };
