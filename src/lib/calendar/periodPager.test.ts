import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  absorbInterruptShift,
  buildPeriodWindow,
  commitShiftFromVisual,
  dragToSlotShift,
  periodKindForView,
  residualFromTotalDrag,
  rolodexOpacityForOffset,
  rolodexScaleForOffset,
  showsPeriodPager,
  snapPeriodPage,
  shiftPeriodAnchor,
  periodDistance,
  shouldFreezeSlotPoolDuringSnap,
  shouldIgnoreSpringRest,
  SLOT_POOL_SNAP_FREEZE_CRITICAL_STEPS,
  transformDragForSlotMotion,
  visualShiftForSlotPool,
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

test('commitShiftFromVisual: settle commit === tracked flyby shift (soft max 48)', () => {
  // Identity: commit steps must equal the visual flyby tracker (not release prediction).
  assert.equal(commitShiftFromVisual(0), 0);
  assert.equal(commitShiftFromVisual(7), 7);
  assert.equal(commitShiftFromVisual(-12), -12);
  assert.equal(commitShiftFromVisual(30), 30);
  assert.equal(commitShiftFromVisual(-39), -39);
  // Soft ceiling
  assert.equal(commitShiftFromVisual(100), WHEEL_MAX_FLING_SLOTS);
  assert.equal(commitShiftFromVisual(-100), -WHEEL_MAX_FLING_SLOTS);
  assert.equal(commitShiftFromVisual(48), 48);
  assert.equal(commitShiftFromVisual(-48), -48);
  // Truncate non-integers toward zero (visualShift is already trunc'd in UI)
  assert.equal(commitShiftFromVisual(3.9), 3);
  assert.equal(commitShiftFromVisual(-3.9), -3);
  assert.equal(commitShiftFromVisual(Number.NaN), 0);
  // Divergent prediction vs visual: commit uses visual
  const predicted = snapPeriodPage(0, 78, -3000);
  const visualSeen = predicted > 0 ? predicted - 5 : predicted + 5;
  assert.equal(commitShiftFromVisual(visualSeen), visualSeen);
  assert.notEqual(commitShiftFromVisual(visualSeen), predicted);
});


test('absorbInterruptShift: prefer pending; else trunc visual; never invent steps', () => {
  // Programmed pending wins (short snap interrupt before rest).
  assert.equal(absorbInterruptShift({ pendingSteps: 2, visualShift: 1 }), 2);
  assert.equal(absorbInterruptShift({ pendingSteps: -1, visualShift: 0 }), -1);
  assert.equal(absorbInterruptShift({ pendingSteps: 12, visualShift: 7 }), 12);
  // No pending → fold visualShift (long coast / freeze-at-liveShift interrupt).
  assert.equal(absorbInterruptShift({ pendingSteps: 0, visualShift: 3 }), 3);
  assert.equal(absorbInterruptShift({ pendingSteps: 0, visualShift: -2 }), -2);
  assert.equal(absorbInterruptShift({ pendingSteps: 0, visualShift: 3.9 }), 3);
  assert.equal(absorbInterruptShift({ pendingSteps: 0, visualShift: 0 }), 0);
  // Soft ceiling via commitShiftFromVisual
  assert.equal(absorbInterruptShift({ pendingSteps: 100, visualShift: 0 }), WHEEL_MAX_FLING_SLOTS);
  assert.equal(absorbInterruptShift({ pendingSteps: 0, visualShift: -100 }), -WHEEL_MAX_FLING_SLOTS);
});

test('shouldIgnoreSpringRest: generation mismatch no-ops cancelled spring', () => {
  assert.equal(
    shouldIgnoreSpringRest({ activeGeneration: 3, callbackGeneration: 3 }),
    false,
  );
  assert.equal(
    shouldIgnoreSpringRest({ activeGeneration: 4, callbackGeneration: 3 }),
    true,
  );
  assert.equal(
    shouldIgnoreSpringRest({ activeGeneration: 0, callbackGeneration: 1 }),
    true,
  );
});

