import assert from 'node:assert/strict';
import test from 'node:test';

import { eventMenuActions } from './eventActions.ts';
import type { CalendarItem } from './types.ts';

function item(partial: Partial<CalendarItem>): CalendarItem {
  return {
    source: 'event',
    id: 'e1',
    calendarId: 'cal1',
    title: 'Event',
    startsAt: '2026-09-16T12:00:00.000Z',
    endsAt: null,
    allDay: true,
    category: 'class',
    roleTint: 'academic',
    classId: 'c1',
    studentId: null,
    visibility: 'class',
    isHidden: false,
    isReadOnly: false,
    isDraft: false,
    deepLink: '/calendar?event=e1',
    ...partial,
  };
}

test('assignment projection is Open assignment only (no calendar delete)', () => {
  const actions = eventMenuActions(
    'teacher',
    item({
      source: 'assignment',
      category: 'quiz',
      visibility: 'hidden',
      isHidden: true,
      deepLink: '/class/c1/assignment/a1',
    }),
  );
  assert.deepEqual(actions.map((a) => a.key), ['open-assignment']);
  assert.equal(actions.some((a) => a.key === 'delete'), false);
});

test('teacher cannot delete office school events (MG-A + reason)', () => {
  const actions = eventMenuActions(
    'teacher',
    item({ category: 'school', visibility: 'school', classId: null }),
  );
  const del = actions.find((a) => a.key === 'delete');
  assert.ok(del);
  assert.equal(del.disabled, true);
  assert.match(del.reason ?? '', /Managed by office/);
  assert.equal(actions.some((a) => a.key === 'edit'), false);
});

test('office can edit/delete school events', () => {
  const actions = eventMenuActions(
    'office',
    item({ category: 'school', visibility: 'school', classId: null }),
  );
  assert.ok(actions.some((a) => a.key === 'edit'));
  assert.ok(actions.some((a) => a.key === 'delete' && !a.disabled));
});

test('teacher views parent absence only (no edit/delete)', () => {
  const actions = eventMenuActions(
    'teacher',
    item({
      category: 'absence',
      visibility: 'student_teachers',
      studentId: 'child-a',
      classId: null,
    }),
  );
  assert.deepEqual(actions.map((a) => a.key), ['view']);
});

test('parent can edit/delete absence', () => {
  const actions = eventMenuActions(
    'parent',
    item({
      category: 'absence',
      visibility: 'student_teachers',
      studentId: 'child-a',
      classId: null,
    }),
  );
  assert.ok(actions.some((a) => a.key === 'edit'));
  assert.ok(actions.some((a) => a.key === 'delete' && a.danger));
});
