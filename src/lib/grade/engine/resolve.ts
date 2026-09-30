import { applyLate } from './late.ts';
import type { Working } from './drop.ts';
import { pickRetakeScore } from './retake.ts';
import type {
  CellStatus,
  EngineAssignment,
  EngineCell,
  EngineSyllabus,
} from './types.ts';

export function resolveCell(
  assignment: EngineAssignment,
  cell: EngineCell | undefined,
  syllabus: EngineSyllabus,
): Working {
  const max = Math.max(0, assignment.max_points);
  const factor = assignment.item_factor > 0 ? assignment.item_factor : 1;
  const base = {
    assignment,
    droppable: assignment.droppable !== false,
    flags: assignment.flags ?? [],
    extra_credit: Boolean(assignment.extra_credit),
  };

  const status: CellStatus = cell?.status ?? 'ungraded';

  if (status === 'ungraded') {
    return { ...base, earned: 0, possible: 0, pct: 0, role: 'ungraded', note: 'Ungraded' };
  }
  if (status === 'excused') {
    return { ...base, earned: 0, possible: 0, pct: 0, role: 'omitted', note: 'Excused' };
  }
  if (status === 'dropped') {
    return { ...base, earned: 0, possible: 0, pct: 0, role: 'dropped', note: 'Manually dropped' };
  }
  if (status === 'incomplete') {
    return { ...base, earned: 0, possible: 0, pct: 0, role: 'incomplete', note: 'Incomplete' };
  }

  if (status === 'missing') {
    return resolveMissing(base, max, factor, syllabus);
  }

  return resolveGraded(base, assignment, cell, syllabus, max, factor, status);
}

function resolveMissing(
  base: Omit<Working, 'earned' | 'possible' | 'pct' | 'role' | 'note'>,
  max: number,
  factor: number,
  syllabus: EngineSyllabus,
): Working {
  if (syllabus.missing === 'omit') {
    return { ...base, earned: 0, possible: 0, pct: 0, role: 'omitted', note: 'Missing omitted' };
  }
  if (syllabus.missing === 'floor') {
    const floorPct = syllabus.missing_floor_pct ?? 0;
    return {
      ...base,
      earned: (floorPct / 100) * max * factor,
      possible: max * factor,
      pct: floorPct,
      role: 'counted',
      note: 'Missing as floor',
    };
  }
  return {
    ...base,
    earned: 0,
    possible: max * factor,
    pct: 0,
    role: 'counted',
    note: 'Missing as zero',
  };
}

function resolveGraded(
  base: Omit<Working, 'earned' | 'possible' | 'pct' | 'role' | 'note'>,
  assignment: EngineAssignment,
  cell: EngineCell | undefined,
  syllabus: EngineSyllabus,
  max: number,
  factor: number,
  status: CellStatus,
): Working {
  let raw = cell?.raw;
  let retakeNote: string | undefined;

  // Multi-attempt retake path (GB-15). Default off → cell.raw only.
  const attempts = cell?.attempts;
  if (attempts && attempts.length > 0) {
    const eligible =
      assignment.retake_eligible !== false &&
      (syllabus.retake == null ||
        !syllabus.retake.eligible_category_ids.length ||
        syllabus.retake.eligible_category_ids.includes(assignment.category));
    const pick = pickRetakeScore(
      attempts.map((a, i) => ({ raw: a.raw, at: a.at, index: i + 1 })),
      eligible ? syllabus.retake : null,
      max,
      assignment.category,
    );
    if (pick) {
      raw = pick.raw;
      if (pick.method !== 'single' || pick.capped || attempts.length > 1) {
        retakeNote = pick.note;
      }
    }
  }

  if (raw == null || !Number.isFinite(raw)) {
    return { ...base, earned: 0, possible: 0, pct: 0, role: 'ungraded', note: 'No raw score' };
  }
  if (!assignment.can_exceed_max && raw > max) raw = max;
  if (raw < 0) raw = 0;

  // Cap still applies when single raw and retake.cap set on eligible category
  if (
    syllabus.retake?.cap != null &&
    (!syllabus.retake.eligible_category_ids.length ||
      syllabus.retake.eligible_category_ids.includes(assignment.category)) &&
    assignment.retake_eligible !== false &&
    (!attempts || attempts.length <= 1)
  ) {
    const maxAllowed = (syllabus.retake.cap / 100) * max;
    if (raw > maxAllowed) {
      raw = maxAllowed;
      retakeNote = retakeNote ?? `Retake cap ${syllabus.retake.cap}% applied`;
    }
  }

  let earned = raw;
  const shouldLate =
    status === 'late' ||
    (Boolean(assignment.due_at) && Boolean(cell?.submitted_at ?? cell?.graded_at));
  if (shouldLate && cell) {
    const lateOut = applyLate(earned, assignment, cell, syllabus.late);
    if (lateOut.kind === 'missing') {
      return resolveMissing(base, max, factor, syllabus);
    }
    earned = lateOut.earned;
  }

  const isEcB = assignment.extra_credit && syllabus.extra_credit.method === 'B';
  earned = earned * factor;
  const pct = max > 0 ? (earned / (max * factor)) * 100 : 0;

  const sourceNote =
    cell?.score_source === 'group'
      ? 'Group score'
      : cell?.score_source === 'group_override'
        ? 'Group override'
        : undefined;
  const noteParts = [retakeNote, status === 'late' ? 'Late penalty applied' : undefined, sourceNote].filter(
    Boolean,
  ) as string[];

  if (isEcB) {
    return {
      ...base,
      earned,
      possible: 0,
      pct,
      role: 'ec',
      note: noteParts.length ? noteParts.join(' · ') : 'Extra credit method B',
    };
  }

  return {
    ...base,
    earned,
    possible: max * factor,
    pct,
    role: 'counted',
    note: noteParts.length ? noteParts.join(' · ') : undefined,
  };
}