test('dragToSlotShift: trunc not round — no half-pitch flicker; monotonic slow drag', () => {
  const P = 78;
  // Half-pitch: round would flip early (shift=1 at -0.5P); trunc stays 0 until full pitch.
  assert.equal(dragToSlotShift(-0.49 * P, P), 0);
  assert.equal(dragToSlotShift(-0.5 * P, P), 0);
  assert.equal(dragToSlotShift(-0.99 * P, P), 0);
  assert.equal(dragToSlotShift(-1.0 * P, P), 1);
  assert.equal(dragToSlotShift(-1.49 * P, P), 1);
  assert.equal(dragToSlotShift(-1.5 * P, P), 1);
  assert.equal(dragToSlotShift(-2.0 * P, P), 2);
  // Opposite direction
  assert.equal(dragToSlotShift(0.5 * P, P), 0);
  assert.equal(dragToSlotShift(0.99 * P, P), 0);
  assert.equal(dragToSlotShift(1.0 * P, P), -1);
  assert.equal(dragToSlotShift(1.5 * P, P), -1);
  assert.equal(dragToSlotShift(2.0 * P, P), -2);
  // Slow continuous drag: shifts are monotonic non-decreasing as drag goes more negative
  let prev = dragToSlotShift(0, P);
  for (let drag = 0; drag >= -5 * P; drag -= 1) {
    const s = dragToSlotShift(drag, P);
    assert.ok(s >= prev, `shift ${s} < prev ${prev} at drag=${drag}`);
    prev = s;
  }
  // Contrast: Math.round would jump at half pitch
  assert.equal(Math.round(-(-0.5 * P) / P), 1);
  assert.equal(dragToSlotShift(-0.5 * P, P), 0);
});

test('residualFromTotalDrag: residual continuous in (-P, P) across ±P boundaries', () => {
  const P = 78;
  const eps = 1e-9;
  // Across negative boundary (content next)
  const a = residualFromTotalDrag(-P + 1, P);
  const b = residualFromTotalDrag(-P, P);
  const c = residualFromTotalDrag(-P - 1, P);
  assert.equal(a.shift, 0);
  assert.equal(b.shift, 1);
  assert.equal(c.shift, 1);
  assert.ok(a.localDrag > -P - eps && a.localDrag < P + eps);
  assert.ok(b.localDrag > -P - eps && b.localDrag < P + eps);
  assert.ok(c.localDrag > -P - eps && c.localDrag < P + eps);
  // localDrag approaches -P then resets near 0 after trunc flip (no half-pitch +P jump)
  assert.ok(Math.abs(a.localDrag - (-P + 1)) < eps);
  assert.ok(Math.abs(b.localDrag - 0) < eps);
  assert.ok(Math.abs(c.localDrag - (-1)) < eps);
  // Across positive boundary (content prev)
  const d = residualFromTotalDrag(P - 1, P);
  const e = residualFromTotalDrag(P, P);
  const f = residualFromTotalDrag(P + 1, P);
  assert.equal(d.shift, 0);
  assert.equal(e.shift, -1);
  assert.equal(f.shift, -1);
  assert.ok(d.localDrag > -P - eps && d.localDrag < P + eps);
  assert.ok(e.localDrag > -P - eps && e.localDrag < P + eps);
  assert.ok(f.localDrag > -P - eps && f.localDrag < P + eps);
  // Slow sweep: residual never jumps by ~P at half-pitch (round bug)
  const half = residualFromTotalDrag(-0.5 * P, P);
  assert.equal(half.shift, 0);
  assert.ok(Math.abs(half.localDrag - (-0.5 * P)) < eps);
  // Round-style residual would be +0.5P here — pin we do not
  assert.ok(half.localDrag < 0);
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


test('shouldFreezeSlotPoolDuringSnap: freeze only |steps|≤4 programmed; live/long do not', () => {
  assert.equal(SLOT_POOL_SNAP_FREEZE_CRITICAL_STEPS, 4);
  // Programmed short snaps (critical band) freeze
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 0), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 1), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 2), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 4), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, -3), true);
  // Long coasts must NOT freeze (silhouettes beyond ±4 need recycle)
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 5), false);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 12), false);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, -30), false);
  // Not programmed → never freeze
  assert.equal(shouldFreezeSlotPoolDuringSnap(false), false);
  assert.equal(shouldFreezeSlotPoolDuringSnap(false, 1), false);
  assert.equal(shouldFreezeSlotPoolDuringSnap(false, 5), false);
});

test('visualShiftForSlotPool: freeze keeps frozenShift; does not force 0 when provided', () => {
  // Omitting frozenShift → fling-start origin (0) — pure tap path
  assert.equal(visualShiftForSlotPool({ freezeSlotPool: true, liveShift: 3 }), 0);
  // When frozenShift provided (release-time liveShift), keep that window — no origin flash
  assert.equal(
    visualShiftForSlotPool({ freezeSlotPool: true, liveShift: 3, frozenShift: 3 }),
    3,
  );
  assert.equal(
    visualShiftForSlotPool({ freezeSlotPool: true, liveShift: 3, frozenShift: 2 }),
    2,
  );
  assert.equal(
    visualShiftForSlotPool({ freezeSlotPool: true, liveShift: -2, frozenShift: -2 }),
    -2,
  );
  // Live / long coast (freeze off) → liveShift
  assert.equal(visualShiftForSlotPool({ freezeSlotPool: false, liveShift: 3 }), 3);
  assert.equal(visualShiftForSlotPool({ freezeSlotPool: false, liveShift: -1 }), -1);
});

