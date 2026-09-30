/**
 * GB-15 exam exemption (FR-CR-06, SRS §6.3 / §7.6 / AC12).
 * Default OFF — existing rollups unchanged until enabled + student exempt.
 */
import type { ExamExemptionPolicy, TermRollup } from './types.ts';

export type ExamExemptDecision = {
  exempt: boolean;
  reason: string;
  eligible: boolean;
};

export function defaultExamExemptionPolicy(): ExamExemptionPolicy {
  return {
    enabled: false,
    min_avg: null,
    max_absences: null,
    renormalize: true,
  };
}

export function parseExamExemptionPolicy(raw: unknown): ExamExemptionPolicy {
  const d = defaultExamExemptionPolicy();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled === true,
    min_avg: o.min_avg == null || o.min_avg === '' ? null : Number(o.min_avg),
    max_absences: o.max_absences == null || o.max_absences === '' ? null : Number(o.max_absences),
    renormalize: o.renormalize !== false,
  };
}

/**
 * Eligibility from pre-exam average + absences against school policy.
 * When policy.enabled is false, never auto-eligible (teacher flag still can force).
 */
export function isExamExemptionEligible(
  preExamAvg: number | null | undefined,
  absences: number | null | undefined,
  policy: ExamExemptionPolicy | null | undefined,
): boolean {
  if (!policy?.enabled) return false;
  if (policy.min_avg != null && Number.isFinite(policy.min_avg)) {
    if (preExamAvg == null || !Number.isFinite(preExamAvg) || preExamAvg < policy.min_avg) {
      return false;
    }
  }
  if (policy.max_absences != null && Number.isFinite(policy.max_absences)) {
    if (absences == null || !Number.isFinite(absences) || absences > policy.max_absences) {
      return false;
    }
  }
  return true;
}

export function decideExamExemption(input: {
  policy: ExamExemptionPolicy | null | undefined;
  /** Teacher/admin explicit flag on the term. */
  exam_exempt?: boolean | null;
  pre_exam_avg?: number | null;
  absences?: number | null;
}): ExamExemptDecision {
  const forced = input.exam_exempt === true;
  const eligible = isExamExemptionEligible(input.pre_exam_avg, input.absences, input.policy);
  if (forced) {
    return { exempt: true, eligible, reason: 'Exam exempt (flagged)' };
  }
  if (eligible && input.policy?.enabled) {
    return { exempt: true, eligible: true, reason: 'Exam exempt (policy thresholds met)' };
  }
  return { exempt: false, eligible, reason: 'Exam counted' };
}

/** Drop exam component(s) from a rollup copy for exemption + renormalize. */
export function rollupWithoutExam(rollup: TermRollup): TermRollup {
  const examCode = (rollup.exam?.code || 'exam').toLowerCase();
  return {
    ...rollup,
    exam: { enabled: false, code: rollup.exam?.code || 'exam' },
    components: rollup.components.filter((c) => {
      const id = c.period_id.toLowerCase();
      return id !== 'exam' && id !== examCode;
    }),
    missing_child: rollup.missing_child === 'block' ? 'block' : 'renormalize',
  };
}

/** Pre-exam mean of non-exam child percents (equal weight) for threshold checks. */
export function preExamAverage(
  childPcts: Array<{ period_id: string; pct: number | null }>,
  rollup: TermRollup,
): number | null {
  const examCode = (rollup.exam?.code || 'exam').toLowerCase();
  const vals: number[] = [];
  for (const c of childPcts) {
    const id = c.period_id.toLowerCase();
    if (id === 'exam' || id === examCode) continue;
    if (c.pct != null && Number.isFinite(c.pct)) vals.push(c.pct);
  }
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
