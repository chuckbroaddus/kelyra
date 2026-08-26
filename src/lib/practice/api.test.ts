import assert from 'node:assert/strict';
import test from 'node:test';

import { isReusableOpenPractice, reusablePracticeKey } from './reuse.ts';

test('isReusableOpenPractice only matches open practice for that student and skill', () => {
  const want = { studentId: 'st-1', classId: 'cl-1', skillId: 'sk-exp' };
  const open = {
    studentId: 'st-1',
    classId: 'cl-1',
    skillId: 'sk-exp',
    kind: 'practice',
    status: 'assigned',
  };
  assert.equal(isReusableOpenPractice(open, want), true);
  assert.equal(isReusableOpenPractice({ ...open, status: 'started' }, want), true);
  assert.equal(isReusableOpenPractice({ ...open, status: 'graded' }, want), false);
  assert.equal(isReusableOpenPractice({ ...open, skillId: 'other' }, want), false);
  assert.equal(isReusableOpenPractice({ ...open, kind: 'lesson' }, want), false);
  assert.equal(reusablePracticeKey('st-1', 'sk-exp'), 'st-1:sk-exp');
});
