import { computePeriod } from './computePeriod.ts';
import { computeTerm } from './computeTerm.ts';
import type {
  EngineAssignment,
  EngineCell,
  EngineSyllabus,
  PeriodResult,
  TermRollup,
  WhatIfResult,
  WhatIfTarget,
} from './types.ts';

/**
 * FR-ENG-07: score needed on one assignment or term exam for a target percent.
 * Binary search on raw points (or exam pct 0–100).
 */
export function whatIf(
  syllabus: EngineSyllabus,
  assignments: EngineAssignment[],
  cells: EngineCell[],
  period_id: string,
  target: WhatIfTarget,
  opts?: {
    rollup?: TermRollup;
    childResults?: PeriodResult[];
    max_raw?: number;
  },
): WhatIfResult {
  if (target.exam) {
    return whatIfExam(target.target_pct, opts?.rollup, opts?.childResults ?? []);
  }
  const assignmentId = target.assignment_id;
  if (!assignmentId) {
    return { possible: false, raw_needed: null, note: 'assignment_id required' };
  }
  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { possible: false, raw_needed: null, note: 'assignment not found' };
  }

  const maxRaw = opts?.max_raw ?? (assignment.can_exceed_max ? assignment.max_points * 2 : assignment.max_points);
  const baseCells = cells.filter((c) => c.assignment_id !== assignmentId);

  const at = (raw: number): number | null => {
    const next: EngineCell[] = [
      ...baseCells,
      {
        assignment_id: assignmentId,
        raw,
        status: 'graded',
      },
    ];
    return computePeriod(syllabus, assignments, next, period_id).pct;
  };

  const targetPct = target.target_pct;
  const loPct = at(0);
  const hiPct = at(maxRaw);

  if (hiPct == null) {
    return { possible: false, raw_needed: null, note: 'no countable average' };
  }
  if (loPct != null && loPct >= targetPct) {
    return { possible: true, raw_needed: 0, note: 'already at or above target with 0' };
  }
  if (hiPct < targetPct) {
    return {
      possible: false,
      raw_needed: null,
      note: `max raw ${maxRaw} only reaches ${hiPct}`,
    };
  }

  let lo = 0;
  let hi = maxRaw;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const pct = at(mid);
    if (pct == null || pct < targetPct) lo = mid;
    else hi = mid;
  }
  const raw_needed = Math.ceil(hi * 10000) / 10000;
  return { possible: true, raw_needed };
}

function whatIfExam(
  targetPct: number,
  rollup: TermRollup | undefined,
  childResults: PeriodResult[],
): WhatIfResult {
  if (!rollup) {
    return { possible: false, raw_needed: null, note: 'rollup required for exam what-if' };
  }
  const at = (exam: number) => computeTerm(rollup, childResults, exam, { rounding: 'none' }).pct;

  const hi = at(100);
  const lo = at(0);
  if (hi == null) return { possible: false, raw_needed: null, note: 'term blocked or empty' };
  if (lo != null && lo >= targetPct) {
    return { possible: true, raw_needed: 0 };
  }
  if (hi < targetPct) {
    return { possible: false, raw_needed: null, note: `exam 100 only reaches ${hi}` };
  }
  let a = 0;
  let b = 100;
  for (let i = 0; i < 40; i++) {
    const mid = (a + b) / 2;
    const pct = at(mid);
    if (pct == null || pct < targetPct) a = mid;
    else b = mid;
  }
  return { possible: true, raw_needed: Math.ceil(b * 10000) / 10000 };
}
