/**
 * Scripted teacher / office conversations → saved settings match expectations.
 * Local heuristic extractor (no network). The LLM variant runs via
 * scripts/sim-setup-interview-llm.ts against the dev setup-interview edge.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { SIM_CONVERSATIONS, runConversation } from './simConversations.ts';
import { readBackSummary } from './nextQuestion.ts';

for (const conv of SIM_CONVERSATIONS) {
  test(`simulated conversation ${conv.name}`, async () => {
    const r = await runConversation(conv);
    assert.deepEqual(r.errors, [], `${r.errors.join('\n')}\n--- transcript ---\n${r.transcript.join('\n')}`);
  });
}

test('summary marks school-locked and defaulted settings', async () => {
  const conv = SIM_CONVERSATIONS.find((c) => c.name.startsWith('C'))!;
  const r = await runConversation({ ...conv, turns: conv.turns.slice(0, -1) });
  const text = readBackSummary(r.session);
  assert.match(text, /Late work: 10% off per day, no lower than 50% \(locked by your school\)/);
  assert.match(text, /Missing work: .*\(usual choice — please check\)/);
  assert.match(text, /Syllabus name: World History/);
});
