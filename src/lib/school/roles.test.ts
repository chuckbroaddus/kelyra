import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldLoadTeacherRow } from './roles.ts';

test('missing profile does not load a teachers row', () => {
  assert.equal(shouldLoadTeacherRow(null), false);
  assert.equal(shouldLoadTeacherRow(undefined), false);
});

test('student and parent profiles do not load a teachers row', () => {
  assert.equal(shouldLoadTeacherRow({ role: 'student' }), false);
  assert.equal(shouldLoadTeacherRow({ role: 'parent' }), false);
});

test('staff and teacher profiles may load an existing teachers row', () => {
  assert.equal(shouldLoadTeacherRow({ role: 'teacher' }), true);
  assert.equal(shouldLoadTeacherRow({ role: 'administrator' }), true);
  assert.equal(shouldLoadTeacherRow({ role: 'superintendent' }), true);
  assert.equal(shouldLoadTeacherRow({ role: 'parent', also_teacher: true }), true);
});
