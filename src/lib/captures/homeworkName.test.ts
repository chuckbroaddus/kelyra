import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanHomeworkNameList,
  cleanHomeworkStudentName as sharedClean,
  percentFromItemCredits,
  solveSimpleArithmetic,
  settleHomeworkItems,
  verifyArithmeticItems,
} from '../../../supabase/functions/_shared/homeworkGrading.ts';
import { cleanHomeworkStudentName, otherHomeworkStudents } from './homeworkName.ts';

const CASES: Array<[unknown, string | null]> = [
  ['Name: [redacted]', null],
  ['[redacted]', null],
  ['Name:', null],
  ['name', null],
  ['First Last', null],
  ['Unknown', null],
  ['____', null],
  ['N/A', null],
  ['  ', null],
  [null, null],
  [42, null],
  ['Name: Sam Patel', 'Sam Patel'],
  ['Student Name - Riley Brooks', 'Riley Brooks'],
  ['Taylor K.', 'Taylor K.'],
  ['Jamie O.', 'Jamie O.'],
  ['"Casey Nguyen"', 'Casey Nguyen'],
  ['Alexx Riviera', 'Alexx Riviera'],
];

test('HW-NAME-01 placeholder names are filtered; real names survive', () => {
  for (const [raw, want] of CASES) {
    assert.equal(cleanHomeworkStudentName(raw), want, String(raw));
  }
});

test('HW-NAME-02 client mirror stays in lockstep with _shared/homeworkGrading.ts', () => {
  for (const [raw] of CASES) assert.equal(cleanHomeworkStudentName(raw), sharedClean(raw), String(raw));
});

test('HW-NAME-03 two-student frames return both names, deduped, placeholders dropped', () => {
  assert.deepEqual(cleanHomeworkNameList(['Taylor Kim', { name: 'Jordan Chen' }, 'taylor kim', 'Name:']), [
    'Taylor Kim',
    'Jordan Chen',
  ]);
  assert.deepEqual(otherHomeworkStudents('Taylor Kim', ['Taylor Kim', { name: 'Jordan Chen' }, '[redacted]']), [
    'Jordan Chen',
  ]);
});

test('HW-SCORE-01 percent from item credits; null credits are skipped, not failed', () => {
  assert.equal(percentFromItemCredits([{ credit: 1, of: 1 }, { credit: 1, of: 1 }, { credit: 1, of: 1 }, { credit: 0, of: 1 }]), 75);
  assert.equal(percentFromItemCredits([{ credit: 1, of: 1 }, { credit: null, of: 1 }, { credit: 0, of: 1 }]), 50);
  assert.equal(percentFromItemCredits([{ credit: 2, of: 2 }, { credit: 1, of: 2 }]), 75);
  assert.equal(percentFromItemCredits([{ credit: 0.5, of: 1 }, { credit: 1, of: 1 }]), 75);
  assert.equal(percentFromItemCredits([{ credit: null, of: 1 }]), null);
  assert.equal(percentFromItemCredits([]), null);
  assert.equal(percentFromItemCredits([{ credit: 5, of: 1 }]), 100);
});

test('HW-SCORE-02 bare arithmetic is re-checked in code; copied-wrong expected cannot rubber-stamp', () => {
  assert.deepEqual(solveSimpleArithmetic('6 × 7 ='), { n: 42, d: 1 });
  assert.deepEqual(solveSimpleArithmetic('2. 2/3 − 1/6 = ?'), { n: 1, d: 2 });
  assert.deepEqual(solveSimpleArithmetic('4/5 ÷ 2/5'), { n: 2, d: 1 });
  assert.equal(solveSimpleArithmetic('x + 5 = 12'), null);
  assert.equal(solveSimpleArithmetic('define cell'), null);
  const out = verifyArithmeticItems([
    { question: '8 × 7 =', expected: '54', seen: '54', credit: 1, of: 1 },
    { question: '2/3 − 1/6 =', expected: '3/4', seen: '1/2', credit: 0, of: 1 },
    { question: 'define cell', expected: 'cell', seen: 'basic unit of life', credit: 1, of: 1 },
    { question: '1/2 + 1/4', expected: null, seen: null, credit: null, of: 1 },
  ]);
  assert.deepEqual(out.map((it) => [it.expected, it.credit]), [
    ['56', 0],
    ['1/2', 1],
    ['cell', 1],
    // blank seen on a code-solvable item → credit 0 (not invent / not leave as null-unscored)
    ['3/4', 0],
  ]);
  assert.equal(percentFromItemCredits(out), 50);
});

