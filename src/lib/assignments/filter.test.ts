import assert from 'node:assert/strict';
import test from 'node:test';

import { comingDueAssignments, matchesAssignmentFilter } from './filter.ts';

test('assignment filter All keeps every category', () => {
  const quiz = { category: 'quiz' };
  assert.equal(matchesAssignmentFilter(quiz, 'all'), true);
  assert.equal(matchesAssignmentFilter(quiz, 'quiz'), true);
  assert.equal(matchesAssignmentFilter(quiz, 'homework'), false);
});

test('missing category counts as homework', () => {
  const hw = {};
  assert.equal(matchesAssignmentFilter(hw, 'homework'), true);
  assert.equal(matchesAssignmentFilter(hw, 'test'), false);
});

test('coming due skips past dates and caps the shelf', () => {
  const now = Date.parse('2026-08-25T12:00:00Z');
  const soon = comingDueAssignments(
    [
      { id: 'past', due_at: '2026-08-20T00:00:00Z' },
      { id: 'next', due_at: '2026-08-26T00:00:00Z' },
      { id: 'none', due_at: null },
    ],
    now,
    8,
  );
  assert.deepEqual(
    soon.map((item) => item.id),
    ['next'],
  );
});

test('coming due sorts soonest first then caps', () => {
  const now = Date.parse('2026-08-25T12:00:00Z');
  const soon = comingDueAssignments(
    [
      { id: 'later', due_at: '2026-09-01T00:00:00Z' },
      { id: 'soonest', due_at: '2026-08-26T00:00:00Z' },
      { id: 'mid', due_at: '2026-08-28T00:00:00Z' },
      { id: 'past', due_at: '2026-08-20T00:00:00Z' },
    ],
    now,
    2,
  );
  assert.deepEqual(
    soon.map((item) => item.id),
    ['soonest', 'mid'],
  );
});
