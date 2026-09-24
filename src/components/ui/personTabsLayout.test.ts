import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSON_TAB_GAP,
  PERSON_TAB_GLYPH,
  PERSON_TAB_HIT_PAD_X,
  PERSON_TAB_ICON_HIT,
  PERSON_TAB_ROW_GAP,
  PERSON_TAB_ROW_PAD_END,
  personTabAvailableTitleWidth,
  personTabExpandEasingKind,
  personTabLabelMax,
  personTabRowHasGlyph,
  personTabScrollX,
  personTabSelectedMaxWidth,
  personTabTitleNeedsMarquee,
  personTabTitleSlot,
  personTabPillWidthRange,
  personTabScrollTabWidth,
  personTabScrollNeeded,
  personTabScrollMotion,
  personTabNeedsLeadingScrollLock,
  personTabLeadingScrollLockMs,
  PERSON_TAB_SCROLL_SETTLE_MS,
  personTabRowUsesTeacherFaces,
} from './personTabsLayout.ts';

import { isClassDeskTabsRoute } from '../../lib/chrome/classTabs.ts';

test('available title width subtracts glyph, gap, hit pad, and row end', () => {
  const row = 360;
  const chrome = PERSON_TAB_GLYPH + PERSON_TAB_GAP + PERSON_TAB_HIT_PAD_X * 2 + PERSON_TAB_ROW_PAD_END;
  assert.equal(personTabAvailableTitleWidth(row), row - chrome);
  assert.equal(personTabAvailableTitleWidth(0), 0);
});

test('legacy fraction: one tab leftover; several stay at half (opt-out only)', () => {
  const row = 360;
  const available = personTabAvailableTitleWidth(row);
  assert.equal(personTabLabelMax(row, 1, true, 'fraction'), available);
  assert.equal(personTabLabelMax(row, 0, true, 'fraction'), available);
  assert.equal(personTabLabelMax(row, 2, true, 'fraction'), Math.floor(row * 0.5));
  assert.ok(personTabLabelMax(row, 1, true, 'fraction') > personTabLabelMax(row, 3, true, 'fraction'));
  // Default policy is visibilityReserve (FoM lock) — not half-row.
  assert.notEqual(personTabLabelMax(row, 2), Math.floor(row * 0.5));
});

test('visibilityReserve: short title hugs — pill stays narrow (not stretch-to-3)', () => {
  const row = 358;
  const ceiling = personTabLabelMax(row, 8, true, 'visibilityReserve');
  const shortPaint = 36; // "Feed"
  const slot = personTabTitleSlot(shortPaint, ceiling);
  assert.equal(slot, shortPaint);
  const selected = personTabSelectedMaxWidth(slot, true);
  // Remaining row must fit more than 2 collapsed icons (4+ when title is short)
  const leftover = row - PERSON_TAB_ROW_PAD_END - selected;
  const neighbors = Math.floor(leftover / (PERSON_TAB_ICON_HIT + PERSON_TAB_ROW_GAP));
  assert.ok(neighbors >= 2, `neighbors=${neighbors} selected=${selected}`);
  // Must NOT equal the stretch-to-fill width (ceiling as pill)
  const stretched = personTabSelectedMaxWidth(ceiling, true);
  assert.ok(selected < stretched - 20, `hug=${selected} stretch=${stretched}`);
});

test('visibilityReserve: long title caps so ≥3 tabs fit (marquee ceiling)', () => {
  const row = 358;
  const ceiling = personTabLabelMax(row, 8, true, 'visibilityReserve');
  const longPaint = 400;
  const slot = personTabTitleSlot(longPaint, ceiling);
  assert.equal(slot, ceiling);
  const selected = personTabSelectedMaxWidth(slot, true);
  const others = 2 * PERSON_TAB_ICON_HIT + 2 * PERSON_TAB_ROW_GAP;
  assert.ok(selected + others + PERSON_TAB_ROW_PAD_END <= row + 1);
});

test('visibilityReserve two-tab keeps both visible (DeskSpanTabs)', () => {
  const row = 358;
  const ceiling = personTabLabelMax(row, 2, true, 'visibilityReserve');
  const slot = personTabTitleSlot(80, ceiling);
  const selected = personTabSelectedMaxWidth(slot, true);
  const other = PERSON_TAB_ICON_HIT + PERSON_TAB_ROW_GAP;
  assert.ok(selected + other + PERSON_TAB_ROW_PAD_END <= row + 1);
});

test('title slot is the lesser of the title and the max', () => {
  assert.equal(personTabTitleSlot(80, 300), 80);
  assert.equal(personTabTitleSlot(400, 300), 300);
  assert.equal(personTabTitleSlot(0, 300), 0);
});

