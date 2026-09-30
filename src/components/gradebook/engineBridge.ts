/**
 * GB-10: map live gradebook rows → engine v2 inputs and run computePeriod / whatIf.
 */
import {
  computePeriod,
  whatIf,
  type EngineAssignment,
  type EngineCell,
  type EngineSyllabus,
  type PeriodResult,
  type WhatIfResult,
  type WhatIfTarget,
  type CellStatus,
} from '../../lib/grade/engine/index.ts';
import { numericScoreForAverage, type ScoreMark } from '../../lib/grade/marks.ts';
import type {
  SyllabusCategoryInput,
  SyllabusPolicies,
} from '../../lib/grade/syllabusAverage.ts';
import { getScaleTemplate, letterFor, type GradeScale } from '../../lib/grade/scale/scale.ts';

export type BridgeAssignment = {
  id: string;
  title: string;
  category?: string | null;
  include_in_average?: boolean | null;
  max_score?: number | null;
  due_at?: string | null;
  is_makeup?: boolean;
  extra_credit?: boolean;
  period_id?: string | null;
  marking_period_id?: string | null;
  term?: string | null;
};

export type BridgeCell = {
  assignmentId: string;
  approvedScore: number | null;
  scoreMark?: ScoreMark | null;
  status?: string | null;
  approved?: boolean;
  excused?: boolean;
  submitted_at?: string | null;
  graded_at?: string | null;
};

export type BridgeSyllabus = {
  categories: SyllabusCategoryInput[];
  policies?: SyllabusPolicies | null;
  /** Optional engine-v2 fields when full syllabus is available. */
  ceiling_pct?: number | null;
  retake?: import('../../lib/grade/engine/types.ts').RetakeRule | null;
};

function asCellStatus(cell: BridgeCell): CellStatus {
  if (cell.excused) return 'excused';
  const st = (cell.status ?? '').toLowerCase();
  if (st === 'excused') return 'excused';
  if (st === 'missing') return 'missing';
  if (st === 'late') return 'late';
  if (st === 'dropped') return 'dropped';
  if (st === 'incomplete') return 'incomplete';
  if (cell.approved || st === 'graded' || st === 'approved') {
    return 'graded';
  }
  return 'ungraded';
}

export function buildEngineSyllabus(syllabus: BridgeSyllabus): EngineSyllabus {
  const policies = syllabus.policies ?? {};
  const floor =
    policies.min_floor_percent != null && Number.isFinite(Number(policies.min_floor_percent))
      ? Number(policies.min_floor_percent)
      : null;
  const ceiling =
    syllabus.ceiling_pct != null && Number.isFinite(Number(syllabus.ceiling_pct))
      ? Number(syllabus.ceiling_pct)
      : null;
  return {
    engine: 'weighted_percent_inside',
    categories: syllabus.categories
      .filter((c) => c.active !== false)
      .map((c) => ({
        key: c.key,
        label: c.label,
        weight: Number(c.weight_percent) || 0,
        include: true,
        drop_lowest: c.rules?.drop_lowest_n ?? 0,
      })),
    missing: policies.missing_as_zero ? 'zero' : 'omit',
    late: { type: 'none' },
    extra_credit: { method: 'B' },
    period_floor_pct: floor,
    ceiling_pct: ceiling,
    retake: syllabus.retake ?? null,
    empty_category: 'renormalize',
    book_mode: 'reset_each_marking_period',
    rounding: policies.rounding === 'nearest_whole' ? 'nearest_whole' : 'none',
    decimals: 0,
  };
}

export function buildEngineAssignments(
  assignments: BridgeAssignment[],
  periodId: string,
): EngineAssignment[] {
  return assignments.map((a) => {
    const cat = (a.category && String(a.category).trim()) || 'other';
    const max = a.max_score != null && Number(a.max_score) > 0 ? Number(a.max_score) : 100;
    const include = a.include_in_average !== false;
    return {
      id: a.id,
      category: cat,
      period_id: a.period_id || a.marking_period_id || periodId,
      max_points: max,
      due_at: a.due_at ?? null,
      count_toward_final: include && !a.extra_credit,
      extra_credit: Boolean(a.extra_credit),
      can_exceed_max: false,
      item_factor: 1,
      droppable: true,
    };
  });
}

export function buildEngineCells(cells: BridgeCell[]): EngineCell[] {
  return cells.map((c) => {
    const status = asCellStatus(c);
    const raw =
      status === 'graded' || status === 'late' || status === 'missing'
        ? numericScoreForAverage(c.scoreMark ?? 'numeric', c.approvedScore)
        : null;
    return {
      assignment_id: c.assignmentId,
      raw,
      status,
      submitted_at: c.submitted_at ?? null,
      graded_at: c.graded_at ?? null,
    };
  });
}

export function enginePeriodIdForFilter(filterId: string): string {
  if (!filterId || filterId === 'all') return 'all';
  return filterId;
}

export function computeStudentPeriod(
  syllabus: BridgeSyllabus,
  assignments: BridgeAssignment[],
  cells: BridgeCell[],
  periodFilter: string,
): PeriodResult {
  const period_id = enginePeriodIdForFilter(periodFilter);
  const engineSyllabus = buildEngineSyllabus(syllabus);
  const engineAssignments = buildEngineAssignments(assignments, period_id).map((a) => ({
    ...a,
    period_id,
  }));
  const engineCells = buildEngineCells(cells);
  return computePeriod(engineSyllabus, engineAssignments, engineCells, period_id);
}

export function runWhatIf(
  syllabus: BridgeSyllabus,
  assignments: BridgeAssignment[],
  cells: BridgeCell[],
  periodFilter: string,
  target: WhatIfTarget,
  opts?: { max_raw?: number },
): WhatIfResult {
  const period_id = enginePeriodIdForFilter(periodFilter);
  const engineSyllabus = buildEngineSyllabus(syllabus);
  const engineAssignments = buildEngineAssignments(assignments, period_id).map((a) => ({
    ...a,
    period_id,
  }));
  const engineCells = buildEngineCells(cells);
  return whatIf(engineSyllabus, engineAssignments, engineCells, period_id, target, opts);
}

export function targetPctForLetter(letter: string, scale?: GradeScale | null): number | null {
  const s = scale ?? getScaleTemplate('us_10');
  if (!s || s.kind !== 'percent') return null;
  const band = s.bands.find((b) => b.letter.toUpperCase() === letter.trim().toUpperCase());
  if (!band) return null;
  return Math.round(((band.min_pct + Math.min(band.max_pct, 100)) / 2) * 100) / 100;
}

export function letterForPct(pct: number | null, scaleKey = 'us_10'): string | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const scale = getScaleTemplate(scaleKey);
  if (!scale) return null;
  return letterFor(scale, pct);
}

export type { PeriodResult, WhatIfResult, WhatIfTarget, EngineSyllabus };
