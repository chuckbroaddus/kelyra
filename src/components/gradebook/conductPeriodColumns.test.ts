import assert from 'node:assert/strict';
import test from 'node:test';

import { conductPeriodColumns } from './conductPeriodColumns.ts';
import type { GradingCalendar } from '../../lib/grade/calendar/types.ts';

function sixWeekCal(): GradingCalendar {
  return {
    id: 'cal1',
    school_id: 'sch1',
    name: 'HS six weeks',
    level: 'high',
    period_model: 'six_weeks',
    glyph_scope: 'semester',
    show_interims_in_filter: false,
    rollups: [],
    periods: [
      {
        id: 'p-s1',
        code: 'S1',
        name: 'Semester 1',
        kind: 'credit_term',
        parent_id: null,
        start_date: '2026-08-15',
        end_date: '2026-12-20',
        sort_order: 10,
      },
      {
        id: 'p-6w1',
        code: '6W1',
        name: '1st Six Weeks',
        kind: 'marking_period',
        parent_id: 'p-s1',
        start_date: '2026-08-15',
        end_date: '2026-09-25',
        sort_order: 11,
      },
      {
        id: 'p-6w2',
        code: '6W2',
        name: '2nd Six Weeks',
        kind: 'marking_period',
        parent_id: 'p-s1',
        start_date: '2026-09-26',
        end_date: '2026-11-06',
        sort_order: 12,
      },
      {
        id: 'p-6w3',
        code: '6W3',
        name: '3rd Six Weeks',
        kind: 'marking_period',
        parent_id: 'p-s1',
        start_date: '2026-11-07',
        end_date: '2026-12-20',
        sort_order: 13,
      },
      {
        id: 'p-s2',
        code: 'S2',
        name: 'Semester 2',
        kind: 'credit_term',
        parent_id: null,
        start_date: '2027-01-05',
        end_date: '2027-05-28',
        sort_order: 20,
      },
      {
        id: 'p-6w4',
        code: '6W4',
        name: '4th Six Weeks',
        kind: 'marking_period',
        parent_id: 'p-s2',
        start_date: '2027-01-05',
        end_date: '2027-02-15',
        sort_order: 21,
      },
      {
        id: 'p-6w5',
        code: '6W5',
        name: '5th Six Weeks',
        kind: 'marking_period',
        parent_id: 'p-s2',
        start_date: '2027-02-16',
        end_date: '2027-04-01',
        sort_order: 22,
      },
      {
        id: 'p-6w6',
        code: '6W6',
        name: '6th Six Weeks',
        kind: 'marking_period',
        parent_id: 'p-s2',
        start_date: '2027-04-02',
        end_date: '2027-05-28',
        sort_order: 23,
      },
    ],
  };
}

test('conductPeriodColumns single period keeps one labeled column', () => {
  const cols = conductPeriodColumns('6w2', sixWeekCal());
  assert.equal(cols.length, 1);
  assert.equal(cols[0]!.key, '6w2');
  assert.match(cols[0]!.label, /2nd/i);
});

test('conductPeriodColumns All lists each marking period, not a combined total', () => {
  const cols = conductPeriodColumns('all', sixWeekCal());
  assert.deepEqual(
    cols.map((c) => c.key),
    ['6w1', '6w2', '6w3', '6w4', '6w5', '6w6'],
  );
  assert.ok(cols.every((c) => /Six Weeks/i.test(c.label)));
  assert.ok(!cols.some((c) => c.key === 'all' || c.key === 's1' || c.key === 's2'));
});

test('conductPeriodColumns All with no calendar uses legacy quarters only', () => {
  const cols = conductPeriodColumns('all', null);
  assert.deepEqual(
    cols.map((c) => c.key),
    ['q1', 'q2', 'q3', 'q4'],
  );
  assert.ok(!cols.some((c) => c.key === 's1' || c.key === 'year'));
});

test('conductPeriodColumns empty all filter string behaves like All', () => {
  const cols = conductPeriodColumns('', sixWeekCal());
  assert.equal(cols.length, 6);
});
