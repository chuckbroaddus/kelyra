import assert from 'node:assert/strict';
import test from 'node:test';

import { computeSyllabusAverage, type AverageAssignment, type AverageCell, type SyllabusInput } from './syllabusAverage.ts';

const baseSyllabus = (): SyllabusInput => ({
  status: 'published',
  policies: {
    missing_as_zero: false,
    rounding: 'nearest_whole',
    publish_to_family: true,
  },
  categories: [
    { key: 'homework', label: 'Homework', weight_percent: 10, sort_order: 0 },
    { key: 'quiz', label: 'Quizzes', weight_percent: 20, sort_order: 1 },
    { key: 'test', label: 'Tests', weight_percent: 40, sort_order: 2, rules: {} },
    { key: 'project', label: 'Projects', weight_percent: 30, sort_order: 3 },
  ],
});

function assignment(
  partial: Partial<AverageAssignment> & Pick<AverageAssignment, 'id' | 'title' | 'category'>,
): AverageAssignment {
  return {
    include_in_average: true,
    term: 'q1',
    is_makeup: false,
    ...partial,
  };
}

function cell(
  assignmentId: string,
  approvedScore: number | null,
  extra: Partial<AverageCell> = {},
): AverageCell {
  return {
    assignmentId,
    approvedScore,
    scoreMark: 'numeric',
    approvedAt: approvedScore == null ? null : '2026-09-01T00:00:00Z',
    status: approvedScore == null ? null : 'graded',
    ...extra,
  };
}

test('C-01 simple weights HW10/Q20/T40/P30', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 100), cell('q1', 80), cell('t1', 70), cell('p1', 90)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells, { termFilter: 'q1' });
  // 100*0.1 + 80*0.2 + 70*0.4 + 90*0.3 = 10+16+28+27 = 81
  assert.equal(result.mode, 'weighted');
  assert.equal(result.overallUnrounded, 81);
  assert.equal(result.overall, 81);
});

test('C-02 drop_lowest_n=1 on tests', () => {
  const syllabus = baseSyllabus();
  syllabus.categories[2]!.rules = { drop_lowest_n: 1 };
  const assignments = [
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 't2', title: 'T2', category: 'test' }),
    assignment({ id: 't3', title: 'T3', category: 'test' }),
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [
    cell('t1', 50),
    cell('t2', 80),
    cell('t3', 90),
    cell('h1', 100),
    cell('q1', 100),
    cell('p1', 100),
  ];
  const result = computeSyllabusAverage(syllabus, assignments, cells);
  const tests = result.categories.find((c) => c.key === 'test')!;
  assert.equal(tests.average, 85);
  assert.ok(result.adjustedNotes.some((n) => /dropped/i.test(n)));
});

test('C-03 makeup replace + cap 85', () => {
  const syllabus = baseSyllabus();
  syllabus.categories[2]!.rules = {
    replace_lowest_with_makeup: {
      enabled: true,
      makeup_category_key: 'test',
      cap_percent: 85,
      max_replacements: 1,
    },
  };
  const assignments = [
    assignment({ id: 't1', title: 'Unit 1', category: 'test' }),
    assignment({ id: 't2', title: 'Unit 2', category: 'test' }),
    assignment({ id: 'tm', title: 'Makeup', category: 'test', is_makeup: true }),
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [
    cell('t1', 60),
    cell('t2', 90),
    cell('tm', 100),
    cell('h1', 100),
    cell('q1', 100),
    cell('p1', 100),
  ];
  const result = computeSyllabusAverage(syllabus, assignments, cells);
  const tests = result.categories.find((c) => c.key === 'test')!;
  // lowest 60 replaced by makeup capped 85 → mean(85, 90) = 87.5
  assert.equal(tests.average, 87.5);
  assert.equal(tests.eligibleCount, 2);
  assert.ok(result.adjustedNotes.some((n) => /capped at 85/i.test(n)));
});

test('C-04 Pass/Fail excluded from numeric type avg', () => {
  const assignments = [
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 't2', title: 'PF', category: 'test', score_scheme: 'pass_fail' }),
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [
    cell('t1', 80),
    { assignmentId: 't2', approvedScore: null, scoreMark: 'pass' as const, approvedAt: '2026-09-01', status: 'graded' },
    cell('h1', 100),
    cell('q1', 100),
    cell('p1', 100),
  ];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.equal(result.categories.find((c) => c.key === 'test')!.average, 80);
});

test('C-05 empty category omit + renormalize', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 100), cell('q1', 80), cell('p1', 90)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.equal(result.renormalized, true);
  assert.ok(result.disclosures.some((d) => /left out/i.test(d)));
  // weights among HW10 + Q20 + P30 = 60 → 100/60 scale
  // 100*(10/60) + 80*(20/60) + 90*(30/60) = 16.666... + 26.666... + 45 = 88.333...
  assert.ok(result.overallUnrounded != null);
  assert.ok(Math.abs(result.overallUnrounded! - (100 * 10 + 80 * 20 + 90 * 30) / 60) < 1e-9);
  assert.equal(result.categories.find((c) => c.key === 'test')!.omitted, true);
});

test('C-06 unpublished — no invented weights', () => {
  const result = computeSyllabusAverage(null, [assignment({ id: 'h1', title: 'HW', category: 'homework' })], [
    cell('h1', 90),
  ]);
  assert.equal(result.mode, 'unpublished');
  assert.equal(result.overall, null);
  assert.ok(result.disclosures.some((d) => /not set/i.test(d)));
});

