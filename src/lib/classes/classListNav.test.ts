import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  classListRowNavTarget,
  classListRowPressable,
  type ClassListEntryPoint,
} from './classListNav.ts';

const OFFICE = ['superintendent', 'administrator'] as const;
const TEACHER = 'teacher';

test('main Classes list stays pressable and navigates for superintendent', () => {
  for (const role of OFFICE) {
    assert.equal(classListRowPressable('main-classes', role), true);
    assert.equal(classListRowNavTarget('main-classes', role, 'c1'), '/admin/class/c1');
  }
  assert.equal(classListRowPressable('main-classes', TEACHER), true);
  assert.equal(classListRowNavTarget('main-classes', TEACHER, 'c1'), '/class/c1');
  assert.equal(classListRowPressable('main-classes', null), true);
  assert.equal(classListRowNavTarget('main-classes', null, 'c1'), '/class/c1');
});

test('parent Classes tab: office rows not pressable, no nav target; teacher pressable', () => {
  for (const role of OFFICE) {
    assert.equal(classListRowPressable('parent-classes-tab', role), false);
    assert.equal(classListRowNavTarget('parent-classes-tab', role, 'c1'), null);
  }
  assert.equal(classListRowPressable('parent-classes-tab', TEACHER), true);
  assert.equal(classListRowNavTarget('parent-classes-tab', TEACHER, 'c1'), '/class/c1');
});

test('student Classes tab: office rows not pressable, no nav target', () => {
  for (const role of OFFICE) {
    assert.equal(classListRowPressable('student-classes-tab', role), false);
    assert.equal(classListRowNavTarget('student-classes-tab', role, 'c9'), null);
  }
  // Teacher seat would still be pressable if shown (teacher view has no Classes tab).
  assert.equal(classListRowPressable('student-classes-tab', TEACHER), true);
  assert.equal(classListRowNavTarget('student-classes-tab', TEACHER, 'c9'), '/class/c9');
});

test('empty class id never yields a target', () => {
  const points: ClassListEntryPoint[] = ['main-classes', 'parent-classes-tab', 'student-classes-tab'];
  for (const point of points) {
    assert.equal(classListRowNavTarget(point, TEACHER, ''), null);
  }
});

test('source wiring: parent + student + home use classListNav helpers', () => {
  const root = process.cwd();
  const parent = readFileSync(join(root, 'src/app/class/[id]/parent/[parentId].tsx'), 'utf8');
  const student = readFileSync(join(root, 'src/app/class/[id]/student/[studentId].tsx'), 'utf8');
  const home = readFileSync(join(root, 'src/app/index.tsx'), 'utf8');

  assert.match(parent, /classListRowNavTarget/);
  assert.match(parent, /parent-classes-tab/);
  assert.match(parent, /useChrome/);
  assert.match(parent, /chrome\.role/);

  assert.match(student, /classListRowNavTarget|classListRowPressable/);
  assert.match(student, /student-classes-tab/);
  assert.match(student, /tab === 'classes'/);

  assert.match(home, /classListRowNavTarget/);
  assert.match(home, /main-classes/);
});
