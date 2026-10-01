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
    [null, null],
  ]);
  assert.equal(percentFromItemCredits(out), 67);
});

test('HW-SCORE-03 settle: exact match earns full credit; all-unread answers give a null score, not 0', () => {
  const full = settleHomeworkItems([
    { question: 'x + 5 = 12', expected: 'x = 7', seen: '7', credit: 1, of: 2 },
    { question: 'define cell', expected: 'basic unit of life', seen: 'Basic unit of life.', credit: 1, of: 2 },
    { question: '2x = 18', expected: '9', seen: '8', credit: 0, of: 2 },
  ]);
  assert.deepEqual(full.map((it) => it.credit), [2, 2, 0]);
  const unread = settleHomeworkItems([
    { question: 'Slope of y = 2x + 1', expected: '2', seen: '', credit: 0, of: 1 },
    { question: 'y-intercept', expected: '1', seen: null, credit: 0, of: 1 },
  ]);
  assert.equal(percentFromItemCredits(unread), null);
});
