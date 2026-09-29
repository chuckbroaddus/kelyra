import assert from 'node:assert/strict';
import test from 'node:test';

import { keyScoreAssignmentIdFromDraft, keyScoreItemsFromDraft } from './draft.ts';

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