test('C-07 not due yet + missing_as_zero still not zero', () => {
  const syllabus = baseSyllabus();
  syllabus.policies = { ...syllabus.policies, missing_as_zero: true };
  const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'h2', title: 'HW2', category: 'homework', due_at: future }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 100), cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const withFuture = computeSyllabusAverage(syllabus, assignments, cells, { now: new Date() });
  const withoutFuture = computeSyllabusAverage(
    syllabus,
    assignments.filter((a) => a.id !== 'h2'),
    cells,
    { now: new Date() },
  );
  assert.equal(withFuture.overallUnrounded, withoutFuture.overallUnrounded);
  assert.ok(withFuture.notCounted.some((n) => n.assignmentId === 'h2' && /not due/i.test(n.reason)));
});

test('C-08 due missing + missing_as_zero=false omitted', () => {
  const past = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework', due_at: past }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.equal(result.categories.find((c) => c.key === 'homework')!.omitted, true);
});

test('C-09 due missing + missing_as_zero=true counts as 0', () => {
  const syllabus = baseSyllabus();
  syllabus.policies = { ...syllabus.policies, missing_as_zero: true };
  const past = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework', due_at: past }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const result = computeSyllabusAverage(syllabus, assignments, cells);
  assert.equal(result.categories.find((c) => c.key === 'homework')!.average, 0);
});

test('C-10 include_in_average=false excluded', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'Practice', category: 'homework', include_in_average: false }),
    assignment({ id: 'h2', title: 'HW2', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 0), cell('h2', 100), cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.equal(result.categories.find((c) => c.key === 'homework')!.average, 100);
  assert.ok(!result.countedAssignmentIds.includes('h1'));
});

test('C-11 unapproved draft_score never enters', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells: AverageCell[] = [
    { assignmentId: 'h1', approvedScore: 40, approvedAt: null, status: 'completed', scoreMark: 'numeric' },
    cell('q1', 100),
    cell('t1', 100),
    cell('p1', 100),
  ];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.equal(result.categories.find((c) => c.key === 'homework')!.omitted, true);
});

test('C-12 rounding nearest_whole final only', () => {
  const syllabus = baseSyllabus();
  // Force a fractional final: HW 10% of 91, others 100 → 10*0.91 + 90 = 99.1 → 99
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 91), cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const result = computeSyllabusAverage(syllabus, assignments, cells);
  assert.equal(result.overallUnrounded, 99.1);
  assert.equal(result.overall, 99);
  assert.equal(result.categories.find((c) => c.key === 'homework')!.average, 91);
});

test('C-13 min_floor_percent after weighted sum', () => {
  const syllabus = baseSyllabus();
  syllabus.policies = { ...syllabus.policies, min_floor_percent: 50 };
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 0), cell('q1', 0), cell('t1', 0), cell('p1', 0)];
  const result = computeSyllabusAverage(syllabus, assignments, cells);
  assert.equal(result.overallUnrounded, 50);
  assert.equal(result.overall, 50);
});

test('C-14 published ignores assignment weight_percent', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework', weight_percent: 99, weight_band: 'custom' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 100), cell('q1', 80), cell('t1', 70), cell('p1', 90)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.equal(result.overallUnrounded, 81);
});

test('C-15 orphan category excluded', () => {
  const assignments = [
    assignment({ id: 'x1', title: 'Labs', category: 'lab' }),
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('x1', 0), cell('h1', 100), cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.ok(result.notCounted.some((n) => n.assignmentId === 'x1'));
  assert.equal(result.overall, 100);
});

test('C-16 is_makeup false everywhere — replace no-op', () => {
  const syllabus = baseSyllabus();
  syllabus.categories[2]!.rules = {
    replace_lowest_with_makeup: {
      enabled: true,
      makeup_category_key: 'test',
      cap_percent: 85,
      max_replacements: 1,
    },
  };
  const assignments = [
    assignment({ id: 't1', title: 'T1', category: 'test', is_makeup: false }),
    assignment({ id: 't2', title: 'Makeup titled', category: 'test', is_makeup: false }),
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('t1', 50), cell('t2', 100), cell('h1', 100), cell('q1', 100), cell('p1', 100)];
  const result = computeSyllabusAverage(syllabus, assignments, cells);
  assert.equal(result.categories.find((c) => c.key === 'test')!.average, 75);
});

test('C-17 year term filter uses GRADE_TERM_ROLLUP membership only', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'HW Q1', category: 'homework', term: 'q1' }),
    assignment({ id: 'h2', title: 'HW Q3', category: 'homework', term: 'q3' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz', term: 'q1' }),
    assignment({ id: 't1', title: 'T1', category: 'test', term: 'q1' }),
    assignment({ id: 'p1', title: 'P1', category: 'project', term: 'q1' }),
  ];
  const cells = [cell('h1', 100), cell('h2', 0), cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const q1 = computeSyllabusAverage(baseSyllabus(), assignments, cells, { termFilter: 'q1' });
  const year = computeSyllabusAverage(baseSyllabus(), assignments, cells, { termFilter: 'year' });
  assert.equal(q1.categories.find((c) => c.key === 'homework')!.average, 100);
  assert.equal(year.categories.find((c) => c.key === 'homework')!.average, 50);
});

test('C-18 approved_score outside 0–100 omitted', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 150), cell('q1', 100), cell('t1', 100), cell('p1', 100)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells);
  assert.equal(result.categories.find((c) => c.key === 'homework')!.omitted, true);
});
