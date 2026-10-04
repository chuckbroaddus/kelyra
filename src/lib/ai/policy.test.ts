import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHEAP_MODEL,
  FLAGSHIP_MODEL,
  PRACTICE_MODEL,
  estimateUsd,
  firstNameOnly,
  formatUsd,
  GEMINI_FLASH,
  GEMINI_FLASH_LITE,
  imageDetailFor,
  modelChainFor,
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
  assert.equal(reasoningEffortFor(CHEAP_MODEL, 'cheap'), undefined);
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

test('Edge Gemini routing: lite for volume jobs, strong (with lite fallback) for grading/answers', () => {
  for (const job of ['classify', 'roster', 'ride_lpr', 'speech', 'practice', 'lesson-outline', 'match-key'] as const) {
    assert.deepEqual(modelChainFor('gemini', job), [GEMINI_FLASH_LITE], job);
  }
  for (const job of ['homework', 'key', 'review', 'ask'] as const) {
    assert.deepEqual(modelChainFor('gemini', job), [GEMINI_FLASH, GEMINI_FLASH_LITE], job);
  }
  // Look-again always upgrades.
  assert.deepEqual(modelChainFor('gemini', 'classify', 'look-again'), [GEMINI_FLASH, GEMINI_FLASH_LITE]);
  // Secrets can swap tiers without a code change.
  assert.deepEqual(modelChainFor('gemini', 'ask', 'cheap', { geminiStrong: 'gemini-x' }), ['gemini-x', GEMINI_FLASH_LITE]);
  assert.deepEqual(modelChainFor('gemini', 'classify', 'cheap', { geminiLite: 'gemini-y' }), ['gemini-y']);
  // xAI (ai:dev Grok) keeps the old single-model mapping.
  assert.deepEqual(modelChainFor('xai', 'homework'), [CHEAP_MODEL]);
  assert.deepEqual(modelChainFor('xai', 'ask'), [FLAGSHIP_MODEL]);
});

test('ai:dev and the app share the one aiPolicy.ts (no copied model tables)', async () => {
  const { readFileSync } = await import('node:fs');
  const dev = readFileSync('scripts/lib/ai-policy.mjs', 'utf8');
  const app = readFileSync('src/lib/ai/policy.ts', 'utf8');
  for (const src of [dev, app]) {
    assert.match(src, /supabase\/functions\/_shared\/aiPolicy\.ts/);
    assert.doesNotMatch(src, /'grok-4\.6'|'gemini-3/);
  }
});
