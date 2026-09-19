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
  personTabTitleSlot,
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

test('CM-Linear: motionPack cm-linear is linear both ways; default is Current cubic', () => {
  assert.equal(personTabExpandEasingKind(true), 'cubic-out');
  assert.equal(personTabExpandEasingKind(false), 'cubic-in');
  assert.equal(personTabExpandEasingKind(true, 'current'), 'cubic-out');
  assert.equal(personTabExpandEasingKind(false, 'current'), 'cubic-in');
  assert.equal(personTabExpandEasingKind(true, 'cm-linear'), 'linear');
  assert.equal(personTabExpandEasingKind(false, 'cm-linear'), 'linear');
});

test('occupancy ceiling ≠ hug slot (short painted title)', () => {
  const row = 358;
  const occupancy = personTabLabelMax(row, 8, true, 'visibilityReserve');
  const hug = personTabTitleSlot(36, occupancy);
  assert.ok(occupancy > hug, `occupancy=${occupancy} hug=${hug}`);
  assert.notEqual(occupancy, hug);
});
