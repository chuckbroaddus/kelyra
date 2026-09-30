import { applyDrops, type Working } from './drop.ts';
import {
  applyEcFloorCeiling,
  categoryPercentInside,
  categoryPointsPct,
  emptyPeriod,
  toBreakdown,
} from './finish.ts';
import { resolveCell } from './resolve.ts';
import { storePrecision } from './round.ts';
import type {
  CategoryResult,
  EngineAssignment,
  EngineCell,
  EngineSyllabus,
  PeriodResult,
} from './types.ts';

function collectWorking(
  syllabus: EngineSyllabus,
  assignments: EngineAssignment[],
  cells: EngineCell[],
  period_id: string,
): { working: Working[]; blocked: boolean } {
  const byId = new Map(cells.map((c) => [c.assignment_id, c]));
  const inScope = assignments.filter((a) => {
    if (!a.count_toward_final && !a.extra_credit) return false;
    if (syllabus.book_mode === 'reset_each_marking_period') {
      return a.period_id === period_id;
    }
    return true;
  });
  let blocked = false;
  const working: Working[] = [];
  for (const a of inScope) {
    const w = resolveCell(a, byId.get(a.id), syllabus);
    if (w.role === 'incomplete') blocked = true;
    working.push(w);
  }
  return { working, blocked };
}

export function computePeriod(
  syllabus: EngineSyllabus,
  assignments: EngineAssignment[],
  cells: EngineCell[],
  period_id: string,
): PeriodResult {
  if (syllabus.engine === 'none') return emptyPeriod(period_id);

  const { working, blocked } = collectWorking(syllabus, assignments, cells, period_id);

  if (syllabus.engine === 'total_points') {
    return totalPoints(syllabus, working, period_id, blocked);
  }
  if (syllabus.engine === 'item_weights') {
    return itemWeights(syllabus, working, period_id, blocked);
  }
  return weighted(syllabus, working, period_id, blocked);
}

function totalPoints(
  syllabus: EngineSyllabus,
  working: Working[],
  period_id: string,
  blocked: boolean,
): PeriodResult {
  const counted = working.filter((w) => w.role === 'counted');
  const ec = working.filter((w) => w.role === 'ec');
  const possible = counted.reduce((s, i) => s + i.possible, 0);
  let periodPct: number | null = null;
  let ecPts = 0;
  if (possible > 0) {
    const earned = counted.reduce((s, i) => s + i.earned, 0);
    periodPct = storePrecision((earned / possible) * 100);
    if (syllabus.extra_credit.method === 'B') {
      const add = ec.reduce((s, i) => s + i.earned, 0);
      // add as points on the same scale: (earned+ec)/possible*100
      const next = storePrecision(((earned + add) / possible) * 100);
      ecPts = storePrecision(next - periodPct);
      // applyEcFloorCeiling also adds method B in percent-space; pass 0 and bake in here
      periodPct = next;
    }
  }
  const fin = applyEcFloorCeiling(syllabus, periodPct, 0);
  // restore ec_added from points path
  if (ecPts && fin.pct != null) {
    fin.ec_added = ecPts;
  }
  return {
    period_id,
    pct: fin.pct,
    categories: [
      {
        key: '_total',
        pct: fin.pct,
        weight_used: 1,
        items: toBreakdown(working),
        eligible_count: counted.length,
        min_grades_met: true,
      },
    ],
    renormalized: false,
    ec_added: fin.ec_added,
    floor_applied: fin.floor_applied,
    blocked_by_incomplete: blocked,
    min_grades_blocked: false,
  };
}

function itemWeights(
  syllabus: EngineSyllabus,
  working: Working[],
  period_id: string,
  blocked: boolean,
): PeriodResult {
  const counted = working.filter((w) => w.role === 'counted');
  const ec = working.filter((w) => w.role === 'ec');
  let weightTotal = 0;
  const parts: { pct: number; w: number }[] = [];
  for (const i of counted) {
    const w = i.assignment.item_weight_pct ?? 0;
    if (w <= 0) continue;
    parts.push({ pct: i.pct, w });
    weightTotal += w;
  }
  let periodPct: number | null = null;
  let renormalized = false;
  if (parts.length && weightTotal > 0) {
    const declared = counted.reduce((s, i) => s + (i.assignment.item_weight_pct ?? 0), 0);
    if (Math.abs(declared - 100) > 1e-6) renormalized = true;
    let sum = 0;
    for (const p of parts) sum += p.pct * (p.w / weightTotal);
    periodPct = storePrecision(sum);
  }
  const ecPct = syllabus.extra_credit.method === 'B' ? ec.reduce((s, i) => s + i.earned, 0) : 0;
  const fin = applyEcFloorCeiling(syllabus, periodPct, ecPct);
  return {
    period_id,
    pct: fin.pct,
    categories: [],
    renormalized,
    ec_added: fin.ec_added,
    floor_applied: fin.floor_applied,
    blocked_by_incomplete: blocked,
    min_grades_blocked: false,
  };
}

