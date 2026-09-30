/**
 * GB-15 engine Should fixtures: exam exemption, retake+cap, floor/ceiling, group override.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computePeriod,
  computeTerm,
  decideExamExemption,
  expandGroupScores,
  isExamExemptionEligible,
  parseRetakeRule,
  pickRetakeScore,
  resolveGroupStudentScore,
} from './index.ts';
import type {
  EngineAssignment,
  EngineCell,
  EngineSyllabus,
  PeriodResult,
  TermRollup,
} from './types.ts';

function baseSyllabus(over: Partial<EngineSyllabus> = {}): EngineSyllabus {
  return {
    engine: 'weighted_percent_inside',
    categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true }],
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

function emptyChild(period_id: string, pct: number): PeriodResult {
  return {
    period_id,
    pct,
    categories: [],
    renormalized: false,
    ec_added: 0,
    floor_applied: false,
    blocked_by_incomplete: false,
    min_grades_blocked: false,
  };
}

// tests appended below

test('SRS 7.6 exam exempt renormalize → 85.67', () => {
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
  const children = [emptyChild('6W1', 92), emptyChild('6W2', 85), emptyChild('6W3', 80)];
  const withExam = computeTerm(rollup, children, 78, { rounding: 'none' });
  assert.ok(Math.abs((withExam.pct ?? 0) - 84.571429) < 0.01);
  assert.equal(withExam.exam_exempt, false);

  const exempt = computeTerm(rollup, children, 78, { rounding: 'none', exam_exempt: true });
  assert.equal(exempt.exam_exempt, true);
  assert.ok(exempt.exam_exempt_note && /exam exempt/i.test(exempt.exam_exempt_note));
  assert.equal(exempt.renormalized, true);
  assert.ok(Math.abs((exempt.pct ?? 0) - 85.666667) < 0.01);
});

test('AC12 exam exemption converts 40/40/20 into 50/50', () => {
  const rollup: TermRollup = {
    term_id: 'S1',
    components: [
      { period_id: 'Q1', weight: 0.4 },
      { period_id: 'Q2', weight: 0.4 },
      { period_id: 'exam', weight: 0.2 },
    ],
    exam: { enabled: true, code: 'exam' },
    missing_child: 'renormalize',
  };
  const children = [emptyChild('Q1', 80), emptyChild('Q2', 90)];
  const full = computeTerm(rollup, children, 70, { rounding: 'none' });
  assert.equal(full.pct, 82);

  const exempt = computeTerm(rollup, children, 70, { exam_exempt: true, rounding: 'none' });
  assert.equal(exempt.pct, 85);
  assert.equal(exempt.exam_exempt, true);
  const q1 = exempt.components_used.find((x) => x.period_id === 'Q1');
  const q2 = exempt.components_used.find((x) => x.period_id === 'Q2');
  const ex = exempt.components_used.find((x) => x.period_id === 'exam');
  assert.ok(q1 && Math.abs(q1.weight_used - 0.5) < 1e-6);
  assert.ok(q2 && Math.abs(q2.weight_used - 0.5) < 1e-6);
  assert.ok(ex && ex.weight_used === 0 && ex.pct === null);
});

test('exam exemption policy eligibility defaults off', () => {
  const off = { enabled: false, min_avg: 90, max_absences: 2, renormalize: true };
  const on = { enabled: true, min_avg: 90, max_absences: 2, renormalize: true };
  assert.equal(isExamExemptionEligible(95, 0, off), false);
  assert.equal(isExamExemptionEligible(95, 0, on), true);
  assert.equal(isExamExemptionEligible(89, 0, on), false);
  assert.equal(isExamExemptionEligible(95, 3, on), false);
  assert.equal(decideExamExemption({ policy: off, exam_exempt: true }).exempt, true);
});

test('retake replace uses last attempt', () => {
  const pick = pickRetakeScore(
    [
      { raw: 50, index: 1 },
      { raw: 80, index: 2 },
    ],
    { eligible_category_ids: [], attempts: 2, method: 'replace', cap: null, window_days: null },
    100,
  );
  assert.equal(pick?.raw, 80);
  assert.equal(pick?.method, 'replace');
  assert.equal(pick?.attempt_index, 2);
});

test('retake higher_of picks max', () => {
  const pick = pickRetakeScore(
    [
      { raw: 90, index: 1 },
      { raw: 70, index: 2 },
    ],
    {
      eligible_category_ids: ['tests'],
      attempts: 3,
      method: 'higher_of',
      cap: null,
      window_days: null,
    },
    100,
    'tests',
  );
  assert.equal(pick?.raw, 90);
  assert.equal(pick?.attempt_index, 1);
});

test('retake average + Texas cap 70', () => {
  const pick = pickRetakeScore(
    [
      { raw: 40, index: 1 },
      { raw: 100, index: 2 },
    ],
    { eligible_category_ids: [], attempts: 2, method: 'average', cap: 70, window_days: null },
    100,
  );
  assert.equal(pick?.raw, 70);
  const over = pickRetakeScore(
    [{ raw: 100, index: 1 }],
    { eligible_category_ids: [], attempts: 2, method: 'replace', cap: 70, window_days: null },
    100,
  );
  assert.equal(over?.raw, 70);
  assert.equal(over?.capped, true);
});

test('engine applies retake attempts into period average', () => {
  const syllabus = baseSyllabus({
    retake: {
      eligible_category_ids: ['tests'],
      attempts: 2,
      method: 'higher_of',
      cap: 70,
      window_days: 10,
    },
  });
  const assignments = [a({ id: 't1', category: 'tests', max_points: 100, retake_eligible: true })];
  const cells = [
    c('t1', 40, 'graded', { attempts: [{ raw: 40 }, { raw: 95 }] }),
  ];
  const r = computePeriod(syllabus, assignments, cells, 'P1');
  assert.equal(r.pct, 70);
  const item = r.categories[0]?.items.find((i) => i.assignment_id === 't1');
  assert.ok(item?.note && /cap/i.test(item.note));
});

test('parseRetakeRule defaults off', () => {
  assert.equal(parseRetakeRule(null), null);
  assert.equal(parseRetakeRule({}), null);
  const on = parseRetakeRule({ enabled: true, method: 'replace', attempts: 2, cap: 70 });
  assert.ok(on);
  assert.equal(on?.cap, 70);
  assert.equal(on?.attempts, 2);
});

test('period floor applied after EC with explain note', () => {
  const syllabus = baseSyllabus({
    engine: 'total_points',
    categories: [],
    period_floor_pct: 50,
    extra_credit: { method: 'B' },
  });
  const r = computePeriod(
    syllabus,
    [a({ id: 'w1', category: 'work', max_points: 100 })],
    [c('w1', 20)],
    'P1',
  );
  assert.equal(r.pct, 50);
  assert.equal(r.floor_applied, true);
  assert.ok(r.floor_ceiling_note && /floor/i.test(r.floor_ceiling_note));
});

test('period ceiling caps above 100 when set', () => {
  const syllabus = baseSyllabus({
    engine: 'total_points',
    categories: [],
    ceiling_pct: 100,
    extra_credit: { method: 'B' },
  });
  const r = computePeriod(
    syllabus,
    [
      a({ id: 'w1', category: 'work', max_points: 100 }),
      a({
        id: 'ec',
        category: 'ec',
        max_points: 10,
        extra_credit: true,
        count_toward_final: false,
      }),
    ],
    [c('w1', 100), c('ec', 10)],
    'P1',
  );
  assert.equal(r.pct, 100);
  assert.equal(r.ceiling_applied, true);
});

test('SRS 7.9 late floor still 70 with period floor off', () => {
  const syllabus = baseSyllabus({
    engine: 'total_points',
    categories: [],
    late: { type: 'per_day', amount: 10, unit: 'percent', floor_pct: 50 },
  });
  const r = computePeriod(
    syllabus,
    [a({ id: 't1', category: 'work', max_points: 100, due_at: '2026-01-01T00:00:00Z' })],
    [c('t1', 100, 'late', { submitted_at: '2026-01-04T00:00:00Z' })],
    'P1',
  );
  assert.equal(r.pct, 70);
  assert.equal(r.floor_applied, false);
});

test('group score applies to all members; individual override wins', () => {
  const group = {
    group_id: 'g1',
    assignment_id: 'a1',
    raw: 88,
    student_ids: ['s1', 's2', 's3'],
  };
  const rows = expandGroupScores(group, { s2: 95 });
  assert.equal(rows.length, 3);
  const s1 = rows.find((r) => r.student_id === 's1')!;
  const s2 = rows.find((r) => r.student_id === 's2')!;
  assert.equal(s1.raw, 88);
  assert.equal(s1.source, 'group');
  assert.equal(s2.raw, 95);
  assert.equal(s2.source, 'group_override');
  assert.equal(s2.override_wins, true);

  const solo = resolveGroupStudentScore({
    assignment_id: 'a1',
    student_id: 's9',
    group: null,
    individual_raw: 77,
    has_individual: true,
  });
  assert.equal(solo.source, 'individual');
  assert.equal(solo.raw, 77);
});

test('group source is provenance only — engine uses resolved raw', () => {
  const syllabus = baseSyllabus({ engine: 'total_points', categories: [] });
  const r = computePeriod(
    syllabus,
    [a({ id: 'a1', category: 'work', max_points: 100 })],
    [c('a1', 88, 'graded', { score_source: 'group', group_id: 'g1' })],
    'P1',
  );
  assert.equal(r.pct, 88);
  const note = r.categories[0]?.items[0]?.note ?? '';
  assert.ok(/group/i.test(note));
});

test('without Should features defaults match single-score path', () => {
  const syllabus = baseSyllabus();
  const r = computePeriod(
    syllabus,
    [a({ id: 't1', category: 'tests', max_points: 100 })],
    [c('t1', 83)],
    'P1',
  );
  assert.equal(r.pct, 83);
  assert.equal(r.floor_applied, false);
});
