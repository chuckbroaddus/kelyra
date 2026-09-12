import assert from 'node:assert/strict';
import test from 'node:test';

import { calendarSeatForChrome } from './seat.ts';

test('calendarSeatForChrome maps chrome role to p_seat only', () => {
  assert.equal(calendarSeatForChrome('teacher'), 'teacher');
  assert.equal(calendarSeatForChrome('student'), 'student');
  assert.equal(calendarSeatForChrome('parent'), 'parent');
  assert.equal(calendarSeatForChrome('superintendent'), 'office');
  assert.equal(calendarSeatForChrome('administrator'), 'office');
  assert.equal(calendarSeatForChrome(null), null);
  assert.equal(calendarSeatForChrome(undefined), null);
  assert.equal(calendarSeatForChrome('unknown'), null);
});

test('calendarSeatForChrome never ORs hats (declared chrome only)', () => {
  // Dual-hat is a chrome concern: parent chrome stays parent even if also_teacher.
  assert.equal(calendarSeatForChrome('parent'), 'parent');
  assert.notEqual(calendarSeatForChrome('parent'), 'teacher');
  assert.equal(calendarSeatForChrome('teacher'), 'teacher');
  assert.notEqual(calendarSeatForChrome('teacher'), 'office');
});
