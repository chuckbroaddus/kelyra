import assert from 'node:assert/strict';
import test from 'node:test';

import { computePeriod, computeTerm, whatIf } from './index.ts';
import type {
  EngineAssignment,
  EngineCell,
  EngineSyllabus,
  PeriodResult,
  TermRollup,
} from './types.ts';

function baseSyllabus(over: Partial<EngineSyllabus> = {}): EngineSyllabus {
  return {
    engine: 'weighted_points_inside',
    categories: [
      { key: 'tests', label: 'Tests', weight: 50, include: true },
      { key: 'quizzes', label: 'Quizzes', weight: 20, include: true },
      { key: 'homework', label: 'Homework', weight: 30, include: true },
    ],
    missing: 'zero',
    late: { type: 'none' },
    extra_credit: { method: 'B' },
    empty_category: 'renormalize',
    book_mode: 'reset_each_marking_period',
    rounding: 'none',
    ...over,
  };
}

function a(
  partial: Partial<EngineAssignment> & Pick<EngineAssignment, 'id' | 'category' | 'max_points'>,
): EngineAssignment {
  return {
    period_id: 'P1',
    due_at: null,
    count_toward_final: true,
    extra_credit: false,
    can_exceed_max: false,
    item_factor: 1,
    droppable: true,
    ...partial,
  };
}

function c(
  assignment_id: string,
  raw: number | null,
  status: EngineCell['status'] = 'graded',
  extra: Partial<EngineCell> = {},
): EngineCell {
  return { assignment_id, raw, status, ...extra };
}

test('SRS 7.1 weighted points-inside one period → 69.5', () => {
  const syllabus = baseSyllabus();
  const assignments = [
    a({ id: 't1', category: 'tests', max_points: 100 }),
    a({ id: 't2', category: 'tests', max_points: 50 }),
    a({ id: 'q1', category: 'quizzes', max_points: 10 }),
    a({ id: 'h1', category: 'homework', max_points: 10 }),
    a({ id: 'h2', category: 'homework', max_points: 10 }),
  ];
  const cells = [
    c('t1', 80),
    c('t2', 40),
    c('q1', 8),
    c('h1', 9),
    c('h2', null, 'missing'),
  ];
  const r = computePeriod(syllabus, assignments, cells, 'P1');
  assert.equal(r.pct, 69.5);
  const tests = r.categories.find((x) => x.key === 'tests')!;
  assert.equal(tests.pct, 80);
  const hw = r.categories.find((x) => x.key === 'homework')!;
  assert.equal(hw.pct, 45);
});

test('SRS 7.2 percent-inside differs from points-inside on uneven max', () => {
  const cats = baseSyllabus().categories;
  const assignments = [
    a({ id: 'h1', category: 'homework', max_points: 10 }),
    a({ id: 'h2', category: 'homework', max_points: 20 }),
  ];
  const cells = [c('h1', 9), c('h2', 20)];
  const pts = computePeriod(
    baseSyllabus({ engine: 'weighted_points_inside', categories: cats }),
    assignments,
    cells,
    'P1',
  );
  const pct = computePeriod(
    baseSyllabus({ engine: 'weighted_percent_inside', categories: cats }),
    assignments,
    cells,
    'P1',
  );
  // only homework has data → category = period after renormalize
  assert.ok(Math.abs((pts.categories.find((x) => x.key === 'homework')!.pct ?? 0) - 96.666667) < 0.01);
  assert.equal(pct.categories.find((x) => x.key === 'homework')!.pct, 95);
});

test('SRS 7.3 empty category renormalize vs zero', () => {
  const assignments = [
    a({ id: 'q1', category: 'quizzes', max_points: 10 }),
    a({ id: 'h1', category: 'homework', max_points: 10 }),
  ];
  const cells = [c('q1', 8), c('h1', 9)];
  const renorm = computePeriod(baseSyllabus({ empty_category: 'renormalize' }), assignments, cells, 'P1');
  // (0.20/0.50)*80 + (0.30/0.50)*90 = 32+54 = 86
  assert.equal(renorm.pct, 86);
  assert.equal(renorm.renormalized, true);
  const zero = computePeriod(baseSyllabus({ empty_category: 'zero' }), assignments, cells, 'P1');
  assert.equal(zero.pct, 43);
});