test('transformDragForSlotMotion: freeze uses absolute drag; live uses trunc residual', () => {
  const P = 78;
  // One-step snap mid-flight at -0.5P: absolute stays -0.5P (no wrap).
  assert.equal(
    transformDragForSlotMotion({ totalDrag: -0.5 * P, pitch: P, freezeSlotPool: true }),
    -0.5 * P,
  );
  // Two-step target -2P absolute while frozen (no residual recycle).
  assert.equal(
    transformDragForSlotMotion({ totalDrag: -2 * P, pitch: P, freezeSlotPool: true }),
    -2 * P,
  );
  // Live drag at -1.5P → shift 1, localDrag -0.5P (trunc residual).
  const live = transformDragForSlotMotion({ totalDrag: -1.5 * P, pitch: P, freezeSlotPool: false });
  assert.equal(live, -0.5 * P);
  // Live at -0.5P (short drag, |steps| critical band) still residual=same (shift 0).
  assert.equal(
    transformDragForSlotMotion({ totalDrag: -0.5 * P, pitch: P, freezeSlotPool: false }),
    -0.5 * P,
  );
  // Crossing full pitch while live wraps; frozen does not.
  assert.equal(
    transformDragForSlotMotion({ totalDrag: -P - 1, pitch: P, freezeSlotPool: false }),
    -1,
  );
  assert.equal(
    transformDragForSlotMotion({ totalDrag: -P - 1, pitch: P, freezeSlotPool: true }),
    -P - 1,
  );
});

