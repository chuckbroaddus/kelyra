import assert from 'node:assert/strict';
import test from 'node:test';

import { isFinishedWork, isOpenWork, submissionStatusLabel } from '../assignments/status.ts';
import {
  filterStudentWork,
  showStudentStatusIcon,
  sortStudentDone,
  sortStudentTodo,
  studentGradeLine,
  studentStatusIcon,
  studentWorkDateLine,
  type StudentWorkItem,
} from './work.ts';

function item(partial: Partial<StudentWorkItem> & Pick<StudentWorkItem, 'submissionId' | 'title' | 'status'>): StudentWorkItem {
  return {
    dueAt: null,
    submittedAt: null,
    classId: 'c1',
    className: 'Math',
    classIcon: null,
    approvedScore: null,
    scoreMark: null,
    ...partial,
  };
}

test('to-do lists the soonest due first; missing dates sink', () => {
  const rows = sortStudentTodo([
    item({ submissionId: 'b', title: 'B', status: 'assigned', dueAt: '2026-09-10T12:00:00Z' }),
    item({ submissionId: 'a', title: 'A', status: 'assigned', dueAt: '2026-09-01T12:00:00Z' }),
    item({ submissionId: 'c', title: 'C', status: 'started' }),
  ]);
  assert.deepEqual(
    rows.map((row) => row.submissionId),
    ['a', 'b', 'c'],
  );
});

test('done lists the most recently turned in first', () => {
  const rows = sortStudentDone([
    item({ submissionId: 'old', title: 'Old', status: 'completed', submittedAt: '2026-08-01T12:00:00Z' }),
    item({ submissionId: 'new', title: 'New', status: 'graded', submittedAt: '2026-08-20T12:00:00Z' }),
  ]);
  assert.equal(rows[0]?.submissionId, 'new');
});

test('status icon sits on assigned, started, completed, and graded', () => {
  assert.equal(showStudentStatusIcon('assigned'), true);
  assert.equal(showStudentStatusIcon('started'), true);
  assert.equal(showStudentStatusIcon('completed'), true);
  assert.equal(showStudentStatusIcon('graded'), true);
  assert.equal(studentStatusIcon('assigned'), 'statusAssigned');
  assert.equal(studentStatusIcon('started'), 'statusStarted');
  assert.equal(studentStatusIcon('completed'), 'statusCompleted');
  assert.equal(studentStatusIcon('graded'), 'statusGraded');
});

test('date line flips from due to turned in after submit', () => {
  assert.equal(
    studentWorkDateLine({ status: 'assigned', dueAt: '2026-09-01T12:00:00Z', submittedAt: null }).startsWith('Due '),
    true,
  );
  assert.equal(
    studentWorkDateLine({
      status: 'completed',
      dueAt: '2026-09-01T12:00:00Z',
      submittedAt: '2026-08-20T12:00:00Z',
    }).startsWith('Turned in '),
    true,
  );
});

test('class filter and pane split', () => {
  const rows = [
    item({ submissionId: '1', title: 'Open math', status: 'assigned', classId: 'math', dueAt: '2026-09-02T00:00:00Z' }),
    item({ submissionId: '2', title: 'Done math', status: 'completed', classId: 'math', submittedAt: '2026-08-21T00:00:00Z' }),
    item({ submissionId: '3', title: 'Open art', status: 'started', classId: 'art', dueAt: '2026-09-01T00:00:00Z' }),
  ];
  const todoAll = filterStudentWork(rows, 'todo', 'all', isOpenWork, isFinishedWork);
  assert.deepEqual(
    todoAll.map((row) => row.submissionId),
    ['3', '1'],
  );
  const doneMath = filterStudentWork(rows, 'done', 'math', isOpenWork, isFinishedWork);
  assert.deepEqual(
    doneMath.map((row) => row.submissionId),
    ['2'],
  );
});

test('grade line shows a mark only after graded', () => {
  assert.equal(
    studentGradeLine({ status: 'completed', approvedScore: 90, scoreMark: 'numeric' }, () => '90', submissionStatusLabel),
    'Completed',
  );
  assert.equal(
    studentGradeLine({ status: 'graded', approvedScore: 90, scoreMark: 'numeric' }, (_mark, score) => String(score), submissionStatusLabel),
    '90',
  );
});
