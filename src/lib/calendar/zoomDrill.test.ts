/**
 * CEO 2026-09-24 calendar drill zoom — kinds, duration, screen wiring pins.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ZOOM_DRILL_MS, type ZoomDrillKind } from './zoomDrill.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('ZOOM_DRILL_MS is 340ms', () => {
  assert.equal(ZOOM_DRILL_MS, 340);
});

test('ZoomDrillKind covers year-month / month-week / week-day', () => {
  const kinds: ZoomDrillKind[] = ['year-month', 'month-week', 'week-day'];
  assert.deepEqual(kinds, ['year-month', 'month-week', 'week-day']);
  const drill = read('src/components/calendar/CalendarZoomDrill.tsx');
  for (const kind of kinds) {
    assert.match(drill, new RegExp(kind.replace('-', '\\-')));
  }
});

test('calendar.tsx wires CalendarZoomDrill + startZoomDrill', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /CalendarZoomDrill/);
  assert.match(screen, /startZoomDrill/);
  assert.match(screen, /bodyHostRef/);
  assert.match(screen, /useReducedMotion/);
  assert.match(screen, /kind:\s*'year-month'/);
  assert.match(screen, /kind:\s*'month-week'/);
  assert.match(screen, /kind:\s*'week-day'/);
  // Month day/week still land on Week (not Day).
  assert.match(screen, /onZoomDay=\{\(iso, source\)/);
  assert.match(screen, /onZoomWeek=\{\(iso, source\)/);
  assert.match(screen, /zoomTo\('week'\)/);
});

test('YearGrid / MonthGrid / TeacherWeekGrid pass ZoomSourceRect', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  const month = read('src/components/calendar/MonthGrid.tsx');
  const week = read('src/components/calendar/TeacherWeekGrid.tsx');
  assert.match(year, /ZoomSourceRect/);
  assert.match(year, /measureInWindow/);
  assert.match(month, /ZoomSourceRect/);
  assert.match(month, /measureInWindow/);
  assert.match(week, /ZoomSourceRect/);
  assert.match(week, /measureInWindow/);
  assert.match(week, /onPressDay\?: \(iso: string, source\?: ZoomSourceRect\)/);
});