test('labels-only row does not reserve the 22 glyph slot', () => {
  const row = 360;
  const without = PERSON_TAB_HIT_PAD_X * 2 + PERSON_TAB_ROW_PAD_END;
  assert.equal(personTabAvailableTitleWidth(row, false), row - without);
  assert.ok(personTabAvailableTitleWidth(row, false) > personTabAvailableTitleWidth(row, true));
  assert.equal(personTabSelectedMaxWidth(80, false), PERSON_TAB_HIT_PAD_X * 2 + 80);
  assert.equal(
    personTabSelectedMaxWidth(80, true),
    PERSON_TAB_HIT_PAD_X * 2 + PERSON_TAB_GLYPH + PERSON_TAB_GAP + 80,
  );
  assert.equal(personTabRowHasGlyph([{}]), false);
  assert.equal(personTabRowHasGlyph([{ icon: 'grades' }]), true);
});

test('teacher faces only when the row is exclusively classes', () => {
  assert.equal(personTabRowUsesTeacherFaces(['class', 'class']), true);
  assert.equal(personTabRowUsesTeacherFaces(['class']), true);
  assert.equal(personTabRowUsesTeacherFaces(['class', 'school']), false);
  assert.equal(personTabRowUsesTeacherFaces([]), false);
});

test('isClassDeskTabsRoute covers desk panes only', () => {
  assert.equal(isClassDeskTabsRoute('/class/abc'), true);
  assert.equal(isClassDeskTabsRoute('/class/abc/feed'), true);
  assert.equal(isClassDeskTabsRoute('/class/abc/student/s1'), false);
  assert.equal(isClassDeskTabsRoute('/class/abc/assignment/a1'), false);
});

test('personTabScrollX: tab 0 stays at 0', () => {
  assert.equal(
    personTabScrollX({
      tabX: 0,
      tabWidth: 80,
      rowWidth: 358,
      contentWidth: 600,
      selectedIndex: 0,
      prevIndex: null,
    }),
    0,
  );
});

test('personTabScrollX: 3-tab band centers selected; never clips glyph off left', () => {
  const row = 200;
  const tabX = 100;
  const tabWidth = 60;
  const x = personTabScrollX({
    tabX,
    tabWidth,
    rowWidth: row,
    contentWidth: 500,
    selectedIndex: 2,
    prevIndex: 1,
    collapsedWidth: 44,
  });
  assert.ok(x <= tabX, `must not scroll past selected left (x=${x} tabX=${tabX})`);
  assert.ok(x + row >= tabX + tabWidth - 0.5, 'selected right edge stays in view');
  // roughly centered
  const centerErr = Math.abs(tabX + tabWidth / 2 - (x + row / 2));
  assert.ok(centerErr < 30, `centerErr=${centerErr}`);
});

test('personTabScrollX: moving right shifts selected toward left-center of pair', () => {
  const base = {
    tabX: 120,
    tabWidth: 50,
    rowWidth: 280, // room for ~4 collapsed + selected
    contentWidth: 700,
    selectedIndex: 3,
    collapsedWidth: 44,
  };
  const right = personTabScrollX({ ...base, prevIndex: 2 });
  const left = personTabScrollX({ ...base, prevIndex: 4 });
  assert.ok(right <= left, `right=${right} left=${left}`);
  assert.ok(right <= base.tabX);
});

test('default personTabLabelMax policy is visibilityReserve (FoM lock)', () => {
  const row = 390;
  const def = personTabLabelMax(row, 8, true);
  const reserved = personTabLabelMax(row, 8, true, 'visibilityReserve');
  assert.equal(def, reserved);
});

test('CM-Linear: default and cm-linear are linear both ways; current is cubic opt-out', () => {
  assert.equal(personTabExpandEasingKind(true), 'linear');
  assert.equal(personTabExpandEasingKind(false), 'linear');
  assert.equal(personTabExpandEasingKind(true, 'cm-linear'), 'linear');
  assert.equal(personTabExpandEasingKind(false, 'cm-linear'), 'linear');
  assert.equal(personTabExpandEasingKind(true, 'current'), 'cubic-out');
  assert.equal(personTabExpandEasingKind(false, 'current'), 'cubic-in');
});

test('occupancy ceiling ≠ hug slot (short painted title)', () => {
  const row = 358;
  const occupancy = personTabLabelMax(row, 8, true, 'visibilityReserve');
  const hug = personTabTitleSlot(36, occupancy);
  assert.ok(occupancy > hug, `occupancy=${occupancy} hug=${hug}`);
  assert.notEqual(occupancy, hug);
});

test('fit painted title → no marquee; overflow → marquee (not occupancy-as-hug)', () => {
  const row = 390; // phone ~390
  const ceiling = personTabLabelMax(row, 8, true, 'visibilityReserve');
  // Assignments-scale paint that fits ceiling → zero marquee cycles
  const assignmentsPaint = 96;
  assert.ok(assignmentsPaint < ceiling, `paint=${assignmentsPaint} ceiling=${ceiling}`);
  assert.equal(personTabTitleNeedsMarquee(assignmentsPaint, ceiling), false);
  assert.equal(personTabTitleSlot(assignmentsPaint, ceiling), assignmentsPaint);
  // Long title overflows ceiling → marquee after ready
  assert.equal(personTabTitleNeedsMarquee(ceiling + 40, ceiling), true);
  assert.equal(personTabTitleSlot(ceiling + 40, ceiling), ceiling);
  // Occupancy ceiling alone is not hug — short paint must not be treated as overflow
  assert.ok(ceiling > 36);
  assert.equal(personTabTitleNeedsMarquee(36, ceiling), false);
  // Unknown / zero paint → no marquee
  assert.equal(personTabTitleNeedsMarquee(0, ceiling), false);
  assert.equal(personTabTitleNeedsMarquee(100, 0), false);
});

