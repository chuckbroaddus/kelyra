import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyConductToComputedInputs,
  applyConductToPostingRows,
  marksForPeriod,
  nestConductMarkRows,
  type ClassConductMarkRow,
} from './conductMarks.ts';
import type { ComputedPeriodInput } from './types.ts';

const rows: ClassConductMarkRow[] = [
  {
    class_id: 'c1',
    student_id: 's1',
    period_key: '6W1',
    mark: 'E',
  },
  {
    class_id: 'c1',
    student_id: 's2',
    period_key: '6W1',
    mark: 'S',
  },
  {
    class_id: 'c1',
    student_id: 's1',
    period_key: '6W2',
    mark: 'N',
  },
  {
    class_id: 'c1',
    student_id: 's3',
    period_key: '  ',
    mark: 'U',
  },
  {
    class_id: 'c1',
    student_id: 's4',
    period_key: '6W1',
    mark: '  ',
  },
];

test('nestConductMarkRows groups by period then student and drops blanks', () => {
  const nested = nestConductMarkRows(rows);
  assert.deepEqual(nested, {
    '6W1': { s1: 'E', s2: 'S', s4: null },
    '6W2': { s1: 'N' },
  });
  assert.deepEqual(marksForPeriod(nested, '6W1'), { s1: 'E', s2: 'S', s4: null });
  assert.deepEqual(marksForPeriod(nested, 'missing'), {});
});

test('applyConductToComputedInputs fills conduct from saved marks', () => {
  const computed: ComputedPeriodInput[] = [
    {
      class_id: 'c1',
      student_id: 's1',
      marking_period_code: '6W1',
      pct: 90,
      syllabus_version: 1,
      stored_by: 't1',
    },
    {
      class_id: 'c1',
      student_id: 's2',
      marking_period_code: '6W1',
      pct: 80,
      syllabus_version: 1,
      stored_by: 't1',
      conduct: 'U',
    },
    {
      class_id: 'c1',
      student_id: 's9',
      marking_period_code: '6W1',
      pct: 70,
      syllabus_version: 1,
      stored_by: 't1',
      conduct: 'S',
    },
  ];
  const out = applyConductToComputedInputs(computed, { s1: 'E', s2: null });
  assert.equal(out[0]!.conduct, 'E');
  assert.equal(out[1]!.conduct, null);
  assert.equal(out[2]!.conduct, 'S');
});

test('applyConductToPostingRows merges for postMarkingPeriod payloads', () => {
  const rowsIn = [
    { student_id: 's1', pct: 91, letter: 'A', syllabus_version: 2 },
    { student_id: 's2', pct: 72, letter: 'C', syllabus_version: 2, conduct: 'E' },
  ];
  const out = applyConductToPostingRows(rowsIn, { s1: 'N', s2: '  ' });
  assert.equal(out[0]!.conduct, 'N');
  assert.equal(out[1]!.conduct, null);
});
