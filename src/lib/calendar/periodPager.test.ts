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
import { WHEEL_SLOT_OFFSETS } from './periodWheel.ts';
import { shiftDay } from './day.ts';
import { shiftMonth } from './month.ts';
import { shiftMultiday } from './multiday.ts';
import { shiftWeek } from './week.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('showsPeriodPager: all surfaces including day list (CAL-P6-5C)', () => {
  assert.equal(showsPeriodPager('year', 'single'), true);
  assert.equal(showsPeriodPager('month', 'single'), true);
  assert.equal(showsPeriodPager('week', 'single'), true);
  assert.equal(showsPeriodPager('multiday', 'single'), true);
  assert.equal(showsPeriodPager('day', 'single'), true);
  assert.equal(showsPeriodPager('agenda', 'single'), true);
  assert.equal(showsPeriodPager('day', 'list'), true);
});

test('periodKindForView maps CalendarViewId', () => {
  assert.equal(periodKindForView('year'), 'year');
  assert.equal(periodKindForView('month'), 'month');
  assert.equal(periodKindForView('week'), 'week');
  assert.equal(periodKindForView('multiday'), 'multiday');
  assert.equal(periodKindForView('day'), 'day');
  assert.equal(periodKindForView('agenda'), 'agenda');
});

test('buildPeriodWindow: 7-slot rest (center ±3); year sides YY; center full year', () => {
  const w = buildPeriodWindow({ kind: 'year', anchor: '2026' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.slots.length, 7);
  assert.equal(w.slots[0]!.year, 2023);
  assert.equal(w.prev2.year, 2024);
  assert.equal(w.prev.year, 2025);
  assert.equal(w.current.year, 2026);
  assert.equal(w.next.year, 2027);
  assert.equal(w.next2.year, 2028);
  assert.equal(w.slots[6]!.year, 2029);
  assert.equal(w.current.centerCaption, '2026');
  assert.equal(w.current.sideCaption, "'26");
  assert.equal(w.prev.sideCaption, "'25");
  assert.equal(w.next.sideCaption, "'27");
  assert.equal(w.prev2.sideCaption, "'24");
  assert.equal(w.next2.sideCaption, "'28");
  assert.equal(w.slots[3], w.current);
  // Every WHEEL_SLOT_OFFSETS entry has a defined tile.key (no holes)
  WHEEL_SLOT_OFFSETS.forEach((offset, idx) => {
    const tile = w.slots[idx];
    assert.ok(tile, `missing slot at offset ${offset}`);
    assert.equal(typeof tile.key, 'string');
    assert.ok(tile.key.length > 0);
  });
});

test('buildPeriodWindow month: existing shiftMonth; hanging grid fields on all 7', () => {
  const w = buildPeriodWindow({ kind: 'month', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.monthYear, 2026);
  assert.equal(w.current.monthIndex0, 8);
  assert.match(w.current.centerCaption, /September.*2026|2026/);
  assert.equal(w.prev.monthIndex0, 7);
  assert.equal(w.next.monthIndex0, 9);
  assert.equal(w.prev2.monthIndex0, 6);
  assert.equal(w.next2.monthIndex0, 10);
  assert.equal(w.slots[0]!.monthIndex0, 5); // -3 → June
  assert.equal(w.slots[6]!.monthIndex0, 11); // +3 → December
  // sidecars carry real neighbor month fields (no empty stub)
  for (const t of w.slots) {
    assert.equal(typeof t.monthYear, 'number');
    assert.equal(typeof t.monthIndex0, 'number');
    assert.equal(typeof t.key, 'string');
  }
});

test('buildPeriodWindow week: existing shiftWeek recycle neighbors ±3', () => {
  const w = buildPeriodWindow({ kind: 'week', anchor: '2026-09-16' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.fromIso, '2026-09-13');
  assert.equal(w.prev.fromIso, shiftWeek('2026-09-13', -1));
  assert.equal(w.next.fromIso, shiftWeek('2026-09-13', 1));
  assert.equal(w.prev2.fromIso, shiftWeek('2026-09-13', -2));
  assert.equal(w.next2.fromIso, shiftWeek('2026-09-13', 2));
  assert.equal(w.slots[0]!.fromIso, shiftWeek('2026-09-13', -3));
  assert.equal(w.slots[6]!.fromIso, shiftWeek('2026-09-13', 3));
});

test('buildPeriodWindow day: existing shiftDay ±3', () => {
  const w = buildPeriodWindow({ kind: 'day', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.dayIso, '2026-09-20');
  assert.equal(w.prev.dayIso, shiftDay('2026-09-20', -1));
  assert.equal(w.next.dayIso, shiftDay('2026-09-20', 1));
  assert.equal(w.prev2.dayIso, shiftDay('2026-09-20', -2));
  assert.equal(w.next2.dayIso, shiftDay('2026-09-20', 2));
  assert.equal(w.slots[0]!.dayIso, shiftDay('2026-09-20', -3));
  assert.equal(w.slots[6]!.dayIso, shiftDay('2026-09-20', 3));
  assert.match(w.current.centerCaption, /September 20, 2026/);
});

test('buildPeriodWindow multiday: existing shiftMultiday ±3', () => {
  const w = buildPeriodWindow({ kind: 'multiday', anchor: '2026-09-16', dayCount: 3 });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.fromIso, '2026-09-15');
  assert.equal(w.prev.anchor, shiftMultiday('2026-09-16', 3, -1));
  assert.equal(w.next.anchor, shiftMultiday('2026-09-16', 3, 1));
  assert.equal(typeof w.slots[0]!.key, 'string');
  assert.equal(typeof w.slots[6]!.key, 'string');
});

test('buildPeriodWindow agenda: ±7 day step across 7 slots', () => {
  const w = buildPeriodWindow({ kind: 'agenda', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.centerCaption, 'Next 2 weeks');
  assert.equal(w.prev.anchor, shiftDay('2026-09-20', -7));
  assert.equal(w.next.anchor, shiftDay('2026-09-20', 7));
  assert.equal(w.prev2.anchor, shiftDay('2026-09-20', -14));
  assert.equal(w.next2.anchor, shiftDay('2026-09-20', 14));
  assert.equal(w.slots[0]!.anchor, shiftDay('2026-09-20', -21));
  assert.equal(w.slots[6]!.anchor, shiftDay('2026-09-20', 21));
});

test('snapPeriodPage: distance + velocity; max fling 3; pitch-based', () => {
  assert.equal(snapPeriodPage(0, 78, 0), 0);
  assert.equal(snapPeriodPage(-30, 100, 0), 1); // 0.30 slots past 0.28
  assert.equal(snapPeriodPage(30, 100, 0), -1);
  assert.equal(snapPeriodPage(-10, 100, 0), 0);
  assert.equal(snapPeriodPage(-5, 100, -700), 1);
  assert.equal(snapPeriodPage(5, 100, 700), -1);
  // multi-slot fling clamped to ±3
  assert.equal(snapPeriodPage(-400, 78, -2000), 3);
  assert.equal(snapPeriodPage(400, 78, 2000), -3);
});

test('rolodex scale/opacity: center larger/brighter than sides', () => {
  assert.ok(rolodexScaleForOffset(0, 100) > rolodexScaleForOffset(100, 100));
  assert.ok(rolodexOpacityForOffset(0, 100) > rolodexOpacityForOffset(100, 100));
});

test('calendar wires PeriodPager; day list included; Set B leaf identity; no PNG atlas', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /PeriodPager/);
  assert.match(screen, /showsPeriodPager\(activeView, dayMode\)/);
  assert.doesNotMatch(screen, /label=["']<<["']/);
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.doesNotMatch(leaf, /\.png|ImageBackground|require\(/);
  assert.match(leaf, /MonthHangingGrid|hangGrid/);
  assert.match(leaf, /MetalTabs|SET_B/);
  assert.match(leaf, /yearPage|WeekDayStrip|dayNumeral/);
  assert.doesNotMatch(leaf, /YearIcon|WeekIcon|DayIcon/);
  const pager = read('src/components/calendar/PeriodPager.tsx');
  // CAL-P6-1A: full-band claim — no on-drum pageX carve.
  assert.doesNotMatch(pager, /pageX\s*<\s*PERIOD_PAGER_EDGE_GUARD_PX/);
  assert.match(pager, /CAL_P6_1A_ON_DRUM_CARVE_PX|CAL-P6-1A/);
  assert.match(pager, /useReducedMotion/);
  assert.match(pager, /label=["']<<["']/);
  assert.match(pager, /snapPeriodPage/);
  assert.match(pager, /rotateY/);
  assert.match(pager, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /WHEEL_PITCH/);
});

test('PeriodPager slot map never reads tile.key on undefined (guards + shared offsets)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  const src = read('src/lib/calendar/periodPager.ts');
  assert.match(src, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /if \(!tile\) return null/);
  assert.doesNotMatch(pager, /window\.slots\[idx\]!/);
  assert.match(pager, /slotIndexForOffset/);
  // Simulated map over offsets never throws when slots align
  const kinds = ['year', 'month', 'week', 'day'] as const;
  for (const kind of kinds) {
    const anchor = kind === 'year' ? '2026' : '2026-09-20';
    const w = buildPeriodWindow({ kind, anchor });
    assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
    assert.doesNotThrow(() => {
      for (const offset of WHEEL_SLOT_OFFSETS) {
        const idx = offset - WHEEL_SLOT_OFFSETS[0];
        const tile = w.slots[idx];
        if (!tile) continue;
        void tile.key;
      }
    });
  }
});

test('existing shifters only — periodPager imports shiftWeek/Month/Day/Multiday', () => {
  const src = read('src/lib/calendar/periodPager.ts');
  assert.match(src, /shiftWeek/);
  assert.match(src, /shiftMonth/);
  assert.match(src, /shiftDay/);
  assert.match(src, /shiftMultiday/);
  assert.doesNotMatch(src, /supabase|execute_sql|from\('/);
});

test('Y/M/W/D leaf identity source contracts (CAL-3DW-16)', () => {
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  // Year: full-red ledger + tabs; no three-bar YearIcon
  assert.match(leaf, /yearPage/);
  assert.match(leaf, /SET_B\.header|#C62828/);
  assert.match(leaf, /MetalTabs/);
  // Month: red header + white grid + Sunday
  assert.match(leaf, /monthHeader/);
  assert.match(leaf, /SET_B\.sunday|#E53935/);
  // Week: 7-day strip (no generic body noun)
  assert.match(leaf, /weekStrip|WeekDayStrip/);
  assert.doesNotMatch(leaf, /wrapBodyText/);
  // Day: large numeral, tabs not rings (no circle glyph / generic body noun)
  assert.match(leaf, /dayNumeral/);
  assert.doesNotMatch(leaf, /dayCircle|borderRadius:\s*14/);
});
