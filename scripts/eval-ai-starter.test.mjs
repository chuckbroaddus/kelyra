import assert from 'node:assert/strict';
import test from 'node:test';
import { firstJsonObject, runChecks } from './eval-ai-starter.mjs';

test('starter rubric: practice item count + review score band', () => {
  const practice = runChecks('practice', { itemsMin: 4, itemsMax: 6, itemsHave: ['prompt'] }, {
    status: 200,
    json: { items: [1, 2, 3, 4].map((i) => ({ id: `item-${i}`, prompt: `Q${i}` })) },
  });
  assert.ok(practice.every((c) => c.pass));
  const reply = 'Sure:\n{"summary":"s","draftScore":75,"gaps":[{"label":"regrouping"}],"items":[]}';
  assert.equal(firstJsonObject(reply).draftScore, 75);
  const review = runChecks('review', { scoreMax: 60, gapsMin: 1 }, { status: 200, json: { text: reply } });
  assert.equal(review.find((c) => c.name === 'scoreMax').pass, false);
  assert.equal(review.find((c) => c.name === 'gapsMin').pass, true);
});

test('starter rubric: explain must stay ephemeral', () => {
  const checks = runChecks('explain', {}, {
    status: 200,
    json: { parked: true, explain_draft: { steps: ['a', 'b', 'c'] } },
  });
  assert.equal(checks.find((c) => c.name === 'ephemeral (no write)').pass, false);
});

test('review rubric applies the review-submission keyed score guard', async () => {
  const { parseWorkText } = await import('./eval-ai-starter.mjs');
  const work = 'Assignment: R\nKind: practice\n\n1. 47 + 38\n   Expected: 85\n   Student: 75\n2. 23 + 14\n   Expected: 37\n   Student: 37';
  assert.deepEqual(parseWorkText(work).answers, { 'item-1': '75', 'item-2': '37' });
  const reply = '{"summary":"s","draftScore":90,"gaps":[{"label":"regrouping"}],"items":[]}';
  const checks = runChecks('review', { scoreMax: 60 }, { status: 200, json: { text: reply } }, { work });
  assert.equal(checks.find((c) => c.name === 'scoreMax').pass, true);
});
