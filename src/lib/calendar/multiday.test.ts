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

test('multidayRangeContaining CAL-R5-04: 3=center, 5=Mon–Fri, 7=Sun week', () => {
  // Wed 2026-09-16 → TUE WED THU
  const three = multidayRangeContaining(3, '2026-09-16');
  assert.equal(three.count, 3);
  assert.deepEqual(three.days, ['2026-09-15', '2026-09-16', '2026-09-17']);

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
  assert.equal(shiftMultiday('2026-09-14', 3, 1), '2026-09-17');
  // 5/7 step by one calendar week (not ±5 days).
  assert.equal(shiftMultiday('2026-09-14', 5, -1), '2026-09-07');
});

test('multi-day Today: Wednesday + count 3 centers on that Wednesday (not week Sunday)', () => {
  const wednesday = '2026-09-16'; // Wed
  const weekSunday = '2026-09-13';
  // Regression: anchoring on Sunday centers Sun (omits Wed).
  const omitToday = multidayRangeContaining(3, weekSunday);
  assert.equal(omitToday.days.includes(wednesday), false);
  // Correct Today jump / cold-start: anchor at today → TUE WED THU.
  const anchor = multidayTodayAnchor(wednesday);
  assert.equal(anchor, wednesday);
  const range = multidayRangeContaining(3, anchor);
  assert.ok(range.days.includes(wednesday));
  assert.deepEqual(range.days, ['2026-09-15', '2026-09-16', '2026-09-17']);
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