test('HW-SCORE-03 settle: exact match earns full credit; all-unread answers give a null score, not 0', () => {
  const full = settleHomeworkItems([
    { question: 'x + 5 = 12', expected: 'x = 7', seen: '7', credit: 1, of: 2 },
    { question: 'define cell', expected: 'basic unit of life', seen: 'Basic unit of life.', credit: 1, of: 2 },
    { question: '2x = 18', expected: '9', seen: '8', credit: 0, of: 2 },
  ]);
  // x+5=12 and 2x=18 are code-solved; of stays 2
  assert.deepEqual(
    full.map((it) => it.credit),
    [2, 2, 0],
  );
  const unread = settleHomeworkItems([
    { question: 'Slope of y = 2x + 1', expected: '2', seen: '', credit: 0, of: 1 },
    { question: 'y-intercept', expected: '1', seen: null, credit: 0, of: 1 },
  ]);
  assert.equal(percentFromItemCredits(unread), null);
});

test('HW-SCORE-04 linear / percent / blank / unit code-grade stops rubber-stamps (R3 failure classes)', () => {
  const h01 = settleHomeworkItems([
    { question: '3x + 7 = 22', expected: 'x = 5', seen: 'x = 5', credit: 1, of: 1 },
    { question: '5(x - 4) = 15', expected: 'x = 7', seen: 'x = 7', credit: 1, of: 1 },
    { question: '-2x + 9 = -3', expected: 'x = 6', seen: 'x = 6', credit: 1, of: 1 },
    { question: '(1/2)x + 6 = 10', expected: 'x = 8', seen: 'x = 8', credit: 1, of: 1 },
    // student wrong; model rubber-stamped expected=seen=x=4
    { question: '4x - 8 = 2x + 6', expected: 'x = 4', seen: 'x = 4', credit: 1, of: 1 },
  ]);
  assert.equal(percentFromItemCredits(h01), 80);
  assert.equal(h01[4]?.expected, 'x = 7');
  assert.equal(h01[4]?.credit, 0);

  const h14 = settleHomeworkItems([
    { question: '10% of 50 =', expected: '5', seen: '5', credit: 1, of: 1 },
    { question: '25% of 80 =', expected: '20', seen: '20', credit: 1, of: 1 },
    { question: '50% of 12 =', expected: '6', seen: '?', credit: 1, of: 1 },
  ]);
  assert.equal(percentFromItemCredits(h14), 67);

  const h34 = settleHomeworkItems([
    { question: '1 ft = __ in', expected: '12', seen: '12', credit: 1, of: 1 },
    { question: '3 ft = __ in', expected: '36', seen: '36', credit: 1, of: 1 },
    { question: '2 yd = __ ft', expected: '6', seen: '6', credit: 1, of: 1 },
    { question: '24 in = __ ft', expected: '2', seen: '3', credit: 1, of: 1 },
  ]);
  assert.equal(percentFromItemCredits(h34), 75);

  const h19 = settleHomeworkItems([
    { question: 'Area of a 5 cm by 3 cm rectangle', expected: '15 cm²', seen: '15 cm²', credit: 1, of: 1 },
    { question: 'Perimeter of a 5 cm by 3 cm rectangle', expected: '16 cm', seen: '16 cm', credit: 1, of: 1 },
    { question: 'Area of a square with side 4 in', expected: '16 in²', seen: '16 in²', credit: 1, of: 1 },
    { question: 'Area of a triangle, base 6 m, height 4 m', expected: '12 m²', seen: '24 m²', credit: 1, of: 1 },
  ]);
  assert.equal(percentFromItemCredits(h19), 75);

  // Model "corrected" seen to the key but stuffed the student equation into question.
  const h24 = settleHomeworkItems([
    {
      question: '3(2b - 1) = 6b - 1',
      expected: '6b - 3',
      seen: '6b - 3',
      credit: 1,
      of: 1,
    },
  ]);
  assert.equal(h24[0]?.expected, '6b-3');
  assert.equal(h24[0]?.credit, 0);

  const low = settleHomeworkItems([
    { question: '8 × 7 =', expected: '56', seen: '56', credit: 1, of: 1, confidence: 'low' },
  ]);
  assert.equal(low[0]?.credit, null);
  assert.equal(percentFromItemCredits(low), null);

  const open = settleHomeworkItems([
    {
      question: 'Theme:',
      expected: 'community helps (or similar)',
      seen: 'community helps',
      credit: 0,
      of: 1,
    },
  ]);
  assert.equal(open[0]?.credit, 1);
});