test('PeriodPager freezes SlotPool only for short snaps; residual rebase when liveShift≠0', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  // Freeze gated by abs steps (not always freeze on every programmed snap)
  assert.match(pager, /shouldFreezeSlotPoolDuringSnap\(true,\s*absSteps\)/);
  assert.match(pager, /pendingSnapStepsRef/);
  assert.match(pager, /snapFreezeShared/);
  assert.match(pager, /slotPoolFrozen/);
  // Reaction must bail while snapFreezeShared === 1 (short freeze only)
  assert.match(pager, /snapFreezeShared\.value === 1/);
  const rxnIdx = pager.indexOf('useAnimatedReaction(');
  assert.ok(rxnIdx > 0, 'useAnimatedReaction call site');
  const rxnBlock = pager.slice(rxnIdx, rxnIdx + 450);
  assert.match(rxnBlock, /snapFreezeShared/);
  assert.match(rxnBlock, /return;/);
  // animateSnap: freeze gated by steps; must not always zero the pool after live drag
  const animIdx = pager.indexOf('const animateSnap');
  const tapIdx = pager.indexOf('const tapSide');
  assert.ok(animIdx > 0 && tapIdx > animIdx);
  const animBlock = pager.slice(animIdx, tapIdx);
  assert.match(animBlock, /setSlotPoolFrozen/);
  assert.match(animBlock, /pendingSnapStepsRef\.current/);
  assert.match(animBlock, /visualShiftForSlotPool/);
  assert.match(animBlock, /frozenShift:\s*liveShift/);
  assert.match(animBlock, /residualFromTotalDrag/);
  assert.match(animBlock, /liveShift === 0/);
  assert.match(animBlock, /withSpring/);
  // Must not unconditionally force pool to origin (old #164 one-liner without frozenShift)
  assert.doesNotMatch(
    animBlock,
    /visualShiftForSlotPool\(\{\s*freezeSlotPool:\s*true,\s*liveShift:\s*visualShiftRef\.current\s*\}\)/,
  );
  // Native absolute drag when frozen (residual already rebased, or 0→−steps·P)
  assert.match(pager, /snapFreezeShared\.value === 1/);
  assert.match(pager, /dragPx = totalDrag/);
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
  assert.match(pager, /slotPoolKey\(tile\.key,\s*slotIndex\)/);
  assert.doesNotMatch(pager, /slotPoolKey\(kind,\s*slotIndex\)/);
  assert.match(pager, /Math\.trunc\(-/);
  assert.doesNotMatch(pager, /Math\.round\(-drag/);
  assert.doesNotMatch(pager, /Math\.round\(-totalDrag/);
  assert.doesNotMatch(pager, /Math\.round\(-dragShared/);
  assert.match(pager, /shiftPeriodAnchor|visualShift/);
  assert.match(pager, /visualShiftRef/);
  assert.match(pager, /commitShiftFromVisual/);
  assert.match(pager, /updateVisualShift/);
  assert.match(pager, /setFlinging\(false\)/);
  assert.match(pager, /setShowCenterExtras\(true\)/);
  // Spring velocity must be px/s (PanResponder vx * 1000), not raw vx.
  assert.match(pager, /g\.vx \* 1000/);
  // Flinging stays true for entire spring — flip only in onSpringRest, not at snap intent.
  const restIdx = pager.indexOf('onSpringRest');
  const animateIdx = pager.indexOf('const animateSnap');
  assert.ok(restIdx > 0 && animateIdx > restIdx);
  const animateBlock = pager.slice(animateIdx, pager.indexOf('const tapSide'));
  assert.doesNotMatch(animateBlock, /setFlinging\(false\)/);
  assert.match(pager.slice(restIdx, animateIdx), /setFlinging\(false\)/);
  assert.match(pager.slice(restIdx, animateIdx), /setShowCenterExtras\(true\)/);
  // Settle commits pending + absorbedShift; short snaps freeze mid-spring.
  assert.match(pager.slice(restIdx, animateIdx), /pendingSnapStepsRef\.current/);
  assert.match(pager.slice(restIdx, animateIdx), /absorbedShiftRef\.current/);
  assert.match(pager.slice(restIdx, animateIdx), /commitShiftFromVisual\(pending \+ absorbed\)/);
  assert.match(pager.slice(restIdx, animateIdx), /shouldIgnoreSpringRest/);
  assert.match(pager, /shouldFreezeSlotPoolDuringSnap|snapFreezeShared/);
  assert.match(pager, /snapFreezeShared\.value === 1/);
  assert.match(pager, /shouldFreezeSlotPoolDuringSnap\(true,\s*absSteps\)/);
  assert.doesNotMatch(pager.slice(restIdx, animateIdx), /finishShift\(steps\)/);
});

test('PeriodPager slot map never reads tile.key on undefined (guards + shared offsets)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  const src = read('src/lib/calendar/periodPager.ts');
  assert.match(src, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /if \(!tile\) return null/);
  assert.doesNotMatch(pager, /window\.slots\[idx\]!/);
  // FL-08 / t_df6159db P0: renderSlot must null-guard before any tile.key read; no slot bangs.
  assert.match(
    pager,
    /const tile = window\.slots\[slotIndex\];\s*if \(!tile\) return null;/,
  );
  assert.doesNotMatch(pager, /window\.slots\[[^\]]+\]!/);
  const keyReads = [...pager.matchAll(/tile\.key/g)];
  assert.equal(
    keyReads.length,
    1,
    `PeriodPager should have exactly one tile.key read (after guard); got ${keyReads.length}`,
  );
  assert.match(pager, /slotPoolKey\(tile\.key,\s*slotIndex\)/);
  assert.match(pager, /slotIndexForOffset/);
  // packWindow length-guards so SlotPool never ships a short window to the slot map.
  assert.match(src, /packWindow: expected \$\{WHEEL_SLOT_OFFSETS\.length\} slots/);
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

test('PeriodPager grant absorbs in-flight snap (does not drop pending)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  // Interrupt path folds owed steps into absorbedShift — never mid-gesture onShift.
  assert.match(pager, /absorbInterruptShift/);
  assert.match(pager, /absorbInFlightSnap/);
  assert.match(pager, /absorbedShift/);
  assert.match(pager, /updateAbsorbedShift/);
  assert.match(pager, /snapGenerationRef/);
  assert.match(pager, /shouldIgnoreSpringRest/);
  // Window applies absorbed + visual so SlotPool does not repeat cards on interrupt.
  assert.match(
    pager,
    /shiftPeriodAnchor\(kind,\s*anchor,\s*absorbedShift \+ visualShift,\s*dayCount\)/,
  );
  // Layout effect clears absorbed with the other snap resets.
  const layoutIdx = pager.indexOf('useLayoutEffect(');
  assert.ok(layoutIdx > 0);
  const layoutBlock = pager.slice(layoutIdx, layoutIdx + 700);
  assert.match(layoutBlock, /updateAbsorbedShift\(0\)/);
  // Grant must absorb — not merely clear pending to 0 without folding.
  const grantIdx = pager.indexOf('onPanResponderGrant');
  assert.ok(grantIdx > 0);
  const grantBlock = pager.slice(grantIdx, grantIdx + 900);
  assert.match(grantBlock, /absorbInFlightSnap\(\)/);
  assert.doesNotMatch(
    grantBlock,
    /pendingSnapStepsRef\.current = 0;\s*\n\s*if \(!IS_WEB\)/,
  );
  // tapSide also absorbs when a snap is in flight.
  const tapIdx = pager.indexOf('const tapSide');
  const tapBlock = pager.slice(tapIdx, tapIdx + 500);
  assert.match(tapBlock, /absorbInFlightSnap\(\)/);
  // animateSnap stamps springGeneration for late-rest ignore.
  assert.match(pager, /onSpringRest\(springGeneration\)/);
  assert.match(pager, /runOnJS\(onSpringRest\)\(springGeneration\)/);
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

test('periodDistance: kind-aware signed steps from fling origin', () => {
  assert.equal(periodDistance('year', '2026', '2026'), 0);
  assert.equal(periodDistance('year', '2026', '2030'), 4);
  assert.equal(periodDistance('year', '2026', '2031'), 5);
  assert.equal(periodDistance('year', '2026', '2022'), -4);
  assert.equal(periodDistance('year', '2026', '2021'), -5);
  assert.equal(periodDistance('month', '2026-09-15', '2027-01-01'), 4);
  assert.equal(periodDistance('month', '2026-09-15', '2027-02-01'), 5);
  assert.equal(periodDistance('day', '2026-09-20', '2026-09-24'), 4);
  assert.equal(periodDistance('day', '2026-09-20', '2026-09-25'), 5);
  assert.equal(periodDistance('week', '2026-09-13', '2026-10-11'), 4);
  assert.equal(periodDistance('week', '2026-09-13', '2026-10-18'), 5);
});

test('wheelContentModeFor fling clear window uses periodDistance radius 4', () => {
  // imported via periodWheel in sibling test; pin policy contract here via distance helper
  assert.ok(Math.abs(periodDistance('year', '2026', '2030')) <= 4);
  assert.ok(Math.abs(periodDistance('year', '2026', '2031')) > 4);
});


test('CAL-3DW host perspective-origin 50% 45% (t_15feb999)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  const wheel = read('src/lib/calendar/periodWheel.ts');
  assert.match(wheel, /WHEEL_PERSPECTIVE_ORIGIN\s*=\s*'50% 45%'/);
  assert.match(pager, /WHEEL_PERSPECTIVE_ORIGIN/);
  assert.match(pager, /perspectiveOrigin:\s*WHEEL_PERSPECTIVE_ORIGIN/);
  assert.match(pager, /transformOrigin:\s*WHEEL_PERSPECTIVE_ORIGIN/);
  // Perspective on host — not per-tile transform perspective.
  assert.doesNotMatch(pager, /transform:\s*\[[^\]]*(?:perspective:\s*WHEEL_PERSPECTIVE)/);
});

test('CAL-3DW RM keeps drag; drops rotateY only (t_b9051be5)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  // No separate tap-only RM tree without panHandlers.
  assert.doesNotMatch(pager, /styles\.rmRow/);
  // Pan move gate must not bail solely on reduceMotion.
  const moveIdx = pager.indexOf('onMoveShouldSetPanResponder:');
  assert.ok(moveIdx > 0);
  const moveBlock = pager.slice(moveIdx, moveIdx + 280);
  assert.doesNotMatch(moveBlock, /if \(reduceMotion/);
  // Slot motion still branches rotateY off under RM.
  assert.match(pager, /if \(reduceMotion\) \{[\s\S]*?transform:\s*\[\{\s*scale/);
});

test('CAL-3DW side hits outside scale ≥56 (t_1a0f176c)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  const wheel = read('src/lib/calendar/periodWheel.ts');
  assert.match(wheel, /WHEEL_MIN_HIT_PX\s*=\s*56/);
  assert.match(pager, /WHEEL_MIN_HIT_PX/);
  // Hit Pressable wraps inner scaled visual with pointerEvents none.
  assert.match(pager, /style=\{styles\.hitTarget\}/);
  assert.match(pager, /pointerEvents="none"/);
  assert.match(pager, /minWidth:\s*WHEEL_MIN_HIT_PX/);
});

test('CAL-P6-1A start-claim full-band (t_80d16cbc)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(
    pager,
    /onStartShouldSetPanResponder:\s*\(\)\s*=>\s*!settling\.current\s*&&\s*!failed/,
  );
  assert.match(pager, /onStartShouldSetPanResponderCapture:/);
  assert.match(pager, /tapAtStageX/);
  assert.match(pager, /CAL_P6_1A_ON_DRUM_CARVE_PX/);
});
