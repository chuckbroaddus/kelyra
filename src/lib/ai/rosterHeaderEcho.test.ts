import assert from 'node:assert/strict';
import test from 'node:test';

import { finalizeRosterExtract } from '../../../supabase/functions/_shared/rosterExtract.ts';

const rows = (period: string | null, grade: string | null = null) =>
  ['Ava Brooks', 'Diego Morales', 'Harper Nguyen'].map((name) => ({ name, period, grade }));

test('header "Period 2" echoed onto every row is cleared (eval R01 photo)', () => {
  const out = finalizeRosterExtract({ header_period: 'Period 2', names: rows('2') });
  assert.deepEqual(out.names.map((r) => r.period), [null, null, null]);
});

test('header grade echo cleared; ordinal forms match', () => {
  const out = finalizeRosterExtract({ header_grade: '5th', names: rows(null, '5') });
  assert.deepEqual(out.names.map((r) => r.grade), [null, null, null]);
});

test('a real per-row period column (no header reported, or mixed values) is kept', () => {
  assert.deepEqual(finalizeRosterExtract({ names: rows('4') }).names.map((r) => r.period), ['4', '4', '4']);
  const mixed = finalizeRosterExtract({
    header_period: '2',
    names: [
      { name: 'Ava Brooks', period: '2' },
      { name: 'Diego Morales', period: '3' },
    ],
  });
  assert.deepEqual(mixed.names.map((r) => r.period), ['2', '3']);
});
