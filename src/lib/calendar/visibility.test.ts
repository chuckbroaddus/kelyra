import assert from 'node:assert/strict';
import test from 'node:test';

import {
  composeEventInstant,
  defaultCalendarPublished,
  defaultKindForSeat,
  visibilityCaption,
} from './visibility.ts';

test('default hide quiz/test/midterm/final', () => {
  for (const c of ['quiz', 'test', 'midterm', 'final', 'Quiz']) {
    assert.equal(defaultCalendarPublished(c), false);
  }
});

test('default publish homework/practice/lesson', () => {
  for (const c of ['homework', 'practice', 'lesson', '']) {
    assert.equal(defaultCalendarPublished(c), true);
  }
});

test('visibility captions are honest (CAL-23)', () => {
  assert.match(visibilityCaption('student_teachers', 'absence'), /teachers/i);
  assert.match(visibilityCaption('student_teachers', 'absence'), /not the student/i);
  assert.match(visibilityCaption('school'), /school/i);
  assert.match(visibilityCaption('class'), /class/i);
  assert.match(visibilityCaption('self'), /only you/i);
});

test('default create kind by hat', () => {
  assert.equal(defaultKindForSeat('office'), 'school');
  assert.equal(defaultKindForSeat('teacher', { classId: 'c1' }), 'class');
  assert.equal(defaultKindForSeat('teacher'), 'personal');
  assert.equal(defaultKindForSeat('student'), 'personal');
  assert.equal(defaultKindForSeat('parent', { childStudentId: 's1' }), 'absence');
  assert.equal(defaultKindForSeat('parent'), 'personal');
});

test('composeEventInstant all-day keeps civil date', () => {
  assert.equal(composeEventInstant('2026-09-16', null, true), '2026-09-16T12:00:00.000Z');
});
