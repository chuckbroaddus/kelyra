/**
 * CEO 2026-09-24 calendar live drill zoom — transform hosts, reverse climb, timing.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ZOOM_DRILL_MS,
  ZOOM_DRILL_SPRING,
  abbreviateDrillLabel,
  isValidZoomRect,
  reverseDrillKind,
  type ZoomDrillKind,
} from './zoomDrill.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('ZOOM_DRILL_MS is ~420ms snappy spring window', () => {
  assert.equal(ZOOM_DRILL_MS, 420);
});

test('ZOOM_DRILL_SPRING is stiff, damped, overshoot-clamped', () => {
  assert.ok(ZOOM_DRILL_SPRING.damping >= 28 && ZOOM_DRILL_SPRING.damping <= 32);
  assert.ok(ZOOM_DRILL_SPRING.stiffness >= 280 && ZOOM_DRILL_SPRING.stiffness <= 320);
  assert.equal(ZOOM_DRILL_SPRING.overshootClamping, true);
});

test('ZoomDrillKind covers year-month / month-week / week-day', () => {
  const kinds: ZoomDrillKind[] = ['year-month', 'month-week', 'week-day'];
  assert.deepEqual(kinds, ['year-month', 'month-week', 'week-day']);
  const drill = read('src/components/calendar/CalendarZoomDrill.tsx');
  for (const kind of kinds) {
    assert.match(drill, new RegExp(kind.replace('-', '\\-')));
  }
  // Live host transform — not blank sibling plates.
  assert.match(drill, /Live calendar drill|computeDrillTransform|transformOrigin/);
  assert.doesNotMatch(drill, /SiblingPlate|estimateSiblings|mapPlate/);
  assert.doesNotMatch(drill, /flying surface|flyerStyle/);
});

test('direction in|out + reverseDrillKind Day→Week→Month→Year', () => {
  assert.equal(reverseDrillKind('day'), 'week-day');
  assert.equal(reverseDrillKind('week'), 'month-week');
  assert.equal(reverseDrillKind('multiday'), 'month-week');
  assert.equal(reverseDrillKind('month'), 'year-month');
  assert.equal(reverseDrillKind('year'), null);
  assert.equal(reverseDrillKind('agenda'), null);

  const mod = read('src/lib/calendar/zoomDrill.ts');
  assert.match(mod, /ZoomDrillDirection/);
  assert.match(mod, /'in'\s*\|\s*'out'|direction: ZoomDrillDirection/);
  assert.match(mod, /host: ZoomSourceRect/);

  const drill = read('src/components/calendar/CalendarZoomDrill.tsx');
  assert.match(drill, /direction\s*===\s*'out'|direction = 'in'/);
  assert.match(drill, /withSpring/);
});

test('isValidZoomRect + abbreviateDrillLabel helpers', () => {
  assert.equal(isValidZoomRect({ x: 0, y: 0, width: 10, height: 10 }), true);
  assert.equal(isValidZoomRect({ x: 0, y: 0, width: 1, height: 10 }), false);
  assert.equal(isValidZoomRect(null), false);
  assert.equal(abbreviateDrillLabel('September'), 'Sep');
  assert.equal(abbreviateDrillLabel('May'), 'May');
});

test('calendar.tsx wires live CalendarZoomDrill + startZoomDrill + reverse zoomUp', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /CalendarZoomDrill/);
  assert.match(screen, /startZoomDrill/);
  assert.match(screen, /bodyHostRef/);
  assert.match(screen, /useReducedMotion/);
  assert.match(screen, /kind:\s*'year-month'/);
  assert.match(screen, /kind:\s*'month-week'/);
  assert.match(screen, /kind:\s*'week-day'/);
  assert.match(screen, /direction:\s*'in'/);
  assert.match(screen, /direction:\s*'out'/);
  assert.match(screen, /lastDrillByKindRef/);
  assert.match(screen, /reverseDrillKind/);
  assert.match(screen, /applyZoomUp/);
  assert.match(screen, /drillProgress/);
  assert.match(screen, /computeDrillTransform|host:/);
  // Month day/week still land on Week (not Day).
  assert.match(screen, /onZoomDay=\{\(iso, source/);
  assert.match(screen, /onZoomWeek=\{\(iso, source/);
  assert.match(screen, /zoomTo\('week'\)/);
  // Live transform: no bodyHostFrozen opacity hide during inbound.
  assert.doesNotMatch(screen, /bodyHostFrozen/);
  // Reverse: switch to parent first (Apple pattern), not blank-plate overlay.
  assert.match(screen, /Apple pattern|switch to parent immediately/);
});

test('YearGrid / MonthGrid / TeacherWeekGrid pass ZoomSourceRect + live drill fades', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  const month = read('src/components/calendar/MonthGrid.tsx');
  const week = read('src/components/calendar/TeacherWeekGrid.tsx');
  assert.match(year, /ZoomSourceRect/);
  assert.match(year, /measureInWindow/);
  assert.match(month, /ZoomSourceRect/);
  assert.match(month, /measureInWindow/);
  assert.match(month, /drillProgress/);
  assert.match(month, /drillFocusWeekIndex/);
  assert.match(month, /DrillWeekRow|siblingBandOpacity/);
  assert.match(week, /ZoomSourceRect/);
  assert.match(week, /measureInWindow/);
  assert.match(week, /onPressDay\?: \(iso: string, source\?: ZoomSourceRect/);
  assert.match(week, /drillProgress/);
  assert.match(week, /drillFocusDayIndex/);
});

test('zoomTransform module exists for unit-tested drill math', () => {
  const mod = read('src/lib/calendar/zoomTransform.ts');
  assert.match(mod, /computeDrillTransform/);
  assert.match(mod, /computeWeekDockTranslateY/);
  assert.match(mod, /computeDayDockTranslateX/);
  assert.match(mod, /siblingBandOpacity/);
});
