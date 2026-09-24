import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clampMultidayCount,
  isMultidayCount,
  MULTIDAY_COUNTS,
  multidayRangeContaining,
  multidayTodayAnchor,
  nextCountFromPinch,
  shiftMultiday,
  stepMultidayCount,
} from './multiday.ts';

test('MULTIDAY_COUNTS is only 3/5/7', () => {
  assert.deepEqual([...MULTIDAY_COUNTS], [3, 5, 7]);
  assert.equal(isMultidayCount(3), true);
  assert.equal(isMultidayCount(4), false);
  assert.equal(clampMultidayCount(2), 3);
  assert.equal(clampMultidayCount(6), 5);
  assert.equal(clampMultidayCount(9), 7);
});

test('multidayRangeContaining CAL-R5-04: 3=Tue–Thu, 5=Mon–Fri, 7=Sun week', () => {
  // Any day in the week → same Tue–Thu (CEO 2026-09-24).
  for (const anchor of [
    '2026-09-13', // Sun
    '2026-09-14', // Mon
    '2026-09-16', // Wed
    '2026-09-18', // Fri
    '2026-09-19', // Sat
  ]) {
    const three = multidayRangeContaining(3, anchor);
    assert.equal(three.count, 3);
    assert.deepEqual(three.days, ['2026-09-15', '2026-09-16', '2026-09-17'], anchor);
  }

  // Wed → Mon–Fri of that week
  const five = multidayRangeContaining(5, '2026-09-16');
  assert.equal(five.count, 5);
  assert.deepEqual(five.days, [
    '2026-09-14',
    '2026-09-15',
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
  ]);

  const week = multidayRangeContaining(7, '2026-09-16'); // Wed
  assert.equal(week.days.length, 7);
  assert.equal(week.fromIso, '2026-09-13'); // Sunday
  assert.equal(week.toIso, '2026-09-19');
});

test('nextCountFromPinch steps 7↔5↔3; invalid scale is no-op', () => {
  assert.equal(nextCountFromPinch(7, 0.5), 5);
  assert.equal(nextCountFromPinch(5, 0.5), 3);
  assert.equal(nextCountFromPinch(3, 0.5), 3);
  assert.equal(nextCountFromPinch(3, 1.5), 5);
  assert.equal(nextCountFromPinch(5, 1.5), 7);
  assert.equal(nextCountFromPinch(7, 1.5), 7);
  assert.equal(nextCountFromPinch(5, 1.0), 5);
  assert.equal(nextCountFromPinch(5, 0), 5);
});

test('stepMultidayCount and shiftMultiday', () => {
  assert.equal(stepMultidayCount(3, 1), 5);
  assert.equal(stepMultidayCount(7, 1), 7);
  assert.equal(stepMultidayCount(5, -1), 3);
  // 3/5/7 all step by one calendar week.
  assert.equal(shiftMultiday('2026-09-15', 3, 1), '2026-09-22');
  assert.equal(shiftMultiday('2026-09-14', 5, -1), '2026-09-07');
});

test('multi-day Today: Friday still shows that week\'s Tue–Thu (not center-3)', () => {
  const friday = '2026-09-18';
  const wednesday = '2026-09-16';
  const anchor = multidayTodayAnchor(friday);
  assert.equal(anchor, friday);
  const range = multidayRangeContaining(3, anchor);
  assert.deepEqual(range.days, ['2026-09-15', '2026-09-16', '2026-09-17']);
  assert.ok(range.days.includes(wednesday));
  assert.equal(range.days.includes(friday), false, 'Fri is outside fixed Tue–Thu set');
  // Sunday anchor still lands same mid-week (not Sun-centered).
  assert.deepEqual(multidayRangeContaining(3, '2026-09-13').days, range.days);
  const five = multidayRangeContaining(5, multidayTodayAnchor(wednesday));
  assert.ok(five.days.includes(wednesday));
  assert.deepEqual(five.days, [
    '2026-09-14',
    '2026-09-15',
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
  ]);
});