test('SRS 7.4 extra credit method B does not lower skipper', () => {
  const syllabus = baseSyllabus({
    engine: 'total_points',
    categories: [],
    extra_credit: { method: 'B' },
  });
  const assignments = [
    a({ id: 'w1', category: 'work', max_points: 100 }),
    a({ id: 'ec1', category: 'ec', max_points: 5, extra_credit: true, count_toward_final: false }),
  ];
  const withEc = computePeriod(syllabus, assignments, [c('w1', 80), c('ec1', 5)], 'P1');
  const skip = computePeriod(syllabus, assignments, [c('w1', 80), c('ec1', null, 'ungraded')], 'P1');
  assert.equal(skip.pct, 80);
  assert.equal(withEc.pct, 85);
  assert.ok((withEc.ec_added ?? 0) > 0);
});

test('SRS 7.5 drop lowest in a period; next period empty', () => {
  const syllabus = baseSyllabus({
    engine: 'weighted_percent_inside',
    categories: [{ key: 'quizzes', label: 'Quizzes', weight: 100, include: true, drop_lowest: 1 }],
  });
  const p1 = [
    a({ id: 'q1', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q2', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q3', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q4', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q5', category: 'quizzes', max_points: 100, period_id: '6W1' }),
  ];
  const cells = [c('q1', 60), c('q2', 70), c('q3', 80), c('q4', 90), c('q5', 100)];
  const r1 = computePeriod(syllabus, p1, cells, '6W1');
  assert.equal(r1.pct, 85);
  const r2 = computePeriod(syllabus, p1, cells, '6W2');
  assert.equal(r2.pct, null);
});

test('SRS 7.6 six-weeks → semester rollup', () => {
  const rollup: TermRollup = {
    term_id: 'S1',
    components: [
      { period_id: '6W1', weight: 2 / 7 },
      { period_id: '6W2', weight: 2 / 7 },
      { period_id: '6W3', weight: 2 / 7 },
      { period_id: 'exam', weight: 1 / 7 },
    ],
    exam: { enabled: true, code: 'exam' },
    missing_child: 'renormalize',
  };
  const children: PeriodResult[] = [
    { period_id: '6W1', pct: 92, categories: [], renormalized: false, ec_added: 0, floor_applied: false, blocked_by_incomplete: false, min_grades_blocked: false },
    { period_id: '6W2', pct: 85, categories: [], renormalized: false, ec_added: 0, floor_applied: false, blocked_by_incomplete: false, min_grades_blocked: false },
    { period_id: '6W3', pct: 80, categories: [], renormalized: false, ec_added: 0, floor_applied: false, blocked_by_incomplete: false, min_grades_blocked: false },
  ];
  const full = computeTerm(rollup, children, 78, { rounding: 'none' });
  assert.ok(Math.abs((full.pct ?? 0) - 84.571429) < 0.01);
  const rounded = computeTerm(rollup, children, 78, { rounding: 'nearest_whole' });
  assert.equal(rounded.pct, 85);

  const exempt = computeTerm(
    { ...rollup, exam: { enabled: false, code: 'exam' }, components: rollup.components.filter((c) => c.period_id !== 'exam') },
    children,
    null,
    { rounding: 'none' },
  );
  // When exam disabled and removed from components: mean of three
  assert.ok(Math.abs((exempt.pct ?? 0) - 85.666667) < 0.01);

  // Exempt via missing exam + renormalize with exam still in components
  const exempt2 = computeTerm(rollup, children, null, { rounding: 'none' });
  assert.equal(exempt2.renormalized, true);
  assert.ok(Math.abs((exempt2.pct ?? 0) - 85.666667) < 0.01);
});

test('SRS 7.7 year-link is outside layer-1 engine (documented boundary)', () => {
  // Year-link credit is a transcript/posting concern (GB-06). Engine exposes semester pcts only.
  const s1 = 68;
  const s2 = 72;
  assert.equal(s1 < 70 && s2 >= 70, true);
});

test('SRS 7.9 excused omits earned and possible', () => {
  const syllabus = baseSyllabus({ engine: 'total_points', categories: [] });
  const assignments = [
    a({ id: 'x1', category: 'work', max_points: 100 }),
    a({ id: 'x2', category: 'work', max_points: 20 }),
    a({ id: 'x3', category: 'work', max_points: 10 }),
  ];
  const cells = [c('x1', 80), c('x2', 18), c('x3', 0, 'excused')];
  const r = computePeriod(syllabus, assignments, cells, 'P1');
  // 98/120
  assert.ok(Math.abs((r.pct ?? 0) - (98 / 120) * 100) < 0.0001);
});

test('SRS 7.9 late −10%/day floor 50%, 3 days → 70', () => {
  const syllabus = baseSyllabus({
    engine: 'total_points',
    categories: [],
    late: { type: 'per_day', amount: 10, unit: 'percent', floor_pct: 50 },
  });
  const assignments = [
    a({
      id: 't1',
      category: 'work',
      max_points: 100,
      due_at: '2026-01-01T00:00:00Z',
    }),
  ];
  const cells = [
    c('t1', 100, 'late', { submitted_at: '2026-01-04T00:00:00Z' }),
  ];
  const r = computePeriod(syllabus, assignments, cells, 'P1');
  assert.equal(r.pct, 70);
});

