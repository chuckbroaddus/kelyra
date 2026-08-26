import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSON_TAB_GAP,
  PERSON_TAB_GLYPH,
  PERSON_TAB_HIT_PAD_X,
  PERSON_TAB_ROW_PAD_END,
  personTabAvailableTitleWidth,
  personTabLabelMax,
  personTabRowHasGlyph,
  personTabSelectedMaxWidth,
  personTabTitleSlot,
  personTabRowUsesTeacherFaces,
} from './personTabsLayout.ts';

test('available title width subtracts glyph, gap, hit pad, and row end', () => {
  const row = 360;
  const chrome = PERSON_TAB_GLYPH + PERSON_TAB_GAP + PERSON_TAB_HIT_PAD_X * 2 + PERSON_TAB_ROW_PAD_END;
  assert.equal(personTabAvailableTitleWidth(row), row - chrome);
  assert.equal(personTabAvailableTitleWidth(0), 0);
});

test('one tab may use the leftover row after the glyph; several stay at half', () => {
  const row = 360;
  const available = personTabAvailableTitleWidth(row);
  assert.equal(personTabLabelMax(row, 1), available);
  assert.equal(personTabLabelMax(row, 0), available);
  assert.equal(personTabLabelMax(row, 2), Math.floor(row * 0.5));
  assert.ok(personTabLabelMax(row, 1) > personTabLabelMax(row, 3));
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
