import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUNDLED_HELP_TOPICS,
  getBundledHelpTopic,
  listBundledHelpTopics,
  loadHelpTopic,
} from './helpTopics.ts';

test('bundled help includes FR-HELP engine and GPA keys', () => {
  const keys = listBundledHelpTopics().map((t) => t.key);
  assert.ok(keys.includes('help.engine.points'));
  assert.ok(keys.includes('help.gpa.weighted'));
  assert.ok(keys.includes('help.wizard.review'));
  assert.ok(BUNDLED_HELP_TOPICS.length >= 20);
});

test('getBundledHelpTopic returns title and example', () => {
  const t = getBundledHelpTopic('help.scale.tx70');
  assert.ok(t);
  assert.match(t!.title, /Texas/);
  assert.ok(t!.example.length > 0);
});

test('loadHelpTopic falls back to bundled', async () => {
  const t = await loadHelpTopic('help.rollup.2_7');
  assert.ok(t);
  assert.equal(t!.key, 'help.rollup.2_7');
});
