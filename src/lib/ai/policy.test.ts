import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHEAP_MODEL,
  FLAGSHIP_MODEL,
  PRACTICE_MODEL,
  estimateUsd,
  firstNameOnly,
  formatUsd,
  imageDetailFor,
  modelFor,
  parseUsage,
  reasoningEffortFor,
  rosterForModel,
  shouldSkipHomeworkAnalyze,
} from './policy.ts';

test('cheap jobs stay off grok-4.6', () => {
  assert.equal(modelFor('classify'), CHEAP_MODEL);
  assert.equal(modelFor('homework'), CHEAP_MODEL);
  assert.equal(modelFor('practice'), PRACTICE_MODEL);
  assert.equal(modelFor('review'), CHEAP_MODEL);
  assert.equal(imageDetailFor('cheap'), 'low');
  assert.equal(reasoningEffortFor(CHEAP_MODEL, 'cheap'), null);
});

test('Ask and look-again use flagship high-detail', () => {
  assert.equal(modelFor('ask'), FLAGSHIP_MODEL);
  assert.equal(modelFor('homework', 'look-again'), FLAGSHIP_MODEL);
  assert.equal(imageDetailFor('look-again'), 'high');
  assert.equal(reasoningEffortFor(FLAGSHIP_MODEL, 'look-again'), 'high');
  assert.equal(reasoningEffortFor(FLAGSHIP_MODEL, 'cheap'), 'low');
});

test('skip cheap re-analyze when a draft already exists', () => {
  assert.equal(shouldSkipHomeworkAnalyze({ pass: 'cheap', hasDraft: true }), true);
  assert.equal(shouldSkipHomeworkAnalyze({ pass: 'look-again', hasDraft: true }), false);
  assert.equal(shouldSkipHomeworkAnalyze({ hasDraft: false }), false);
});

test('roster prompt uses first names only', () => {
  assert.equal(firstNameOnly('Maya Chen'), 'Maya');
  const rows = rosterForModel([
    { id: 's1', display_name: 'Maya Chen' },
    { id: 's2', name: 'Jamal' },
  ]);
  assert.deepEqual(rows, [
    { id: 's1', name: 'Maya' },
    { id: 's2', name: 'Jamal' },
  ]);
});

test('usage estimate is cents-scale for a cheap page', () => {
  const usage = parseUsage({ usage: { input_tokens: 2000, output_tokens: 200 } });
  const usd = estimateUsd(CHEAP_MODEL, usage.inputTokens, usage.outputTokens);
  assert.ok(usd > 0 && usd < 0.02);
  assert.match(formatUsd(usd), /^~/);
});
