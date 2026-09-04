import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canChooseChromeSeat,
  isOfficeChromeRole,
  resolveStaffChromeRole,
} from './seat.ts';

test('canChooseChromeSeat only for office job-of-record with also_teacher', () => {
  assert.equal(canChooseChromeSeat({ role: 'administrator', also_teacher: true }), true);
  assert.equal(canChooseChromeSeat({ role: 'superintendent', also_teacher: true }), true);
  assert.equal(canChooseChromeSeat({ role: 'administrator', also_teacher: false }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher' }), false);
  assert.equal(canChooseChromeSeat({ role: 'teacher', also_administrator: true }), false);
  assert.equal(canChooseChromeSeat({ role: 'parent' }), false);
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
});