test('first-index scroll stays 0 even when contentWidth / tabWidth thrash (no snap driver)', () => {
  // Regression: mid-morph contentSize + live tabWidth used to re-scroll to 0 and
  // snap the outgoing label. Index 0 must ignore those inputs.
  const a = personTabScrollX({
    tabX: 0,
    tabWidth: 44,
    rowWidth: 358,
    contentWidth: 500,
    selectedIndex: 0,
    prevIndex: 2,
  });
  const b = personTabScrollX({
    tabX: 0,
    tabWidth: 120,
    rowWidth: 358,
    contentWidth: 700,
    selectedIndex: 0,
    prevIndex: 3,
  });
  assert.equal(a, 0);
  assert.equal(b, 0);
});

test('pill width range is paint/ceiling only — live layout width must not enter range', () => {
  const row = 358;
  const ceiling = personTabLabelMax(row, 5, true, 'visibilityReserve');
  const paint = 36; // Feed
  const range = personTabPillWidthRange(paint, ceiling, true);
  assert.equal(range.slot, paint);
  assert.equal(range.collapsed, PERSON_TAB_ICON_HIT);
  assert.equal(range.expanded, personTabSelectedMaxWidth(paint, true));
  // A mid-morph onLayout width (e.g. 80) must not be used as expanded endpoint.
  const midMorphLayout = 80;
  assert.notEqual(range.expanded, midMorphLayout);
  assert.equal(personTabPillWidthRange(paint, ceiling, true).expanded, range.expanded);
});

test('scroll tab width prefers hugged expanded over live collapsed onLayout', () => {
  const row = 358;
  const ceiling = personTabLabelMax(row, 5, true, 'visibilityReserve');
  const paint = 72;
  const hugged = personTabPillWidthRange(paint, ceiling, true).expanded;
  // Live onLayout while collapsed is ICON_HIT — must not win over paint.
  assert.equal(personTabScrollTabWidth(paint, ceiling, true, PERSON_TAB_ICON_HIT), hugged);
  assert.ok(hugged > PERSON_TAB_ICON_HIT);
  // Without paint yet, fall back to measured/fallback.
  assert.equal(personTabScrollTabWidth(0, ceiling, true, 91), 91);
  assert.equal(personTabScrollTabWidth(paint, 0, true, 91), 91);
});

test('scroll needed skips no-op scrollTo (esp. already at 0)', () => {
  assert.equal(personTabScrollNeeded(0, 0), false);
  assert.equal(personTabScrollNeeded(0.4, 0), false);
  assert.equal(personTabScrollNeeded(0, 12), true);
  assert.equal(personTabScrollNeeded(80, 0), true);
});

test('leading-pill morph uses scroll-then-morph enter / deferred leave — never animated-to-0', () => {
  // Entering first tab: scroll first (if needed), then arm width expand after settle.
  assert.equal(personTabScrollMotion(0, null), 'scroll-then-morph');
  assert.equal(personTabScrollMotion(0, 2), 'scroll-then-morph');
  assert.equal(personTabScrollMotion(0, 3), 'scroll-then-morph');
  // Leaving first tab: defer scroll until morph ends so leading width can CM-Linear close.
  assert.equal(personTabScrollMotion(1, 0), 'defer');
  assert.equal(personTabScrollMotion(2, 0), 'defer');
  // Mid-row: concurrent animated scroll is fine (2→3 / 2→4).
  assert.equal(personTabScrollMotion(2, 1), 'animated');
  assert.equal(personTabScrollMotion(3, 1), 'animated');
  assert.equal(personTabScrollMotion(3, 2), 'animated');
});

test('leading-pill selection locks scroll for morph window (enter or leave index 0)', () => {
  assert.equal(personTabNeedsLeadingScrollLock(0, null), true);
  assert.equal(personTabNeedsLeadingScrollLock(0, 2), true);
  assert.equal(personTabNeedsLeadingScrollLock(2, 0), true);
  assert.equal(personTabNeedsLeadingScrollLock(1, 0), true);
  assert.equal(personTabNeedsLeadingScrollLock(2, 1), false);
  assert.equal(personTabNeedsLeadingScrollLock(3, 2), false);
  assert.equal(PERSON_TAB_SCROLL_SETTLE_MS, 32);
  assert.equal(personTabLeadingScrollLockMs(true, 975), 0);
  assert.equal(personTabLeadingScrollLockMs(false, 975), 975);
  assert.equal(personTabLeadingScrollLockMs(false, 975, 32), 1007);
});