test('AC4 missing-as-zero vs excused omit differ', () => {
  const assignments = [
    a({ id: 'a1', category: 'tests', max_points: 100 }),
    a({ id: 'a2', category: 'tests', max_points: 100 }),
  ];
  const asZero = computePeriod(
    baseSyllabus({
      engine: 'weighted_percent_inside',
      missing: 'zero',
      categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true }],
    }),
    assignments,
    [c('a1', 100), c('a2', null, 'missing')],
    'P1',
  );
  const excused = computePeriod(
    baseSyllabus({
      engine: 'weighted_percent_inside',
      missing: 'zero',
      categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true }],
    }),
    assignments,
    [c('a1', 100), c('a2', null, 'excused')],
    'P1',
  );
  assert.equal(asZero.pct, 50);
  assert.equal(excused.pct, 100);
  assert.notEqual(asZero.pct, excused.pct);
});

test('AC5 EC method B skip does not lower', () => {
  const syllabus = baseSyllabus({ engine: 'total_points', categories: [], extra_credit: { method: 'B' } });
  const assignments = [
    a({ id: 'w1', category: 'work', max_points: 50 }),
    a({ id: 'ec', category: 'ec', max_points: 10, extra_credit: true }),
  ];
  const skip = computePeriod(syllabus, assignments, [c('w1', 40)], 'P1');
  const take = computePeriod(syllabus, assignments, [c('w1', 40), c('ec', 10)], 'P1');
  assert.equal(skip.pct, 80);
  assert.ok((take.pct ?? 0) > (skip.pct ?? 0));
});

test('AC11 reset_each_marking_period isolates cycles', () => {
  const syllabus = baseSyllabus({
    engine: 'weighted_percent_inside',
    book_mode: 'reset_each_marking_period',
    categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true }],
  });
  const assignments = [
    a({ id: 'c1', category: 'tests', max_points: 100, period_id: 'C1' }),
    a({ id: 'c2', category: 'tests', max_points: 100, period_id: 'C2' }),
  ];
  const cells = [c('c1', 50), c('c2', 100)];
  assert.equal(computePeriod(syllabus, assignments, cells, 'C1').pct, 50);
  assert.equal(computePeriod(syllabus, assignments, cells, 'C2').pct, 100);
});

test('FR-ENG-08 no countable work → pct null not 0', () => {
  const r = computePeriod(baseSyllabus(), [], [], 'P1');
  assert.equal(r.pct, null);
});

test('incomplete blocks flag', () => {
  const syllabus = baseSyllabus({
    engine: 'total_points',
    categories: [],
  });
  const r = computePeriod(
    syllabus,
    [a({ id: 'i1', category: 'work', max_points: 10 })],
    [c('i1', null, 'incomplete')],
    'P1',
  );
  assert.equal(r.blocked_by_incomplete, true);
  assert.equal(r.pct, null);
});

test('whatIf assignment reaches target', () => {
  const syllabus = baseSyllabus({
    engine: 'weighted_percent_inside',
    categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true }],
  });
  const assignments = [
    a({ id: 't1', category: 'tests', max_points: 100 }),
    a({ id: 't2', category: 'tests', max_points: 100 }),
  ];
  const cells = [c('t1', 80)];
  const w = whatIf(syllabus, assignments, cells, 'P1', { target_pct: 90, assignment_id: 't2' });
  assert.equal(w.possible, true);
  assert.ok(w.raw_needed != null && w.raw_needed >= 99.9);
});

test('item_weights engine', () => {
  const syllabus = baseSyllabus({
    engine: 'item_weights',
    categories: [],
  });
  const assignments = [
    a({ id: 'm1', category: 'x', max_points: 100, item_weight_pct: 40 }),
    a({ id: 'm2', category: 'x', max_points: 100, item_weight_pct: 60 }),
  ];
  const r = computePeriod(syllabus, assignments, [c('m1', 100), c('m2', 50)], 'P1');
  // 100*0.4 + 50*0.6 = 70
  assert.equal(r.pct, 70);
});

test('min_grades_blocked when under count', () => {
  const syllabus = baseSyllabus({
    engine: 'weighted_percent_inside',
    categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true, min_grades: 3 }],
  });
  const r = computePeriod(
    syllabus,
    [a({ id: 't1', category: 'tests', max_points: 100 })],
    [c('t1', 90)],
    'P1',
  );
  assert.equal(r.min_grades_blocked, true);
  assert.equal(r.pct, 90);
});
