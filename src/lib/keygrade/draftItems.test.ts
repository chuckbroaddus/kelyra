import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildKeyedHomeworkPersistDraft,
  keyScoreAssignmentIdFromDraft,
  keyScoreItemsFromDraft,
  packItemsFromAssignmentKey,
} from './draft.ts';

test('keyScoreItemsFromDraft: reads Pack B items from saved key_score draft', () => {
  const items = keyScoreItemsFromDraft({
    method: 'key_score',
    assignment_id: 'asg-1',
    items: [
      {
        n: 1,
        type: 'mc',
        expected: 'b',
        extracted: 'b',
        points: 1,
        awarded: 1,
        confidence: 0.9,
        residual: false,
        flag: null,
        confirmed: true,
      },
      {
        n: 2,
        type: 'numeric',
        expected: '42',
        extracted: null,
        points: 2,
        awarded: null,
        confidence: 0.2,
        residual: true,
        flag: 'blank',
        confirmed: false,
      },
    ],
  });
  assert.equal(items.length, 2);
  assert.equal(items[0]?.confirmed, true);
  assert.equal(items[0]?.awarded, 1);
  assert.equal(items[1]?.confirmed, false);
  assert.equal(items[1]?.awarded, null);
  assert.equal(keyScoreAssignmentIdFromDraft({ method: 'key_score', assignment_id: 'asg-1' }), 'asg-1');
});

test('keyScoreItemsFromDraft: ignores non-key drafts', () => {
  assert.deepEqual(keyScoreItemsFromDraft(null), []);
  assert.deepEqual(keyScoreItemsFromDraft({ method: 'vision_gaps', items: [{ n: 1 }] }), []);
  assert.deepEqual(keyScoreItemsFromDraft({ method: 'key_score', items: 'nope' }), []);
});

test('AC-PACKB-1: keyed homework persist seeds key_score items without packItems', () => {
  const keyed = buildKeyedHomeworkPersistDraft({
    keyItems: [
      { n: 1, answer: 'b', type: 'mc', points: 1 },
      { n: 2, answer: '42', type: 'numeric', points: 1 },
    ],
    assignmentId: 'asg-hw-1',
    maxScore: 2,
    packItems: [],
    teacherNote: 'Jordan Lee math',
    gaps: [],
  });
  assert.ok(keyed);
  assert.equal(keyed!.draft.method, 'key_score');
  assert.equal(keyed!.draft.assignment_id, 'asg-hw-1');
  assert.equal(keyed!.draft.items.length, 2);
  assert.equal(
    keyed!.draft.items.every((item) => item.confirmed === false),
    true,
  );
  const roundTrip = keyScoreItemsFromDraft(keyed!.draft);
  assert.equal(roundTrip.length, 2);
});

test('AC-PACKB-1: packItemsFromAssignmentKey seeds Pack B rows for saved draft hydrate', () => {
  const items = packItemsFromAssignmentKey({
    keyItems: [{ n: 1, answer: 'a', type: 'mc', points: 1 }],
    assignmentId: 'asg-2',
    maxScore: 1,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.expected, 'a');
  assert.equal(items[0]?.confirmed, false);
  assert.equal(items[0]?.extracted, null);
});

test('AC-PACKB-1: persist prefers live packItems over blank key seed', () => {
  const keyed = buildKeyedHomeworkPersistDraft({
    keyItems: [{ n: 1, answer: 'b', type: 'mc', points: 1 }],
    assignmentId: 'asg-3',
    packItems: [
      {
        n: 1,
        type: 'mc',
        expected: 'b',
        extracted: 'b',
        points: 1,
        awarded: 1,
        confidence: 0.9,
        residual: false,
        flag: null,
        confirmed: true,
      },
    ],
  });
  assert.ok(keyed);
  assert.equal(keyed!.draft.items[0]?.confirmed, true);
  assert.equal(keyed!.draft.items[0]?.extracted, 'b');
});
