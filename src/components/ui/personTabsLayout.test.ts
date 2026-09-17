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
  personTabLabelMax,
  personTabRowHasGlyph,
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

test('one tab may use the leftover row after the glyph; several stay at half (fraction)', () => {
  const row = 360;
  const available = personTabAvailableTitleWidth(row);
  assert.equal(personTabLabelMax(row, 1), available);
  assert.equal(personTabLabelMax(row, 0), available);
  assert.equal(personTabLabelMax(row, 2), Math.floor(row * 0.5));
  assert.ok(personTabLabelMax(row, 1) > personTabLabelMax(row, 3));
});

test('visibilityReserve hugs but keeps ≥3 tabs on phone ~358 scroller', () => {
  const row = 358;
  const label = personTabLabelMax(row, 8, true, 'visibilityReserve');
  const selected = personTabSelectedMaxWidth(label, true);
  const others = 2 * PERSON_TAB_ICON_HIT + 2 * PERSON_TAB_ROW_GAP;
  assert.ok(selected + others + PERSON_TAB_ROW_PAD_END <= row + 1, `selected=${selected} others=${others}`);
  // Hug is not the old half-row SoT when half would steal the third tab
  const half = Math.floor(row * 0.5);
  assert.ok(label <= half || selected + others <= row);
  assert.ok(label > 0);
});

test('visibilityReserve two-tab keeps both visible (DeskSpanTabs)', () => {
  const row = 358;
  const label = personTabLabelMax(row, 2, true, 'visibilityReserve');
  const selected = personTabSelectedMaxWidth(label, true);
  const other = PERSON_TAB_ICON_HIT + PERSON_TAB_ROW_GAP;
  assert.ok(selected + other + PERSON_TAB_ROW_PAD_END <= row + 1);
});

test('web ≥720 visibilityReserve still ≥3 with room to spare', () => {
  const row = 720;
  const label = personTabLabelMax(row, 8, true, 'visibilityReserve');
  const selected = personTabSelectedMaxWidth(label, true);
  const others = 2 * PERSON_TAB_ICON_HIT + 2 * PERSON_TAB_ROW_GAP;
  assert.ok(selected + others + PERSON_TAB_ROW_PAD_END <= row);
  assert.ok(label > personTabLabelMax(358, 8, true, 'visibilityReserve'));
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
  assert.equal(personTabRowUsesTeacherFaces(['all', 'class']), false);
  assert.equal(personTabRowUsesTeacherFaces(['class', 'teachers', 'parents']), false);
  assert.equal(personTabRowUsesTeacherFaces([]), false);
});

test('isClassDeskTabsRoute covers desk panes only', () => {
  assert.equal(isClassDeskTabsRoute('/class/abc'), true);
  assert.equal(isClassDeskTabsRoute('/class/abc/feed'), true);
  assert.equal(isClassDeskTabsRoute('/class/abc/gradebook'), true);
  assert.equal(isClassDeskTabsRoute('/class/abc/setup'), true);
  assert.equal(isClassDeskTabsRoute('/class/abc/student/s1'), false);
  assert.equal(isClassDeskTabsRoute('/class/abc/assignment/a1'), false);
  assert.equal(isClassDeskTabsRoute('/class/abc/review/r1'), false);
  assert.equal(isClassDeskTabsRoute('/class/abc/parent/p1'), false);
  assert.equal(isClassDeskTabsRoute('/class/abc/parents'), true);
});
