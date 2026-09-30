import { roundPct, storePrecision } from './round.ts';
import type { PeriodResult, TermResult, TermRollup } from './types.ts';

export type ComputeTermOptions = {
  rounding?: 'nearest_whole' | 'half_up' | 'truncate' | 'none';
  decimals?: number;
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
  const byId = new Map(childResults.map((r) => [r.period_id, r]));
  const examCode = rollup.exam?.code || 'exam';
  const components_used: TermResult['components_used'] = [];

  type Part = { period_id: string; weight: number; pct: number };
  const present: Part[] = [];
  let missing = false;

  for (const comp of rollup.components) {
    const isExam =
      comp.period_id === 'exam' ||
      comp.period_id === examCode ||
      (rollup.exam?.enabled && comp.period_id.toLowerCase() === 'exam');

    if (isExam) {
      if (!rollup.exam?.enabled || examPct == null || !Number.isFinite(examPct)) {
        missing = true;
        components_used.push({ period_id: comp.period_id, weight_used: 0, pct: null });
        continue;
      }
      present.push({ period_id: comp.period_id, weight: comp.weight, pct: examPct });
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

  if (missing && rollup.missing_child === 'block') {
    return {
      term_id: rollup.term_id,
      pct: null,
      renormalized: false,
      blocked: true,
      components_used: rollup.components.map((c) => {
        const p = present.find((x) => x.period_id === c.period_id);
        return {
          period_id: c.period_id,
          weight_used: p ? 0 : 0,
          pct: p?.pct ?? byId.get(c.period_id)?.pct ?? (c.period_id === examCode ? examPct ?? null : null),
        };
      }),
    };
  }

  const weightTotal = present.reduce((s, p) => s + p.weight, 0);
  if (!present.length || weightTotal <= 0) {
    return {
      term_id: rollup.term_id,
      pct: null,
      renormalized: false,
      blocked: false,
      components_used,
    };
  }

  const renormalized = missing && rollup.missing_child === 'renormalize';
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
    term_id: rollup.term_id,
    pct,
    renormalized,
    blocked: false,
    components_used,
  };
}
