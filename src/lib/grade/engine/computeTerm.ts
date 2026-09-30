import { rollupWithoutExam } from './examExemption.ts';
import { roundPct, storePrecision } from './round.ts';
import type { PeriodResult, TermResult, TermRollup } from './types.ts';

export type ComputeTermOptions = {
  rounding?: 'nearest_whole' | 'half_up' | 'truncate' | 'none';
  decimals?: number;
  /**
   * FR-CR-06 / AC12: drop exam weight and renormalize remaining components.
   * When true, examPct is ignored even if provided.
   */
  exam_exempt?: boolean;
  /** Optional note for breakdown (defaults when exempt). */
  exam_exempt_note?: string | null;
};

/**
 * FR-ENG-05: semester/year from child period averages + optional term exam.
 * Exam is a term component (period_id 'exam' or rollup.exam.code), never double-counted inside a category.
 */
export function computeTerm(
  rollup: TermRollup,
  childResults: PeriodResult[],
  examPct: number | null | undefined,
  options: ComputeTermOptions = {},
): TermResult {
  const examExempt = options.exam_exempt === true;
  const effectiveRollup = examExempt ? rollupWithoutExam(rollup) : rollup;
  const effectiveExam = examExempt ? null : examPct;

  const byId = new Map(childResults.map((r) => [r.period_id, r]));
  const examCode = effectiveRollup.exam?.code || 'exam';
  const components_used: TermResult['components_used'] = [];

  type Part = { period_id: string; weight: number; pct: number };
  const present: Part[] = [];
  let missing = false;

  for (const comp of effectiveRollup.components) {
    const isExam =
      comp.period_id === 'exam' ||
      comp.period_id === examCode ||
      (effectiveRollup.exam?.enabled && comp.period_id.toLowerCase() === 'exam');

    if (isExam) {
      if (!effectiveRollup.exam?.enabled || effectiveExam == null || !Number.isFinite(effectiveExam)) {
        missing = true;
        components_used.push({ period_id: comp.period_id, weight_used: 0, pct: null });
        continue;
      }
      present.push({ period_id: comp.period_id, weight: comp.weight, pct: effectiveExam });
      continue;
    }

    const child = byId.get(comp.period_id);
    if (!child || child.pct == null) {
      missing = true;
      components_used.push({ period_id: comp.period_id, weight_used: 0, pct: null });
      continue;
    }
    present.push({ period_id: comp.period_id, weight: comp.weight, pct: child.pct });
  }

  // When exempt, still record exam row as omitted for explain UI
  if (examExempt && rollup.exam?.enabled) {
    const examComp = rollup.components.find((c) => {
      const id = c.period_id.toLowerCase();
      return id === 'exam' || id === (rollup.exam.code || 'exam').toLowerCase();
    });
    if (examComp && !components_used.some((c) => c.period_id === examComp.period_id)) {
      components_used.push({ period_id: examComp.period_id, weight_used: 0, pct: null });
    }
  }

  if (missing && effectiveRollup.missing_child === 'block') {
    return {
      term_id: effectiveRollup.term_id,
      pct: null,
      renormalized: false,
      blocked: true,
      exam_exempt: examExempt,
      exam_exempt_note: examExempt
        ? options.exam_exempt_note ?? 'Exam exempt'
        : null,
      components_used: effectiveRollup.components.map((c) => {
        const p = present.find((x) => x.period_id === c.period_id);
        return {
          period_id: c.period_id,
          weight_used: p ? 0 : 0,
          pct:
            p?.pct ??
            byId.get(c.period_id)?.pct ??
            (c.period_id === examCode ? effectiveExam ?? null : null),
        };
      }),
    };
  }

  const weightTotal = present.reduce((s, p) => s + p.weight, 0);
  if (!present.length || weightTotal <= 0) {
    return {
      term_id: effectiveRollup.term_id,
      pct: null,
      renormalized: false,
      blocked: false,
      exam_exempt: examExempt,
      exam_exempt_note: examExempt ? options.exam_exempt_note ?? 'Exam exempt' : null,
      components_used,
    };
  }

  const renormalized =
    examExempt || (missing && effectiveRollup.missing_child === 'renormalize');
  let sum = 0;
  for (const p of present) {
    const wu = p.weight / weightTotal;
    components_used.push({ period_id: p.period_id, weight_used: storePrecision(wu), pct: p.pct });
    sum += p.pct * wu;
  }

  let pct = storePrecision(sum);
  const rounding = options.rounding ?? 'none';
  pct = storePrecision(roundPct(pct, rounding, options.decimals ?? 0));

  return {
    term_id: effectiveRollup.term_id,
    pct,
    renormalized,
    blocked: false,
    exam_exempt: examExempt,
    exam_exempt_note: examExempt
      ? options.exam_exempt_note ?? 'Exam exempt — remaining weights renormalized'
      : null,
    components_used,
  };
}
