import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAskInstructions } from './askPrompt.ts';

const ctx = (role: string) => ({
  role,
  displayName: null,
  handle: null,
  classId: null,
  className: null,
  classCount: 1,
  studentId: null,
  screen: 'home',
});

test('teacher seat is told to solve, never refuse (eval A04 "Refused." regression)', () => {
  const t = buildAskInstructions({ role: 'teacher', toolNames: [], context: ctx('teacher') });
  assert.match(t, /Never refuse a teacher/);
  assert.match(t, /Teachers may ask you to solve/);
  // the student refusal line is scoped to the student seat, not a bare "Student:" bullet in shared rules
  assert.doesNotMatch(t, /Student: refuse solve/);
  assert.match(t, /Student seat only: refuse to solve graded work/);
});

test('student seat keeps the graded-work refusal', () => {
  const s = buildAskInstructions({ role: 'student', toolNames: [], context: ctx('student') });
  assert.match(s, /Never solve graded class work/);
  assert.match(s, /Can.t help with that/);
});
