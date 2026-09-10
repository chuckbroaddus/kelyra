import assert from 'node:assert/strict';
import test from 'node:test';

import {
  availableChromeSeats,
  canChooseChromeSeat,
  defaultChromeSeat,
  isOfficeChromeRole,
  resolveStaffChromeRole,
} from './seat.ts';

test('canChooseChromeSeat for office+also_teacher and staff+also_parent', () => {
  assert.equal(canChooseChromeSeat({ role: 'administrator', also_teacher: true }), true);
  assert.equal(canChooseChromeSeat({ role: 'superintendent', also_teacher: true }), true);
  assert.equal(canChooseChromeSeat({ role: 'administrator', also_teacher: false }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher' }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher', also_administrator: true }), false);
  assert.equal(canChooseChromeSeat({ role: 'parent' }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher', parent_id: 'p1' }), true);
  assert.equal(
    canChooseChromeSeat({ role: 'administrator', also_teacher: true, parent_id: 'p1' }),
    true,
  );
  assert.equal(canChooseChromeSeat({ role: 'administrator', parent_id: 'p1' }), true);
});

test('availableChromeSeats: Teacher|Parent and Office|Teacher|Parent', () => {
  assert.deepEqual(availableChromeSeats({ role: 'teacher', parent_id: 'p1' }), [
    'teacher',
    'parent',
  ]);
  assert.deepEqual(
    availableChromeSeats({ role: 'administrator', also_teacher: true, parent_id: 'p1' }),
    ['office', 'teacher', 'parent'],
  );
  assert.deepEqual(availableChromeSeats({ role: 'administrator', also_teacher: true }), [
    'office',
    'teacher',
  ]);
  assert.deepEqual(availableChromeSeats({ role: 'teacher' }), ['teacher']);
  assert.deepEqual(availableChromeSeats({ role: 'administrator' }), ['office']);
  assert.deepEqual(availableChromeSeats({ role: 'parent', parent_id: 'p1' }), []);
});

test('defaultChromeSeat prefers job-of-record, never Parent', () => {
  assert.equal(defaultChromeSeat({ role: 'administrator', also_teacher: true, parent_id: 'p1' }), 'office');
  assert.equal(defaultChromeSeat({ role: 'teacher', parent_id: 'p1' }), 'teacher');
  assert.equal(defaultChromeSeat({ role: 'administrator', parent_id: 'p1' }), 'office');
});

test('resolveStaffChromeRole: also_teacher does not force teacher without seat', () => {
  const dual = { role: 'administrator' as const, also_teacher: true };
  assert.equal(resolveStaffChromeRole(dual, null), 'administrator');
  assert.equal(resolveStaffChromeRole(dual, 'office'), 'administrator');
  assert.equal(resolveStaffChromeRole(dual, 'teacher'), 'teacher');

  const superDual = { role: 'superintendent' as const, also_teacher: true };
  assert.equal(resolveStaffChromeRole(superDual, null), 'superintendent');
  assert.equal(resolveStaffChromeRole(superDual, 'teacher'), 'teacher');
});

test('resolveStaffChromeRole: also_parent parent seat flips to parent chrome', () => {
  const teacherParent = { role: 'teacher' as const, parent_id: 'p1' };
  assert.equal(resolveStaffChromeRole(teacherParent, null), 'teacher');
  assert.equal(resolveStaffChromeRole(teacherParent, 'teacher'), 'teacher');
  assert.equal(resolveStaffChromeRole(teacherParent, 'parent'), 'parent');
  assert.equal(resolveStaffChromeRole(teacherParent, 'office'), 'teacher');

  const triple = {
    role: 'administrator' as const,
    also_teacher: true,
    parent_id: 'p1',
  };
  assert.equal(resolveStaffChromeRole(triple, null), 'administrator');
  assert.equal(resolveStaffChromeRole(triple, 'office'), 'administrator');
  assert.equal(resolveStaffChromeRole(triple, 'teacher'), 'teacher');
  assert.equal(resolveStaffChromeRole(triple, 'parent'), 'parent');
});

test('resolveStaffChromeRole: pure teacher and pure office', () => {
  assert.equal(resolveStaffChromeRole({ role: 'teacher' }, null), 'teacher');
  assert.equal(resolveStaffChromeRole({ role: 'teacher' }, 'office'), 'teacher');
  assert.equal(resolveStaffChromeRole({ role: 'administrator' }, null), 'administrator');
  assert.equal(resolveStaffChromeRole({ role: 'superintendent' }, 'teacher'), 'superintendent');
});

test('isOfficeChromeRole matches chrome.role seats only', () => {
  assert.equal(isOfficeChromeRole('superintendent'), true);
  assert.equal(isOfficeChromeRole('administrator'), true);
  assert.equal(isOfficeChromeRole('teacher'), false);
  assert.equal(isOfficeChromeRole('student'), false);
  assert.equal(isOfficeChromeRole('parent'), false);
});
