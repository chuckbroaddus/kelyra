import assert from 'node:assert/strict';
import test from 'node:test';

import { agendaRangeFrom, dayRangeContaining, shiftDay } from './day.ts';

test('dayRangeContaining returns single day', () => {
  const r = dayRangeContaining('2026-09-15');
  assert.equal(r.fromIso, '2026-09-15');
  assert.equal(r.toIso, '2026-09-15');
  assert.equal(r.day, '2026-09-15');
});

test('shiftDay moves by N days', () => {
  assert.equal(shiftDay('2026-09-15', 1), '2026-09-16');
  assert.equal(shiftDay('2026-09-15', -2), '2026-09-13');
});

test('agendaRangeFrom spans inclusive window', () => {
  const r = agendaRangeFrom('2026-09-12', 3);
  assert.deepEqual(r.days, ['2026-09-12', '2026-09-13', '2026-09-14']);
  assert.equal(r.toIso, '2026-09-14');
});
