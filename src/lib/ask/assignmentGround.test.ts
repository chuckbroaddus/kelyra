import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearAskAssignmentGround,
  clearAskGroundOnActiveClassChange,
  effectiveAskAssignmentGround,
  getAskParentChildId,
  isAskJustChatting,
  peekAskPageGround,
  resetAskGroundSessionForTests,
  setAskJustChatting,
  setAskPageGround,
  setAskParentChildId,
  setAskSessionGround,
  studentSoftGroundChip,
} from './assignmentGround.ts';

test('ASK-P0-06 tray / no page assignment: no hard-assume pack', () => {
  resetAskGroundSessionForTests();
  assert.equal(effectiveAskAssignmentGround('student'), null);
  assert.equal(effectiveAskAssignmentGround('parent'), null);
  assert.equal(peekAskPageGround(), null);
});

test('ASK-P0-04 student soft ground + correct clears prior inject id', () => {
  resetAskGroundSessionForTests();
  setAskPageGround({ assignmentId: 'a1', title: 'FoM 1.2' });
  assert.equal(effectiveAskAssignmentGround('student')?.assignmentId, 'a1');
  assert.equal(studentSoftGroundChip()?.title, 'FoM 1.2');
  setAskSessionGround({ assignmentId: 'a2', title: 'FoM 1.3', source: 'picker' });
  assert.equal(effectiveAskAssignmentGround('student')?.assignmentId, 'a2');
  clearAskAssignmentGround();
  setAskJustChatting();
  assert.equal(effectiveAskAssignmentGround('student'), null);
  assert.equal(isAskJustChatting(), true);
});

test('ASK-P0-05 parent never soft-assumes page ground', () => {
  resetAskGroundSessionForTests();
  setAskPageGround({ assignmentId: 'a1', title: 'FoM 1.2' });
  assert.equal(effectiveAskAssignmentGround('parent'), null);
  setAskSessionGround({ assignmentId: 'a1', title: 'FoM 1.2', source: 'explicit' });
  assert.equal(effectiveAskAssignmentGround('parent')?.assignmentId, 'a1');
});

test('ASK-P0-07 / ASK-P1-05 twins fail closed: child switch clears assignment ground', () => {
  resetAskGroundSessionForTests();
  setAskParentChildId('saydee');
  setAskSessionGround({ assignmentId: 'a1', title: 'FoM 1.2', source: 'explicit' });
  assert.equal(effectiveAskAssignmentGround('parent')?.assignmentId, 'a1');
  setAskParentChildId('sydnee');
  assert.equal(effectiveAskAssignmentGround('parent'), null);
  assert.equal(isAskJustChatting(), false);
  assert.equal(getAskParentChildId(), 'sydnee');
});

test('ASK-P0-08 dual-hat ground helper is seat-scoped (no seat merge)', () => {
  resetAskGroundSessionForTests();
  setAskPageGround({ assignmentId: 'a1', title: 'FoM 1.2' });
  assert.equal(effectiveAskAssignmentGround('student')?.assignmentId, 'a1');
  assert.equal(effectiveAskAssignmentGround('teacher'), null);
  assert.equal(effectiveAskAssignmentGround('parent'), null);
});

test('MULT-01 class switch / activeClassId change clears session ground and page candidate', () => {
  resetAskGroundSessionForTests();
  setAskPageGround({ assignmentId: 'prior-class-a', title: 'Old class work' });
  setAskSessionGround({ assignmentId: 'prior-class-a', title: 'Old class work', source: 'picker' });
  assert.equal(effectiveAskAssignmentGround('student')?.assignmentId, 'prior-class-a');
  assert.equal(peekAskPageGround()?.assignmentId, 'prior-class-a');

  clearAskGroundOnActiveClassChange();

  assert.equal(effectiveAskAssignmentGround('student'), null);
  assert.equal(effectiveAskAssignmentGround('parent'), null);
  assert.equal(studentSoftGroundChip(), null);
  assert.equal(peekAskPageGround(), null);
  assert.equal(isAskJustChatting(), false);
});

test('MULT-01 class switch clear is not Just chatting (chattingOnly stays false)', () => {
  resetAskGroundSessionForTests();
  setAskSessionGround({ assignmentId: 'a1', title: 'FoM 1.2', source: 'explicit' });
  clearAskGroundOnActiveClassChange();
  assert.equal(isAskJustChatting(), false);
  assert.equal(effectiveAskAssignmentGround('parent'), null);
});
