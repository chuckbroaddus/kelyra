import assert from 'node:assert/strict';
import test from 'node:test';

import { followUpItems, followUpTitle } from './followUp.ts';

test('follow-up items stay one set, not one assignment per question', () => {
  const items = followUpItems([
    { id: 'item-1', prompt: '  12 + 8  ', answerKey: '20' },
    { id: 'item-2', prompt: '' },
    { id: 'item-3', prompt: '30 - 11', answerKey: '19' },
  ]);
  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((item) => item.prompt),
    ['12 + 8', '30 - 11'],
  );
});

test('follow-up title names the skill without splitting items', () => {
  assert.equal(followUpTitle('two-digit regrouping', 'Quiz 4'), 'Quiz 4 · two-digit regrouping');
  assert.equal(followUpTitle('place value'), 'Practice: place value');
});
