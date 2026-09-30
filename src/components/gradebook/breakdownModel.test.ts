import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { EngineSyllabus, PeriodResult } from '../../lib/grade/engine/types.ts';
import { buildBreakdownVM } from './breakdownModel.ts';
import {
  computeStudentPeriod,
  letterForPct,
  runWhatIf,
  targetPctForLetter,
} from './engineBridge.ts';

const syllabus: EngineSyllabus = {
  engine: 'weighted_percent_inside',
  categories: [
    { key: 'hw', label: 'Homework', weight: 40, include: true },
    { key: 'test', label: 'Tests', weight: 60, include: true },
  ],
  missing: 'omit',
  late: { type: 'none' },
  extra_credit: { method: 'B' },
  empty_category: 'renormalize',
  book_mode: 'reset_each_marking_period',
  rounding: 'nearest_whole',
  decimals: 0,
};

test('buildBreakdownVM maps categories + contribution + drops', () => {
  const result: PeriodResult = {
    period_id: 'q1',
    pct: 88,
    renormalized: false,
    ec_added: 0,
    floor_applied: false,
    blocked_by_incomplete: false,
    min_grades_blocked: false,
    categories: [
      {
        key: 'hw',
        pct: 90,
        weight_used: 0.4,
        eligible_count: 1,
        min_grades_met: true,
        items: [
          {
            assignment_id: 'a1',
            category: 'hw',
            earned: 90,
            possible: 100,
            pct: 90,
            role: 'counted',
          },
          {
            assignment_id: 'a0',
            category: 'hw',
            earned: null,
            possible: null,
            pct: null,
            role: 'dropped',
            note: 'Dropped lowest',
          },
        ],
      },
      {
        key: 'test',
        pct: 86.6667,
        weight_used: 0.6,
        eligible_count: 1,
        min_grades_met: true,
        items: [
          {
            assignment_id: 't1',
            category: 'test',
            earned: 86.6667,
            possible: 100,
            pct: 86.6667,
            role: 'counted',
          },
        ],
      },
    ],
  };

  const vm = buildBreakdownVM(result, syllabus, {
    titleOf: (id) => (id === 'a1' ? 'HW 1' : id === 't1' ? 'Test 1' : id),
  });
  assert.equal(vm.overall_pct, 88);
  assert.equal(vm.categories.length, 2);
  const hw = vm.categories.find((c) => c.key === 'hw')!;
  assert.equal(hw.drops, 1);
  assert.equal(hw.contribution, 36);
  assert.equal(hw.items[0]!.title, 'HW 1');
  assert.match(vm.rounding_step, /Rounded/);
});

test('engineBridge computeStudentPeriod + whatIf', () => {
  const cats = [
    { key: 'hw', label: 'HW', weight_percent: 50 },
    { key: 'test', label: 'Test', weight_percent: 50 },
  ];
  const assignments = [
    { id: 'h1', title: 'HW1', category: 'hw' },
    { id: 't1', title: 'T1', category: 'test' },
  ];
  const cells = [
    { assignmentId: 'h1', approvedScore: 80, scoreMark: 'numeric' as const, status: 'graded', approved: true },
    { assignmentId: 't1', approvedScore: 90, scoreMark: 'numeric' as const, status: 'graded', approved: true },
  ];
  const r = computeStudentPeriod({ categories: cats }, assignments, cells, 'all');
  assert.equal(r.pct, 85);

  const w = runWhatIf({ categories: cats }, assignments, cells, 'all', {
    target_pct: 90,
    assignment_id: 'h1',
  });
  assert.equal(w.possible, true);
  assert.ok(w.raw_needed != null && w.raw_needed > 80);
});

test('letter helpers', () => {
  assert.equal(letterForPct(95), 'A');
  const b = targetPctForLetter('B');
  assert.ok(b != null && b >= 80 && b < 90);
});
