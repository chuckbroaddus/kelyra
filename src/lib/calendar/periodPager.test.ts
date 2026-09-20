import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildPeriodWindow,
  periodKindForView,
  rolodexOpacityForOffset,
  rolodexScaleForOffset,
  showsPeriodPager,
  snapPeriodPage,
} from './periodPager.ts';
import { shiftDay } from './day.ts';
import { shiftMonth } from './month.ts';
import { shiftMultiday } from './multiday.ts';
import { shiftWeek } from './week.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('showsPeriodPager: all surfaces except day list', () => {
  assert.equal(showsPeriodPager('year', 'single'), true);
  assert.equal(showsPeriodPager('month', 'single'), true);
  assert.equal(showsPeriodPager('week', 'single'), true);
  assert.equal(showsPeriodPager('multiday', 'single'), true);
  assert.equal(showsPeriodPager('day', 'single'), true);
  assert.equal(showsPeriodPager('agenda', 'single'), true);
  assert.equal(showsPeriodPager('day', 'list'), false);
});

test('periodKindForView maps CalendarViewId', () => {
  assert.equal(periodKindForView('year'), 'year');
  assert.equal(periodKindForView('month'), 'month');
  assert.equal(periodKindForView('week'), 'week');
  assert.equal(periodKindForView('multiday'), 'multiday');
  assert.equal(periodKindForView('day'), 'day');
  assert.equal(periodKindForView('agenda'), 'agenda');
});

test('buildPeriodWindow year: sides YY abbrev; center full year; uses ±1 year', () => {
  const w = buildPeriodWindow({ kind: 'year', anchor: '2026' });
  assert.equal(w.current.year, 2026);
  assert.equal(w.current.centerCaption, '2026');
  assert.equal(w.current.sideCaption, "'26");
  assert.equal(w.prev.year, 2025);
  assert.equal(w.prev.sideCaption, "'25");
  assert.equal(w.next.year, 2027);
  assert.equal(w.next.sideCaption, "'27");
});

test('buildPeriodWindow month: existing shiftMonth; hanging grid fields', () => {
  const w = buildPeriodWindow({ kind: 'month', anchor: '2026-09-20' });
  assert.equal(w.current.monthYear, 2026);
  assert.equal(w.current.monthIndex0, 8);
  assert.match(w.current.centerCaption, /September.*2026|2026/);
  assert.equal(w.prev.monthIndex0, 7);
  assert.equal(w.next.monthIndex0, 9);
});

test('buildPeriodWindow week: existing shiftWeek recycle neighbors', () => {
  const w = buildPeriodWindow({ kind: 'week', anchor: '2026-09-16' });
  assert.equal(w.current.fromIso, '2026-09-13');
  assert.equal(w.prev.fromIso, shiftWeek('2026-09-13', -1));
  assert.equal(w.next.fromIso, shiftWeek('2026-09-13', 1));
});

test('buildPeriodWindow day: existing shiftDay', () => {
  const w = buildPeriodWindow({ kind: 'day', anchor: '2026-09-20' });
  assert.equal(w.current.dayIso, '2026-09-20');
  assert.equal(w.prev.dayIso, shiftDay('2026-09-20', -1));
  assert.equal(w.next.dayIso, shiftDay('2026-09-20', 1));
  assert.match(w.current.centerCaption, /September 20, 2026/);
});

test('buildPeriodWindow multiday: existing shiftMultiday', () => {
  const w = buildPeriodWindow({ kind: 'multiday', anchor: '2026-09-16', dayCount: 3 });
  assert.equal(w.current.fromIso, '2026-09-15');
  assert.equal(w.prev.anchor, shiftMultiday('2026-09-16', 3, -1));
  assert.equal(w.next.anchor, shiftMultiday('2026-09-16', 3, 1));
});

test('buildPeriodWindow agenda: ±7 day step', () => {
  const w = buildPeriodWindow({ kind: 'agenda', anchor: '2026-09-20' });
  assert.equal(w.current.centerCaption, 'Next 2 weeks');
  assert.equal(w.prev.anchor, shiftDay('2026-09-20', -7));
  assert.equal(w.next.anchor, shiftDay('2026-09-20', 7));
});

test('snapPeriodPage: distance + velocity thresholds', () => {
  assert.equal(snapPeriodPage(0, 100, 0), 0);
  assert.equal(snapPeriodPage(-30, 100, 0), 1); // 0.28 * 100 = 28
  assert.equal(snapPeriodPage(30, 100, 0), -1);
  assert.equal(snapPeriodPage(-10, 100, 0), 0);
  assert.equal(snapPeriodPage(-5, 100, -700), 1);
  assert.equal(snapPeriodPage(5, 100, 700), -1);
});

test('rolodex scale/opacity: center larger/brighter than sides', () => {
  assert.ok(rolodexScaleForOffset(0, 100) > rolodexScaleForOffset(100, 100));
  assert.ok(rolodexOpacityForOffset(0, 100) > rolodexOpacityForOffset(100, 100));
});

test('calendar wires PeriodPager; day list excluded; no PNG atlas leaves', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /PeriodPager/);
  assert.match(screen, /showsPeriodPager\(activeView, dayMode\)/);
  assert.doesNotMatch(screen, /label=["']<<["']/);
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.doesNotMatch(leaf, /\.png|ImageBackground|require\(/);
  assert.match(leaf, /MonthHangingGrid|hangGrid/);
  assert.match(leaf, /danger/);
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /PERIOD_PAGER_EDGE_GUARD_PX/);
  assert.match(pager, /useReducedMotion/);
  assert.match(pager, /label=["']<<["']/);
  assert.match(pager, /snapPeriodPage/);
});

test('existing shifters only — periodPager imports shiftWeek/Month/Day/Multiday', () => {
  const src = read('src/lib/calendar/periodPager.ts');
  assert.match(src, /shiftWeek/);
  assert.match(src, /shiftMonth/);
  assert.match(src, /shiftDay/);
  assert.match(src, /shiftMultiday/);
  assert.doesNotMatch(src, /supabase|execute_sql|from\('/);
});