function isMethodCOnlyEc(working: Working[], key: string): boolean {
  const members = working.filter((w) => w.assignment.category === key);
  if (!members.length) return false;
  return members.every(
    (w) =>
      w.extra_credit ||
      w.role === 'ec' ||
      w.role === 'ungraded' ||
      w.role === 'omitted',
  );
}

function weighted(
  syllabus: EngineSyllabus,
  working: Working[],
  period_id: string,
  blocked: boolean,
): PeriodResult {
  const catDefs = syllabus.categories.filter((c) => c.include !== false);
  const pointsInside = syllabus.engine === 'weighted_points_inside';
  const methodC = syllabus.extra_credit.method === 'C';
  const emptyMode = syllabus.empty_category ?? 'renormalize';

  const categoryResults: CategoryResult[] = [];
  let min_grades_blocked = false;

  for (const cat of catDefs) {
    let items = working.filter((w) => w.assignment.category === cat.key);
    items = applyDrops(items, cat);
    const counted = items.filter((i) => i.role === 'counted');
    const pct = pointsInside ? categoryPointsPct(counted) : categoryPercentInside(counted);
    const eligible_count = counted.length;
    const minG = cat.min_grades ?? 0;
    const min_grades_met = minG <= 0 || eligible_count >= minG;
    if (!min_grades_met) min_grades_blocked = true;
    categoryResults.push({
      key: cat.key,
      pct,
      weight_used: 0,
      items: toBreakdown(items),
      eligible_count,
      min_grades_met,
    });
  }

  const mainCats = categoryResults.filter((c) => !(methodC && isMethodCOnlyEc(working, c.key)));
  const scored = mainCats.filter((c) => c.pct != null);
  let renormalized = false;
  let periodPct: number | null = null;

  const usable: { cat: CategoryResult; weight: number; pct: number }[] = [];
  let weightTotal = 0;
  for (const c of mainCats) {
    const def = catDefs.find((d) => d.key === c.key);
    const w = def?.weight ?? 0;
    if (c.pct == null) {
      if (emptyMode === 'zero') {
        usable.push({ cat: c, weight: w, pct: 0 });
        weightTotal += w;
      } else if (scored.length > 0) {
        renormalized = true;
      }
      continue;
    }
    usable.push({ cat: c, weight: w, pct: c.pct });
    weightTotal += w;
  }

  if (usable.length && weightTotal > 0) {
    let sum = 0;
    for (const u of usable) {
      const wu = u.weight / weightTotal;
      u.cat.weight_used = storePrecision(wu);
      sum += u.pct * wu;
    }
    periodPct = storePrecision(sum);
  }

  // Method C: add bonus categories on top of 100%
  let methodCAdd = 0;
  if (methodC && periodPct != null) {
    for (const c of categoryResults) {
      if (!isMethodCOnlyEc(working, c.key) || c.pct == null) continue;
      const def = catDefs.find((d) => d.key === c.key);
      const w = (def?.weight ?? 0) / 100;
      const add = c.pct * w;
      methodCAdd += add;
      c.weight_used = w;
    }
    periodPct = storePrecision(periodPct + methodCAdd);
  }

  const ecItems = working.filter((w) => w.role === 'ec');
  // Method B: add EC as percent points on 100-pt reference (fixture 7.4)
  const ecPct =
    syllabus.extra_credit.method === 'B' ? ecItems.reduce((s, i) => s + i.earned, 0) : 0;

  // If method C already added, don't double-count via B path
  const fin = applyEcFloorCeiling(
    syllabus,
    periodPct,
    syllabus.extra_credit.method === 'B' ? ecPct : 0,
  );
  if (methodCAdd && fin.pct != null && syllabus.extra_credit.method === 'C') {
    fin.ec_added = storePrecision(fin.ec_added + methodCAdd);
  }

  return {
    period_id,
    pct: fin.pct,
    categories: categoryResults,
    renormalized,
    ec_added: fin.ec_added,
    floor_applied: fin.floor_applied,
    blocked_by_incomplete: blocked,
    min_grades_blocked,
  };
}
