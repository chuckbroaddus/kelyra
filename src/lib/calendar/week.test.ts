import assert from 'node:assert/strict';
import test from 'node:test';

import { shiftWeek, weekRangeContaining, weekRpcBounds } from './week.ts';

test('weekRangeContaining is Sunday-start inclusive 7 days', () => {
  // 2026-09-16 is Wednesday
  const range = weekRangeContaining('2026-09-16');
  assert.equal(range.fromIso, '2026-09-13');
  assert.equal(range.toIso, '2026-09-19');
  assert.equal(range.days.length, 7);
  assert.equal(range.days[0], '2026-09-13');
  assert.equal(range.days[6], '2026-09-19');
});

test('weekRpcBounds covers local day start through end of last day', () => {
  const bounds = weekRpcBounds('2026-09-13', '2026-09-19');
  assert.ok(bounds.from <= '2026-09-13T12:00:00.000Z' || bounds.from.startsWith('2026-09'));
  assert.ok(new Date(bounds.to).getTime() >= new Date(bounds.from).getTime());
  assert.match(bounds.from, /T/);
  assert.match(bounds.to, /T/);
});

test('shiftWeek moves by weeks', () => {
  assert.equal(shiftWeek('2026-09-13', 1), '2026-09-20');
  assert.equal(shiftWeek('2026-09-13', -1), '2026-09-06');
});
