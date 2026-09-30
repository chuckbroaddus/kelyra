import type { EngineAssignment, EngineCell, LateRule } from './types.ts';

const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

export type LateOutcome =
  | { kind: 'ok'; earned: number }
  | { kind: 'missing' };

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** Apply late rule to a graded raw score. raw is points earned before penalty. */
export function applyLate(
  raw: number,
  assignment: EngineAssignment,
  cell: EngineCell,
  rule: LateRule,
): LateOutcome {
  const max = Math.max(0, assignment.max_points);
  let earned = raw;

  if (rule.type === 'none' && rule.hard_deadline_days == null) {
    return { kind: 'ok', earned };
  }

  const due = parseTime(assignment.due_at ?? null);
  const submitted = parseTime(cell.submitted_at ?? cell.graded_at ?? null);
  if (due == null) return { kind: 'ok', earned };

  const graceMs = (rule.grace_hours ?? 0) * MS_HOUR;
  const effectiveDue = due + graceMs;
  const when = submitted ?? Date.now();
  const lateMs = when - effectiveDue;
  if (lateMs <= 0) return { kind: 'ok', earned };

  const lateDays = lateMs / MS_DAY;
  const lateHours = lateMs / MS_HOUR;

  if (rule.hard_deadline_days != null && lateDays > rule.hard_deadline_days) {
    return { kind: 'missing' };
  }

  if (rule.type === 'none') return { kind: 'ok', earned };

  const amount = rule.amount ?? 0;
  const unit = rule.unit ?? 'percent';
  let penaltyUnits = 0;
  if (rule.type === 'flat') penaltyUnits = amount;
  else if (rule.type === 'per_day') penaltyUnits = amount * Math.ceil(lateDays - 1e-12);
  else if (rule.type === 'per_hour') penaltyUnits = amount * Math.ceil(lateHours - 1e-12);

  if (unit === 'points') {
    earned = Math.max(0, earned - penaltyUnits);
  } else {
    // percent of max_points (or of raw score? SRS: −10%/day on score 100 → 70 after 3 days)
    // Fixture: score 100, 3 days, −10%/day, floor 50% → 70. So penalty on the score percent.
    const pct = max > 0 ? (earned / max) * 100 : 0;
    const penalizedPct = Math.max(0, pct - penaltyUnits);
    earned = (penalizedPct / 100) * max;
  }

  if (rule.floor_pct != null && Number.isFinite(rule.floor_pct) && max > 0) {
    const floorEarned = (rule.floor_pct / 100) * max;
    earned = Math.max(earned, floorEarned);
  }

  return { kind: 'ok', earned };
}

export function daysLate(
  assignment: EngineAssignment,
  cell: EngineCell,
  graceHours = 0,
): number {
  const due = parseTime(assignment.due_at ?? null);
  const submitted = parseTime(cell.submitted_at ?? cell.graded_at ?? null);
  if (due == null || submitted == null) return 0;
  const lateMs = submitted - (due + graceHours * MS_HOUR);
  if (lateMs <= 0) return 0;
  return Math.ceil(lateMs / MS_DAY - 1e-12);
}
