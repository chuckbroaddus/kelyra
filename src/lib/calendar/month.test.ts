import assert from 'node:assert/strict';
import { test } from 'node:test';

import { monthContaining, monthGridDays, shiftMonth } from './month.ts';

test('monthContaining returns inclusive month bounds', () => {
  const m = monthContaining('2026-09-14');
  assert.equal(m.year, 2026);
  assert.equal(m.monthIndex0, 8);
  assert.equal(m.fromIso, '2026-09-01');
  assert.equal(m.toIso, '2026-09-30');
  assert.match(m.label, /2026/);
});

test('shiftMonth preserves day when possible', () => {
  assert.equal(shiftMonth('2026-09-14', 1), '2026-10-14');
  assert.equal(shiftMonth('2026-01-31', 1), '2026-02-28');
});

test('monthGridDays includes leading/trailing pads', () => {
  const days = monthGridDays(2026, 8, 0);
  assert.ok(days.length % 7 === 0);
  assert.ok(days.includes('2026-09-01'));
  assert.ok(days.includes('2026-09-30'));
});
