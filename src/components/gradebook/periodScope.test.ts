import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nineWeeks } from '../../lib/grade/calendar/templates.ts';
import {
  filterAssignmentsByPeriod,
  includedPeriodKeys,
  matchesPeriodFilter,
  periodFilterLabel,
} from './periodScope.ts';

const cal = nineWeeks({
  id: 'cal1',
  name: 'Test nine weeks',
  school_id: null,
  year: { start: '2025-08-15', end: '2026-05-30' },
});

const q1 = cal.periods.find((p) => p.code === 'Q1')!;
const q2 = cal.periods.find((p) => p.code === 'Q2')!;

test('no calendar uses legacy term filter', () => {
  assert.equal(matchesPeriodFilter({ term: 'q1' }, 'q1', null), true);
  assert.equal(matchesPeriodFilter({ term: 'q1' }, 'q2', null), false);
  assert.equal(matchesPeriodFilter({ term: 'q1' }, 's1', null), true);
  assert.equal(matchesPeriodFilter({ term: 'q3' }, 's1', null), false);
  assert.equal(matchesPeriodFilter({ term: 'year' }, 'all', null), true);
});

test('marking_period_id wins over term', () => {
  assert.equal(
    matchesPeriodFilter({ marking_period_id: q1.id, term: 'q4' }, 'q1', cal),
    true,
  );
  assert.equal(
    matchesPeriodFilter({ marking_period_id: q1.id, term: 'q1' }, 'q2', cal),
    false,
  );
});

test('s1 includes Q1 and Q2 children', () => {
  const keys = includedPeriodKeys(cal, 's1');
  assert.equal(keys.codes.has('q1'), true);
  assert.equal(keys.codes.has('q2'), true);
  assert.equal(keys.codes.has('s1'), true);
  assert.equal(
    matchesPeriodFilter({ marking_period_id: q2.id }, 's1', cal),
    true,
  );
});

test('due_at via periodForDate when no mp/term', () => {
  const due = q1.start_date!;
  assert.equal(matchesPeriodFilter({ due_at: due }, 'q1', cal), true);
  assert.equal(matchesPeriodFilter({ due_at: due }, 'q3', cal), false);
});

test('filterAssignmentsByPeriod scopes list', () => {
  const rows = [
    { id: 'a', term: 'q1' as const },
    { id: 'b', term: 'q2' as const },
    { id: 'c', marking_period_id: q1.id },
  ];
  const q1Only = filterAssignmentsByPeriod(rows, 'q1', cal);
  assert.deepEqual(
    q1Only.map((r) => r.id).sort(),
    ['a', 'c'],
  );
});

test('periodFilterLabel', () => {
  assert.equal(periodFilterLabel('all', null), 'All');
  assert.equal(periodFilterLabel('q1', null), 'Quarter 1');
  assert.equal(periodFilterLabel('q1', cal), q1.name);
});
