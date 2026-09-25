import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  OFFICE_STUDENT_TABS,
  TEACHER_STUDENT_TABS,
  studentTabFromParam,
  studentTabsForChromeRole,
  studentTabsLoadTeacherData,
  studentTabsShowAssignPlus,
} from './studentTabs.ts';

const TEACHER_ORDER = ['focus', 'history', 'work', 'practice', 'parents', 'details'] as const;
const OFFICE_ORDER = ['classes', 'parents', 'details'] as const;

test('superintendent/office student tabs are exactly classes, parents, details', () => {
  assert.deepEqual(
    OFFICE_STUDENT_TABS.map((t) => t.key),
    [...OFFICE_ORDER],
  );
  for (const role of ['superintendent', 'administrator'] as const) {
    assert.deepEqual(
      studentTabsForChromeRole(role).map((t) => t.key),
      [...OFFICE_ORDER],
    );
    assert.equal(studentTabsShowAssignPlus(role), false);
    assert.equal(studentTabsLoadTeacherData(role), false);
    // Default pane stays Details even though Classes is index 0.
    assert.equal(studentTabFromParam(role, undefined), 'details');
    assert.equal(studentTabFromParam(role, null), 'details');
    assert.equal(studentTabFromParam(role, 'details'), 'details');
    assert.equal(studentTabFromParam(role, 'parents'), 'parents');
    assert.equal(studentTabFromParam(role, 'classes'), 'classes');
    // Hidden teacher tab deep-link falls back to details.
    assert.equal(studentTabFromParam(role, 'focus'), 'details');
    assert.equal(studentTabFromParam(role, 'work'), 'details');
    assert.equal(studentTabFromParam(role, 'practice'), 'details');
    assert.equal(studentTabFromParam(role, 'history'), 'details');
  }
});

test('teacher student tabs keep six keys and assign plus', () => {
  assert.deepEqual(
    TEACHER_STUDENT_TABS.map((t) => t.key),
    [...TEACHER_ORDER],
  );
  assert.deepEqual(
    studentTabsForChromeRole('teacher').map((t) => t.key),
    [...TEACHER_ORDER],
  );
  assert.equal(studentTabsShowAssignPlus('teacher'), true);
  assert.equal(studentTabsLoadTeacherData('teacher'), true);
  assert.equal(studentTabFromParam('teacher', undefined), 'focus');
  assert.equal(studentTabFromParam('teacher', 'details'), 'details');
  assert.equal(studentTabFromParam('teacher', 'bogus'), 'focus');
});

test('unknown/none role uses teacher row (fail open to full desk for teach paths)', () => {
  assert.deepEqual(
    studentTabsForChromeRole(null).map((t) => t.key),
    [...TEACHER_ORDER],
  );
  assert.equal(studentTabsShowAssignPlus(null), true);
});

test('source wiring: student screen uses seat helper + chrome.role, not bare STUDENT_TABS', () => {
  const root = process.cwd();
  const screen = readFileSync(
    join(root, 'src/app/class/[id]/student/[studentId].tsx'),
    'utf8',
  );
  assert.match(screen, /studentTabsForChromeRole/);
  assert.match(screen, /studentTabFromParam/);
  assert.match(screen, /studentTabsShowAssignPlus/);
  assert.match(screen, /useChrome/);
  assert.match(screen, /chrome\.role/);
  assert.doesNotMatch(screen, /const STUDENT_TABS\s*=/);
  assert.match(screen, /studentTabsLoadTeacherData/);
});
