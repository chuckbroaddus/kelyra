import assert from 'node:assert/strict';
import test from 'node:test';

import { draftHasWork } from './draftWork.ts';

test('draftHasWork: pageAssetIds alone is not work (batch mint must still analyze after attach)', () => {
  assert.equal(
    draftHasWork({
      gaps: [],
      draftScore: null,
      teacherNote: null,
      pageAssetIds: ['a', 'b', 'c'],
    }),
    false,
  );
});

test('draftHasWork: gaps / score / note / key_score count as work', () => {
  assert.equal(
    draftHasWork({
      gaps: [{ label: 'regrouping', sortOrder: 1 }],
      draftScore: null,
      teacherNote: null,
      pageAssetIds: ['a', 'b'],
    }),
    true,
  );
  assert.equal(draftHasWork({ gaps: [], draftScore: 80, teacherNote: null }), true);
  assert.equal(draftHasWork({ gaps: [], draftScore: null, teacherNote: 'check place value' }), true);
  assert.equal(draftHasWork({ gaps: [], draftScore: null, teacherNote: null, method: 'key_score' }), true);
});
