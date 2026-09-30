import { roundPct, storePrecision } from './round.ts';
import type { EngineSyllabus, ItemBreakdown, PeriodResult } from './types.ts';
import type { Working } from './drop.ts';

export function toBreakdown(items: Working[]): ItemBreakdown[] {
  return items.map((i) => ({
    assignment_id: i.assignment.id,
    category: i.assignment.category,
    earned: i.role === 'counted' || i.role === 'ec' ? i.earned : null,
    possible: i.role === 'counted' ? i.possible : i.role === 'ec' ? 0 : null,
    pct: i.role === 'counted' || i.role === 'ec' ? i.pct : null,
    role: i.role,
    note: i.note,
  }));
}

export function applyEcFloorCeiling(
  syllabus: EngineSyllabus,
  periodPct: number | null,
  ecPointsAsPercent: number,
): {
  pct: number | null;
  ec_added: number;
  floor_applied: boolean;
  ceiling_applied: boolean;
  floor_ceiling_note: string | null;
} {
  if (periodPct == null) {
    return {
      pct: null,
      ec_added: 0,
      floor_applied: false,
      ceiling_applied: false,
      floor_ceiling_note: null,
    };
  }
  let pct = periodPct;
  let ec_added = 0;

  if (syllabus.extra_credit.method === 'B' && ecPointsAsPercent !== 0) {
    // percent-space: (earned + ec) / possible with possible fixed at 100 reference
    const next = storePrecision(pct + ecPointsAsPercent);
    ec_added = storePrecision(next - pct);
    pct = next;
  }

  const cap = syllabus.extra_credit.cap_pct;
  if (cap != null && Number.isFinite(cap) && ec_added > cap) {
    pct = storePrecision(pct - ec_added + cap);
    ec_added = cap;
  }

  const beforeFloorCeil = pct;
  let floor_applied = false;
  let ceiling_applied = false;
  if (syllabus.period_floor_pct != null && pct < syllabus.period_floor_pct) {
    pct = syllabus.period_floor_pct;
    floor_applied = true;
  }
  if (syllabus.ceiling_pct != null && pct > syllabus.ceiling_pct) {
    pct = syllabus.ceiling_pct;
    ceiling_applied = true;
  }

  let floor_ceiling_note: string | null = null;
  if (floor_applied) {
    floor_ceiling_note = `Period floor ${syllabus.period_floor_pct}% raised ${storePrecision(beforeFloorCeil)} → ${pct}`;
  } else if (ceiling_applied) {
    floor_ceiling_note = `Period ceiling ${syllabus.ceiling_pct}% capped ${storePrecision(beforeFloorCeil)} → ${pct}`;
  }

  pct = storePrecision(roundPct(pct, syllabus.rounding, syllabus.decimals ?? 0));
  return { pct, ec_added, floor_applied, ceiling_applied, floor_ceiling_note };
}

export function emptyPeriod(period_id: string, blocked = false): PeriodResult {
  return {
    period_id,
    pct: null,
    categories: [],
    renormalized: false,
    ec_added: 0,
    floor_applied: false,
    ceiling_applied: false,
    floor_ceiling_note: null,
    blocked_by_incomplete: blocked,
    min_grades_blocked: false,
  };
}

export function categoryPointsPct(counted: Working[]): number | null {
  if (!counted.length) return null;
  const earned = counted.reduce((s, i) => s + i.earned, 0);
  const possible = counted.reduce((s, i) => s + i.possible, 0);
  if (possible <= 0) return null;
  return storePrecision((earned / possible) * 100);
}

export function categoryPercentInside(counted: Working[]): number | null {
  if (!counted.length) return null;
  let wSum = 0;
  let acc = 0;
  for (const i of counted) {
    const w = i.assignment.item_factor > 0 ? i.assignment.item_factor : 1;
    acc += i.pct * w;
    wSum += w;
  }
  if (wSum <= 0) return null;
  return storePrecision(acc / wSum);
}
