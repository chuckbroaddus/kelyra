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
  drumCoastPlan,
  drumNearestSteps,
  drumSnapSteps,
  drumRingSlot,
  drumSlotNorm,
  periodIndex,
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

test('buildPeriodWindow: 7-slot SlotPool (center ±3); year sides + center full four-digit year', () => {
  const w = buildPeriodWindow({ kind: 'year', anchor: '2026' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.slots.length, 7);
  assert.equal(w.prev3.year, 2023);
  assert.equal(w.prev2.year, 2024);
  assert.equal(w.prev.year, 2025);
  assert.equal(w.current.year, 2026);
  assert.equal(w.next.year, 2027);
  assert.equal(w.next2.year, 2028);
  assert.equal(w.next3.year, 2029);
  assert.equal(w.current.centerCaption, '2026');
  assert.equal(w.current.sideCaption, '2026');
  assert.equal(w.prev.sideCaption, '2025');
  assert.equal(w.next.sideCaption, '2027');
  assert.equal(w.slots[3], w.current);
  WHEEL_SLOT_OFFSETS.forEach((offset, idx) => {
    const tile = w.slots[idx];
    assert.ok(tile, `missing slot at offset ${offset}`);
    assert.equal(typeof tile.key, 'string');
    assert.ok(tile.key.length > 0);
  });
});

test('buildPeriodWindow month: existing shiftMonth; plate fields on all 7', () => {
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
  assert.equal(w.prev3.fromIso, shiftWeek('2026-09-13', -3));
  assert.equal(w.next3.fromIso, shiftWeek('2026-09-13', 3));
});

test('buildPeriodWindow day: existing shiftDay ±3', () => {
  const w = buildPeriodWindow({ kind: 'day', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.dayIso, '2026-09-20');
  assert.equal(w.prev.dayIso, shiftDay('2026-09-20', -1));
  assert.equal(w.next.dayIso, shiftDay('2026-09-20', 1));
  assert.equal(w.prev3.dayIso, shiftDay('2026-09-20', -3));
  assert.equal(w.next3.dayIso, shiftDay('2026-09-20', 3));
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

test('periodDistance multiday: 3/5/7 advance one calendar week', () => {
  assert.equal(
    periodDistance('multiday', '2026-09-15', '2026-09-22', 3),
    1,
    'Tue–Thu windows are week-scoped',
  );
  assert.equal(
    periodDistance('multiday', '2026-09-14', '2026-09-21', 5),
    1,
    'Mon–Fri windows match shiftMultiday ±7',
  );
  assert.equal(
    periodDistance('multiday', '2026-09-14', '2026-09-21', 7),
    1,
  );
});


test('buildPeriodWindow agenda: ±7 day step across 7 slots', () => {
  const w = buildPeriodWindow({ kind: 'agenda', anchor: '2026-09-20' });
  assert.equal(w.slots.length, WHEEL_SLOT_OFFSETS.length);
  assert.equal(w.current.centerCaption, 'Next 2 weeks');
  assert.equal(w.prev.anchor, shiftDay('2026-09-20', -7));
  assert.equal(w.next.anchor, shiftDay('2026-09-20', 7));
  assert.equal(w.prev3.anchor, shiftDay('2026-09-20', -21));
  assert.equal(w.next3.anchor, shiftDay('2026-09-20', 21));
});

test('SlotPool N=7: window has real tiles at ±3 (local residual cover)', () => {
  const w = buildPeriodWindow({ kind: 'year', anchor: '2026' });
  assert.equal(w.slots.length, 7);
  assert.ok(w.prev3.key);
  assert.ok(w.next3.key);
  assert.notEqual(w.prev3.key, w.current.key);
  assert.notEqual(w.next3.key, w.current.key);
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


test('shouldFreezeSlotPoolDuringSnap: freeze only |steps|≤3 programmed; live/long do not', () => {
  assert.equal(SLOT_POOL_SNAP_FREEZE_CRITICAL_STEPS, 3);
  // Programmed short snaps (critical band / half-window) freeze
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 0), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 1), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 2), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 3), true);
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, -3), true);
  // Long coasts must NOT freeze (silhouettes beyond ±3 need recycle)
  assert.equal(shouldFreezeSlotPoolDuringSnap(true, 4), false);
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

test('CAL-DRUM-TRACK: each value rides its own card (absolute index + ring host, UI-thread pan)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  // Card position comes from its own absolute index + UI-thread drum position only.
  assert.match(pager, /drumSlotNorm\(index, centerShared\.value, dragPx, P\)/);
  assert.match(pager, /dragPx = totalDrag/);
  // No residual wrap in the card worklet (the wrap re-labeled the card under the finger).
  assert.doesNotMatch(pager, /Math\.trunc\(-totalDrag/);
  assert.doesNotMatch(pager, /residualFromTotalDrag/);
  // Hosts are ring slots of the absolute index, rendered in ring order.
  assert.match(pager, /const ringSlot = drumRingSlot\(index\)/);
  assert.match(pager, /stableSlotHostKey\(ringSlot\)/);
  assert.match(pager, /hosts\[slot\.ringSlot\] = slot\.node/);
  // Pan begin/update run on the UI thread — no runOnJS per move frame.
  const panIdx = pager.indexOf('Gesture.Pan()');
  const panBlock = pager.slice(panIdx, pager.indexOf('if (failed) {', panIdx));
  const updateBlock = panBlock.slice(panBlock.indexOf('.onUpdate('), panBlock.indexOf('.onEnd('));
  assert.match(updateBlock, /dragShared\.value = grantDragShared\.value \+ e\.translationX/);
  assert.doesNotMatch(updateBlock, /runOnJS/);
  assert.match(panBlock, /cancelAnimation\(dragShared\)/);
  // Rest folds the landed drag into the center index in one UI step.
  const animIdx = pager.indexOf('const animateSnap');
  const animBlock = pager.slice(animIdx, pager.indexOf('const tapSide'));
  assert.match(animBlock, /anchorPosShared\.value = restIndex;\s*dragShared\.value = 0;/);
  assert.match(animBlock, /withTiming\(toValue, \{ duration: coastMs, easing: Easing\.out\(Easing\.quad\) \}/);
  assert.match(animBlock, /withSpring/);
  // Window center follows the UI-thread center (round), JS only picks mounted values.
  assert.match(pager, /Math\.round\(anchorPosShared\.value - dragShared\.value \/ pitch\)/);
});

test('CAL-DRUM-TRACK periodIndex is consistent with shiftPeriodAnchor for every kind', () => {
  const cases = [
    ['year', '2026'],
    ['month', '2026-10-02'],
    ['week', '2026-10-02'],
    ['multiday', '2026-09-29'],
    ['day', '2026-10-02'],
    ['agenda', '2026-10-02'],
  ] as const;
  for (const [kind, anchor] of cases) {
    const base = periodIndex(kind, anchor);
    for (const n of [-40, -7, -3, -1, 1, 2, 3, 12, 48]) {
      assert.equal(
        periodIndex(kind, shiftPeriodAnchor(kind, anchor, n)),
        base + n,
        `${kind} ${anchor} +${n}`,
      );
    }
  }
  // Day index is the UTC day number the Day List follow/drive positions use.
  assert.equal(periodIndex('day', '1970-01-02'), 1);
});

test('CAL-DRUM-TRACK ring hosts: window rebound keeps every retained value on its card', () => {
  assert.equal(drumRingSlot(0), 0);
  assert.equal(drumRingSlot(7), 0);
  assert.equal(drumRingSlot(-1), 6);
  assert.equal(drumRingSlot(20366), 20366 % 7);
  const P = 51;
  const hostsFor = (center: number) =>
    new Map(WHEEL_SLOT_OFFSETS.map((o) => [center + o, drumRingSlot(center + o)]));
  for (const center of [20363, -5, 0]) {
    const before = hostsFor(center);
    const after = hostsFor(center + 1);
    const ring = new Set(after.values());
    assert.equal(ring.size, 7, 'seven distinct hosts');
    let moved = 0;
    for (const [value, host] of after) {
      if (before.has(value)) assert.equal(before.get(value), host, `value ${value} stays on its host`);
      else moved += 1;
    }
    assert.equal(moved, 1, 'only the entering value takes the leaving host');
  }
  // Same drum position → same screen slot regardless of which window is mounted.
  const centerIndex = 100;
  const drag = -1.4 * P;
  assert.ok(Math.abs(drumSlotNorm(101, centerIndex, drag, P) - -0.4) < 1e-9);
  assert.ok(Math.abs(drumSlotNorm(102, centerIndex, drag, P) - 0.6) < 1e-9);
  // Finger 1:1: dragging one pitch moves every card exactly one slot.
  assert.equal(drumSlotNorm(100, 100, -P, P), -1);
});

test('CAL-DRUM-TRACK coast plan: fling = momentum at release speed; slow = spring', () => {
  const P = 51;
  const plan = (releaseDragPx: number, velocityX: number) => {
    const steps = drumSnapSteps(releaseDragPx, P, velocityX, 0.28, 600, WHEEL_MAX_FLING_SLOTS, WHEEL_FLING_DECEL);
    return { steps, ...drumCoastPlan({ releaseDragPx, velocityX, pitch: P, steps }) };
  };
  // Worklet law == snapPeriodPage law.
  for (const [dx, vx] of [[-30, 0], [-0.6 * P, -200], [-40, -2000], [120, 3100], [0, 9000], [-3, 40]]) {
    assert.equal(drumSnapSteps(dx, P, vx, 0.28, 600, WHEEL_MAX_FLING_SLOTS, WHEEL_FLING_DECEL), snapPeriodPage(dx, P, vx));
  }
  const slow = plan(-0.6 * P, -200);
  assert.equal(slow.mode, 'spring');
  assert.equal(slow.steps, 1);
  const fling = plan(-40, -2000);
  assert.equal(fling.mode, 'coast');
  assert.ok(fling.steps >= 15, `hard flick coasts many cards (${fling.steps})`);
  // Quad ease-out opening speed 2|D|/T equals the release speed (unless clamped).
  const remaining = Math.abs(-fling.steps * P - -40);
  assert.ok(Math.abs((2 * remaining * 1000) / fling.durationMs - 2000) < 1);
  const capped = plan(0, 9000);
  assert.equal(capped.steps, -WHEEL_MAX_FLING_SLOTS);
  assert.ok(capped.durationMs <= 1600);
  assert.equal(drumNearestSteps(-1.4 * P, P), 1);
  assert.equal(drumNearestSteps(0.2 * P, P), 0);
  assert.equal(Object.is(drumNearestSteps(0.2 * P, P), -0), false);
});

test('CAL-DRUM-TRACK lib worklets are closure-free (periodWheel ⇄ periodPager import cycle)', () => {
  const src = read('src/lib/calendar/periodPager.ts');
  const fns = [...src.matchAll(/export function (\w+)\([\s\S]*?\n\}\n/g)];
  const worklets = fns.filter((m) => /'worklet';/.test(m[0]));
  assert.ok(worklets.length >= 4, `expected drum worklets, got ${worklets.length}`);
  for (const m of worklets) {
    const body = m[0];
    assert.doesNotMatch(body, /\b(WHEEL_[A-Z_]+|SLOT_PITCH|SLOT_POOL_[A-Z_]+)\b/, `${m[1]} captures a module constant`);
    assert.doesNotMatch(body.replace(`export function ${m[1]}`, ''), /\b(snapPeriodPage|drum\w+|periodDistance)\(/, `${m[1]} calls another function`);
  }
  // Component release path uses the worklet law, not the defaulted JS wrapper.
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.doesNotMatch(pager, /snapPeriodPage\(/);
  assert.match(pager, /drumSnapSteps\(/);
});

test('calendar wires PeriodPager; day list included; Set B leaf identity; no PNG atlas', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /PeriodPager/);
  assert.match(screen, /showsPeriodPager\(activeView, dayMode\)/);
  assert.doesNotMatch(screen, /label=["']<<["']/);
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.doesNotMatch(leaf, /\.png|ImageBackground|require\(/);
  assert.doesNotMatch(leaf, /function MonthHangingGrid|const MonthHangingGrid|<MonthHangingGrid|function WeekDayStrip|<WeekDayStrip|styles\.hangGrid|styles\.weekStrip|weekStrip:\s*\{/);
  assert.match(leaf, /MetalTabs|SET_B/);
  assert.match(leaf, /yearPage|monthStub|dayNumeral|plateBodyLine/);
  assert.doesNotMatch(leaf, /YearIcon|WeekIcon|DayIcon/);
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.doesNotMatch(pager, /pageX\s*<\s*PERIOD_PAGER_EDGE_GUARD_PX/);
  assert.match(pager, /CAL_P6_1A_ON_DRUM_CARVE_PX|CAL-P6-1A/);
  assert.match(pager, /useReducedMotion/);
  assert.match(pager, /label=["']<<["']/);
  assert.match(pager, /snapPeriodPage/);
  assert.match(pager, /rotateY/);
  assert.match(pager, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /wheelRowLayout/);
  assert.match(pager, /ROW\.pitch/);
  assert.match(pager, /useLayoutEffect/);
  assert.match(pager, /stableSlotHostKey\(ringSlot\)/);
  assert.doesNotMatch(pager, /slotPoolKey\(tile\.key,\s*slotIndex\)/);
  assert.doesNotMatch(pager, /slotPoolKey\(kind,\s*slotIndex\)/);
  assert.match(pager, /drumSlotNorm\(index, centerShared\.value/);
  assert.doesNotMatch(pager, /Math\.round\(-drag/);
  assert.doesNotMatch(pager, /Math\.round\(-totalDrag/);
  assert.doesNotMatch(pager, /Math\.round\(-dragShared/);
  assert.match(pager, /shiftPeriodAnchor|visualShift/);
  assert.match(pager, /windowCenterRef/);
  assert.match(pager, /restIndex - anchorIndexRef\.current/);
  assert.match(pager, /updateWindowCenter/);
  assert.match(pager, /setFlinging\(false\)/);
  assert.match(pager, /setShowCenterExtras\(true\)/);
  // Spring velocity must be px/s (RNGH velocityX is already px/s).
  assert.match(pager, /velocityX|velocityRef\.current = velocityX/);
  // Flinging stays true for entire spring — flip only in onSpringRest, not at snap intent.
  const restIdx = pager.indexOf('onSpringRest');
  const animateIdx = pager.indexOf('const animateSnap');
  assert.ok(restIdx > 0 && animateIdx > restIdx);
  const animateBlock = pager.slice(animateIdx, pager.indexOf('const tapSide'));
  assert.doesNotMatch(animateBlock, /setFlinging\(false\)/);
  assert.match(pager.slice(restIdx, animateIdx), /setFlinging\(false\)/);
  assert.match(pager.slice(restIdx, animateIdx), /setShowCenterExtras\(true\)/);
  // Settle commits exactly the value that landed (UI rest index), never a prediction.
  assert.match(pager.slice(restIdx, animateIdx), /const commit = restIndex - anchorIndexRef\.current/);
  assert.match(pager.slice(restIdx, animateIdx), /shouldIgnoreSpringRest/);
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
  // P0: no tile.key in React keys — hosts are stableSlotHostKey(slotIndex) only.
  const keyReads = [...pager.matchAll(/tile\.key/g)];
  assert.equal(
    keyReads.length,
    0,
    `PeriodPager must not remount-key on tile.key mid-fling; got ${keyReads.length} tile.key reads`,
  );
  assert.match(pager, /stableSlotHostKey\(ringSlot\)/);
  assert.doesNotMatch(pager, /slotPoolKey\(tile\.key,\s*slotIndex\)/);
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

test('PeriodPager grab stops a coast where it is; cancelled rests no-op', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /snapGenerationShared/);
  assert.match(pager, /shouldIgnoreSpringRest/);
  // Window follows the UI center (no absorbed/visual bookkeeping to drift).
  assert.match(
    pager,
    /shiftPeriodAnchor\(kind,\s*anchor,\s*windowCenter - anchorIndex,\s*dayCount\)/,
  );
  // Grab: UI worklet cancels the coast and keeps the drum where it is.
  const beginIdx = pager.indexOf('.onBegin(');
  const beginBlock = pager.slice(beginIdx, pager.indexOf('.onUpdate(', beginIdx));
  assert.match(beginBlock, /cancelAnimation\(dragShared\);\s*grantDragShared\.value = dragShared\.value;/);
  assert.match(beginBlock, /followBlockShared\.value = 2/);
  // Grab invalidates the caught snap's queued rest (UI thread, no JS race).
  assert.match(beginBlock, /snapGenerationShared\.value \+= 1/);
  // Release coast starts on the UI thread (no JS round trip before momentum).
  const endIdx = pager.indexOf('.onEnd(');
  const endBlock = pager.slice(endIdx, pager.indexOf('.onFinalize(', endIdx));
  assert.match(endBlock, /drumCoastPlan\(\{ releaseDragPx, velocityX: e\.velocityX, pitch, steps \}\)/);
  assert.match(endBlock, /animateSnap\(steps, e\.velocityX/);
  // animateSnap stamps springGeneration for late-rest ignore (native+web).
  assert.match(pager, /runOnJS\(onSpringRest\)\(springGeneration, restIndex\)/);
});

test('existing shifters only — periodPager imports shiftWeek/Month/Day/Multiday', () => {
  const src = read('src/lib/calendar/periodPager.ts');
  assert.match(src, /shiftWeek/);
  assert.match(src, /shiftMonth/);
  assert.match(src, /shiftDay/);
  assert.match(src, /shiftMultiday/);
  assert.doesNotMatch(src, /supabase|execute_sql|from\('/);
});

test('Y/M/W/D leaf identity source contracts (CAL-3DW-16) — fixed plate', () => {
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.match(leaf, /yearPage/);
  assert.match(leaf, /SET_B\.header|#C62828/);
  assert.match(leaf, /MetalTabs/);
  assert.match(leaf, /monthHeader/);
  assert.match(leaf, /silhouetteSoftText|clone idle chrome/);
  assert.match(leaf, /wrapFooter/);
  assert.doesNotMatch(leaf, /function MonthHangingGrid|const MonthHangingGrid|<MonthHangingGrid|function WeekDayStrip|<WeekDayStrip|styles\.hangGrid|styles\.weekStrip|weekStrip:\s*\{/);
  assert.match(leaf, /plateBodyLine|monthStub/);
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

test('wheelContentModeFor fling clear window uses periodDistance radius 3', () => {
  // imported via periodWheel in sibling test; pin policy contract here via distance helper
  assert.ok(Math.abs(periodDistance('year', '2026', '2029')) <= 3);
  assert.ok(Math.abs(periodDistance('year', '2026', '2030')) > 3);
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
  // No separate tap-only RM tree without gesture.
  assert.doesNotMatch(pager, /styles\.rmRow/);
  // Pan gesture must not bail solely on reduceMotion.
  assert.match(pager, /Gesture\.Pan\(\)/);
  assert.doesNotMatch(pager, /if \(reduceMotion\).*Gesture\.Pan|Gesture\.Pan[\s\S]{0,200}reduceMotion/);
  // Slot motion still branches rotateY off under RM.
  assert.match(pager, /if \(reduceMotion\) \{[\s\S]*?transform:\s*\[\{\s*scale/);
});

test('CAL-3DW side hits outside scale ≥56 (t_1a0f176c)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  const wheel = read('src/lib/calendar/periodWheel.ts');
  assert.match(wheel, /WHEEL_MIN_HIT_PX\s*=\s*56/);
  assert.match(pager, /WHEEL_MIN_HIT_PX/);
  // Hit Pressable wraps inner scaled visual with pointerEvents none.
  assert.match(pager, /styles\.hitTarget/);
  assert.match(pager, /ROW\.heroWidth|ROW\.heroHeight/);
  assert.match(pager, /pointerEvents="none"/);
  assert.match(pager, /minWidth:\s*WHEEL_MIN_HIT_PX/);
});

test('CAL-P6-1A start-claim full-band (t_80d16cbc)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /manualActivation\(true\)/);
  assert.match(pager, /onTouchesDown/);
  assert.match(pager, /stateManager\.activate\(\)/);
  assert.match(pager, /GestureDetector/);
  assert.match(pager, /tapAtStageX/);
  assert.match(pager, /CAL_P6_1A_ON_DRUM_CARVE_PX/);
});


test('CAL-3DW mid-spring interrupt continues from visual drag (t_72512eeb)', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /grantDragShared/);
  assert.match(pager, /grantDragShared\.value \+ e\.translationX/);
  const grantIdx = pager.indexOf('.onBegin(');
  const grantBlock = pager.slice(grantIdx, grantIdx + 600);
  assert.match(grantBlock, /grantDragShared\.value =/);
});
