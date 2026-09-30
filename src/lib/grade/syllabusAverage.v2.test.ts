import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeSyllabusAverage,
  mapSyllabusToEngineV2,
  syllabusHasV2Fields,
  type AverageAssignment,
  type AverageCell,
  type SyllabusInput,
} from './syllabusAverage.ts';
import { buildSyllabusVersionSnapshot, defaultSyllabusV2Fields } from '../syllabus/types.ts';

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

test('GB-05 v1 syllabus without v2 fields keeps C-01 numbers', () => {
  const assignments = [
    assignment({ id: 'h1', title: 'HW1', category: 'homework' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quiz' }),
    assignment({ id: 't1', title: 'T1', category: 'test' }),
    assignment({ id: 'p1', title: 'P1', category: 'project' }),
  ];
  const cells = [cell('h1', 100), cell('q1', 80), cell('t1', 70), cell('p1', 90)];
  const result = computeSyllabusAverage(baseSyllabus(), assignments, cells, { termFilter: 'q1' });
  assert.equal(result.mode, 'weighted');
  assert.equal(result.overallUnrounded, 81);
  assert.equal(result.overall, 81);
  assert.equal(syllabusHasV2Fields(baseSyllabus(), assignments, cells), false);
});

test('GB-05 v2 weighted_points_inside matches SRS 7.1 → 69.5', () => {
  const syllabus: SyllabusInput = {
    status: 'published',
    engine: 'weighted_points_inside',
    missing_rule: 'zero',
    policies: { rounding: 'none', missing_as_zero: true },
    categories: [
      { key: 'tests', label: 'Tests', weight_percent: 50 },
      { key: 'quizzes', label: 'Quizzes', weight_percent: 20 },
      { key: 'homework', label: 'Homework', weight_percent: 30 },
    ],
  };
  const assignments = [
    assignment({ id: 't1', title: 'T1', category: 'tests', max_points: 100, term: 'q1' }),
    assignment({ id: 't2', title: 'T2', category: 'tests', max_points: 50, term: 'q1' }),
    assignment({ id: 'q1', title: 'Q1', category: 'quizzes', max_points: 10, term: 'q1' }),
    assignment({ id: 'h1', title: 'H1', category: 'homework', max_points: 10, term: 'q1' }),
    assignment({ id: 'h2', title: 'H2', category: 'homework', max_points: 10, term: 'q1' }),
  ];
  const cells = [
    cell('t1', null, { rawPoints: 80, approvedAt: '2026-09-01', status: 'graded' }),
    cell('t2', null, { rawPoints: 40, approvedAt: '2026-09-01', status: 'graded' }),
    cell('q1', null, { rawPoints: 8, approvedAt: '2026-09-01', status: 'graded' }),
    cell('h1', null, { rawPoints: 9, approvedAt: '2026-09-01', status: 'graded' }),
    cell('h2', null, { approvedAt: null, status: null, gradeStatus: 'missing' }),
  ];
  assert.equal(syllabusHasV2Fields(syllabus, assignments, cells), true);
  const result = computeSyllabusAverage(syllabus, assignments, cells, { termFilter: 'q1' });
  assert.equal(result.overallUnrounded, 69.5);
  assert.ok(result.enginePeriod);
  assert.equal(result.enginePeriod?.categories.find((c) => c.key === 'tests')?.pct, 80);
});

test('GB-05 mapSyllabusToEngineV2 defaults weighted_percent_inside + max 100', () => {
  const syllabus: SyllabusInput = {
    status: 'published',
    use_engine_v2: true,
    categories: [{ key: 'quiz', label: 'Quiz', weight_percent: 100 }],
  };
  const assignments = [assignment({ id: 'q1', title: 'Q1', category: 'quiz' })];
  const cells = [cell('q1', 90)];
  const mapped = mapSyllabusToEngineV2(syllabus, assignments, cells, { termFilter: 'q1' });
  assert.equal(mapped.engineSyllabus.engine, 'weighted_percent_inside');
  assert.equal(mapped.engineAssignments[0]?.max_points, 100);
  assert.equal(mapped.engineCells[0]?.raw, 90);
});

test('GB-05 buildSyllabusVersionSnapshot pure publish snapshot', () => {
  const d = defaultSyllabusV2Fields();
  const snap = buildSyllabusVersionSnapshot({
    version: 3,
    title: 'Algebra',
    policies: { missing_as_zero: true, rounding: 'nearest_whole' },
    v2: { ...d, engine: 'total_points', floor: 50 },
    categories: [
      { key: 'test', label: 'Tests', weight_percent: 100, rules: { drop_lowest_n: 1 } },
    ],
  });
  assert.equal(snap.version, 3);
  assert.equal(snap.engine, 'total_points');
  assert.equal(snap.floor, 50);
  assert.equal(snap.categories[0]?.weight_percent, 100);
  assert.equal(snap.categories[0]?.rules.drop_lowest_n, 1);
  assert.equal(snap.book_mode, 'reset_each_marking_period');
});
