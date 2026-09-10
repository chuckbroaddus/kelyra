import assert from 'node:assert/strict';
import test from 'node:test';

import { computeTeacherStudentOveralls } from './teacherOveralls.ts';

test('teacher overalls: published weights use syllabusAverage engine', () => {
  const overalls = computeTeacherStudentOveralls({
    studentIds: ['s1', 's2'],
    assignments: [
      { id: 'h1', title: 'HW1', category: 'homework', include_in_average: true, term: 'q1' },
      { id: 't1', title: 'Test1', category: 'test', include_in_average: true, term: 'q1' },
    ],
    cellsForStudent: (studentId) => {
      if (studentId === 's1') {
        return [
          { assignmentId: 'h1', approvedScore: 100, status: 'graded', approved: true },
          { assignmentId: 't1', approvedScore: 80, status: 'graded', approved: true },
        ];
      }
      return [
        { assignmentId: 'h1', approvedScore: 50, status: 'graded', approved: true },
        { assignmentId: 't1', approvedScore: 50, status: 'graded', approved: true },
      ];
    },
    syllabus: {
      status: 'published',
      policies: { missing_as_zero: false, rounding: 'nearest_whole' },
      categories: [
        { key: 'homework', label: 'Homework', weight_percent: 50, sort_order: 0 },
        { key: 'test', label: 'Tests', weight_percent: 50, sort_order: 1 },
      ],
    },
    termFilter: 'q1',
  });
  assert.equal(overalls.s1, 90);
  assert.equal(overalls.s2, 50);
});

test('teacher overalls: unpublished / incomplete weights stay blank', () => {
  const draft = computeTeacherStudentOveralls({
    studentIds: ['s1'],
    assignments: [{ id: 'h1', title: 'HW1', category: 'homework' }],
    cellsForStudent: () => [
      { assignmentId: 'h1', approvedScore: 100, status: 'graded', approved: true },
    ],
    syllabus: {
      status: 'draft',
      categories: [{ key: 'homework', label: 'Homework', weight_percent: 100 }],
    },
  });
  assert.equal(draft.s1, null);

  const none = computeTeacherStudentOveralls({
    studentIds: ['s1'],
    assignments: [{ id: 'h1', title: 'HW1', category: 'homework' }],
    cellsForStudent: () => [
      { assignmentId: 'h1', approvedScore: 100, status: 'graded', approved: true },
    ],
    syllabus: null,
  });
  assert.equal(none.s1, null);
});
