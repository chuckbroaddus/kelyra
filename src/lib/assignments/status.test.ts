import assert from 'node:assert/strict';
import test from 'node:test';

import {
  asSubmissionStatus,
  gradebookStatusIcon,
  isAwaitingGrade,
  isFinishedWork,
  isGraded,
  isOpenWork,
  submissionStatusLabel,
} from './status.ts';

test('legacy submission statuses map onto the four-state lifecycle', () => {
  assert.equal(asSubmissionStatus('submitted'), 'completed');
  assert.equal(asSubmissionStatus('draft_scored'), 'completed');
  assert.equal(asSubmissionStatus('approved'), 'graded');
  assert.equal(asSubmissionStatus('assigned'), 'assigned');
  assert.equal(asSubmissionStatus('started'), 'started');
  assert.equal(asSubmissionStatus('in_progress'), 'started');
  assert.equal(asSubmissionStatus('complete'), 'completed');
  assert.equal(asSubmissionStatus('done'), 'graded');
});

test('labels are Assigned, Started, Completed, Graded', () => {
  assert.equal(submissionStatusLabel('assigned'), 'Assigned');
  assert.equal(submissionStatusLabel('started'), 'Started');
  assert.equal(submissionStatusLabel('completed'), 'Completed');
  assert.equal(submissionStatusLabel('graded'), 'Graded');
  assert.equal(submissionStatusLabel('submitted'), 'Completed');
  assert.equal(submissionStatusLabel('approved'), 'Graded');
});

test('grade book shows status icons until graded', () => {
  assert.equal(gradebookStatusIcon('assigned'), 'statusAssigned');
  assert.equal(gradebookStatusIcon('started'), 'statusStarted');
  assert.equal(gradebookStatusIcon('completed'), 'statusCompleted');
  assert.equal(gradebookStatusIcon('submitted'), 'statusCompleted');
  assert.equal(gradebookStatusIcon('graded'), null);
  assert.equal(gradebookStatusIcon(null), null);
});

test('open / awaiting / graded gates', () => {
  assert.equal(isOpenWork('assigned'), true);
  assert.equal(isOpenWork('started'), true);
  assert.equal(isOpenWork('completed'), false);
  assert.equal(isAwaitingGrade('completed'), true);
  assert.equal(isAwaitingGrade('draft_scored'), true);
  assert.equal(isGraded('graded'), true);
  assert.equal(isGraded('approved'), true);
  assert.equal(isFinishedWork('submitted'), true);
  assert.equal(isFinishedWork('started'), false);
});
