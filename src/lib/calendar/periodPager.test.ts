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
  shiftPeriodAnchor,
} from './periodPager.ts';
import {
  WHEEL_FLING_DECEL,
  WHEEL_MAX_FLING_SLOTS,
  WHEEL_SLOT_OFFSETS,
} from './periodWheel.ts';
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

test('buildPeriodWindow: 9-slot SlotPool (center ±4); year sides YY; center full year', () => {
  const w = buildPeriodWindow({ kind: 'year', anchor: '2026' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.slots.length, 9);
  assert.equal(w.prev4.year, 2022);
  assert.equal(w.prev3.year, 2023);
  assert.equal(w.prev2.year, 2024);
  assert.equal(w.prev.year, 2025);
  assert.equal(w.current.year, 2026);
  assert.equal(w.next.year, 2027);
  assert.equal(w.next2.year, 2028);
  assert.equal(w.next3.year, 2029);
  assert.equal(w.next4.year, 2030);
  assert.equal(w.current.centerCaption, '2026');
  assert.equal(w.current.sideCaption, "'26");
  assert.equal(w.prev.sideCaption, "'25");
  assert.equal(w.next.sideCaption, "'27");
  assert.equal(w.slots[4], w.current);
  WHEEL_SLOT_OFFSETS.forEach((offset, idx) => {
    const tile = w.slots[idx];
    assert.ok(tile, `missing slot at offset ${offset}`);
    assert.equal(typeof tile.key, 'string');
    assert.ok(tile.key.length > 0);
  });
});

test('buildPeriodWindow month: existing shiftMonth; hanging grid fields on all 9', () => {
  const w = buildPeriodWindow({ kind: 'month', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.monthYear, 2026);
  assert.equal(w.current.monthIndex0, 8);
  assert.match(w.current.centerCaption, /September.*2026|2026/);
  assert.equal(w.prev.monthIndex0, 7);
  assert.equal(w.next.monthIndex0, 9);
  assert.equal(w.prev2.monthIndex0, 6);
  assert.equal(w.next2.monthIndex0, 10);
  assert.equal(w.prev3.monthIndex0, 5);
  assert.equal(w.next3.monthIndex0, 11);
  assert.equal(w.prev4.monthIndex0, 4);
  assert.equal(w.next4.monthIndex0, 0); // +4 → Jan 2027
  assert.equal(w.next4.monthYear, 2027);
  for (const t of w.slots) {
    assert.equal(typeof t.monthYear, 'number');
    assert.equal(typeof t.monthIndex0, 'number');
    assert.equal(typeof t.key, 'string');
  }
});

test('buildPeriodWindow week: existing shiftWeek recycle neighbors ±4', () => {
  const w = buildPeriodWindow({ kind: 'week', anchor: '2026-09-16' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.fromIso, '2026-09-13');
  assert.equal(w.prev.fromIso, shiftWeek('2026-09-13', -1));
  assert.equal(w.next.fromIso, shiftWeek('2026-09-13', 1));
  assert.equal(w.prev2.fromIso, shiftWeek('2026-09-13', -2));
  assert.equal(w.next2.fromIso, shiftWeek('2026-09-13', 2));
  assert.equal(w.prev3.fromIso, shiftWeek('2026-09-13', -3));
  assert.equal(w.next3.fromIso, shiftWeek('2026-09-13', 3));
  assert.equal(w.prev4.fromIso, shiftWeek('2026-09-13', -4));
  assert.equal(w.next4.fromIso, shiftWeek('2026-09-13', 4));
});

test('buildPeriodWindow day: existing shiftDay ±4', () => {
  const w = buildPeriodWindow({ kind: 'day', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.dayIso, '2026-09-20');
  assert.equal(w.prev.dayIso, shiftDay('2026-09-20', -1));
  assert.equal(w.next.dayIso, shiftDay('2026-09-20', 1));
  assert.equal(w.prev4.dayIso, shiftDay('2026-09-20', -4));
  assert.equal(w.next4.dayIso, shiftDay('2026-09-20', 4));
  assert.match(w.current.centerCaption, /September 20, 2026/);
});

test('buildPeriodWindow multiday: existing shiftMultiday ±4', () => {
  const w = buildPeriodWindow({ kind: 'multiday', anchor: '2026-09-16', dayCount: 3 });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.fromIso, '2026-09-15');
  assert.equal(w.prev.anchor, shiftMultiday('2026-09-16', 3, -1));
  assert.equal(w.next.anchor, shiftMultiday('2026-09-16', 3, 1));
  assert.equal(typeof w.slots[0]!.key, 'string');
  assert.equal(typeof w.slots[8]!.key, 'string');
});

test('buildPeriodWindow agenda: ±7 day step across 9 slots', () => {
  const w = buildPeriodWindow({ kind: 'agenda', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.centerCaption, 'Next 2 weeks');
  assert.equal(w.prev.anchor, shiftDay('2026-09-20', -7));
  assert.equal(w.next.anchor, shiftDay('2026-09-20', 7));
  assert.equal(w.prev4.anchor, shiftDay('2026-09-20', -28));
  assert.equal(w.next4.anchor, shiftDay('2026-09-20', 28));
});

test('SlotPool N=9: window has real tiles at ±4 (local residual cover)', () => {
  const w = buildPeriodWindow({ kind: 'year', anchor: '2026' });
  assert.equal(w.slots.length, 9);
  assert.ok(w.prev4.key);
  assert.ok(w.next4.key);
  assert.notEqual(w.prev4.key, w.current.key);
  assert.notEqual(w.next4.key, w.current.key);
});

test('snapPeriodPage: distance + velocity; soft max fling ~48; pitch-based', () => {
  assert.equal(snapPeriodPage(0, 78, 0), 0);
  assert.equal(snapPeriodPage(-30, 100, 0), 1);
  assert.equal(snapPeriodPage(30, 100, 0), -1);
  assert.equal(snapPeriodPage(-10, 100, 0), 0);
  assert.equal(snapPeriodPage(-5, 100, -700), 1);
  assert.equal(snapPeriodPage(5, 100, 700), -1);
  assert.equal(WHEEL_MAX_FLING_SLOTS, 48);
  assert.ok(WHEEL_MAX_FLING_SLOTS >= 30);
  assert.equal(WHEEL_FLING_DECEL, 2000);
  // Soft ceiling still clamps absurd springs
  assert.equal(snapPeriodPage(-78 * 200, 78, -50000), WHEEL_MAX_FLING_SLOTS);
  assert.equal(snapPeriodPage(78 * 200, 78, 50000), -WHEEL_MAX_FLING_SLOTS);
});

test('snapPeriodPage inertial coast: hard flick → 20–40+ slots; gentle → few', () => {
  // Physics: coastPx = −vx·|vx|/(2·a); slots = round((−dx + coastPx)/P)
  // Hard flick ~2500–3500 px/s (PanResponder vx≈2.5–3.5 px/ms ×1000), little translation.
  const hard = snapPeriodPage(0, 78, -3000);
  assert.ok(
    Math.abs(hard) >= 20 && Math.abs(hard) <= 40,
    `hard flick expected 20–40 slots, got ${hard}`,
  );
  const harder = snapPeriodPage(0, 78, -3500);
  assert.ok(
    Math.abs(harder) >= 30 && Math.abs(harder) <= WHEEL_MAX_FLING_SLOTS,
    `stronger flick expected ≥30 slots, got ${harder}`,
  );
  const hardNeg = snapPeriodPage(0, 78, 3000);
  assert.equal(hardNeg, -hard);

  // Gentle fling just above velocity threshold → only a few slots
  const gentle = snapPeriodPage(0, 78, -800);
  assert.ok(
    Math.abs(gentle) >= 1 && Math.abs(gentle) <= 6,
    `gentle fling expected few slots, got ${gentle}`,
  );

  // Must NOT regress to old ~4–7 coast for a hard flick with no distance
  assert.ok(Math.abs(hard) > 10, `hard flick must exceed old ~4–7 coast, got ${hard}`);

  // Combined distance + inertia still allows 30+
  const combo = snapPeriodPage(-78 * 5, 78, -3000);
  assert.ok(Math.abs(combo) >= 25, `combo expected large coast, got ${combo}`);
  assert.ok(Math.abs(combo) <= WHEEL_MAX_FLING_SLOTS);
});

test('shiftPeriodAnchor: kind-aware mid-fling rebound helper', () => {
  assert.equal(shiftPeriodAnchor('year', '2026', 3), '2029');
  assert.equal(shiftPeriodAnchor('year', '2026', -2), '2024');
  assert.equal(shiftPeriodAnchor('day', '2026-09-20', 5), '2026-09-25');
  assert.equal(shiftPeriodAnchor('day', '2026-09-20', 0), '2026-09-20');
  const m = shiftPeriodAnchor('month', '2026-09-15', 1);
  assert.match(m, /^2026-10/);
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
  assert.doesNotMatch(pager, /pageX\s*<\s*PERIOD_PAGER_EDGE_GUARD_PX/);
  assert.match(pager, /CAL_P6_1A_ON_DRUM_CARVE_PX|CAL-P6-1A/);
  assert.match(pager, /useReducedMotion/);
  assert.match(pager, /label=["']<<["']/);
  assert.match(pager, /snapPeriodPage/);
  assert.match(pager, /rotateY/);
  assert.match(pager, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /WHEEL_PITCH/);
  assert.match(pager, /useLayoutEffect/);
  assert.match(pager, /slotPoolKey/);
  assert.match(pager, /shiftPeriodAnchor|visualShift/);
  assert.match(pager, /setFlinging\(false\)/);
  assert.match(pager, /setShowCenterExtras\(true\)/);
  // Flinging stays true for entire spring — flip only in onSpringRest, not at snap intent.
  const restIdx = pager.indexOf('onSpringRest');
  const animateIdx = pager.indexOf('const animateSnap');
  assert.ok(restIdx > 0 && animateIdx > restIdx);
  const animateBlock = pager.slice(animateIdx, pager.indexOf('const tapSide'));
  assert.doesNotMatch(animateBlock, /setFlinging\(false\)/);
  assert.match(pager.slice(restIdx, animateIdx), /setFlinging\(false\)/);
  assert.match(pager.slice(restIdx, animateIdx), /setShowCenterExtras\(true\)/);
});

test('PeriodPager slot map never reads tile.key on undefined (guards + shared offsets)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  const src = read('src/lib/calendar/periodPager.ts');
  assert.match(src, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /if \(!tile\) return null/);
  assert.doesNotMatch(pager, /window\.slots\[idx\]!/);
  assert.match(pager, /slotIndexForOffset/);
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
  assert.match(leaf, /yearPage/);
  assert.match(leaf, /SET_B\.header|#C62828/);
  assert.match(leaf, /MetalTabs/);
  assert.match(leaf, /monthHeader/);
  assert.match(leaf, /SET_B\.sunday|#E53935/);
  assert.match(leaf, /weekStrip|WeekDayStrip/);
  assert.doesNotMatch(leaf, /wrapBodyText/);
  assert.match(leaf, /dayNumeral/);
  assert.doesNotMatch(leaf, /dayCircle|borderRadius:\s*14/);
});
