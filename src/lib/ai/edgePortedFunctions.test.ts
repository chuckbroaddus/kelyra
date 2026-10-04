import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { finalizeRosterExtract } from '../../../supabase/functions/_shared/rosterExtract.ts';
import { finalizeSpeechIntent } from '../../../supabase/functions/_shared/speechIntent.ts';
import {
  evaluatePromptText,
  finalizeEvaluateHomework,
} from '../../../supabase/functions/_shared/evaluateHomework.ts';
import {
  finalizeKeyPick,
  planKeyMatch,
  signatureFromGrey32,
} from '../../../supabase/functions/_shared/answerKeyMatch.ts';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const PORTED = ['extract-roster', 'interpret-speech', 'evaluate-homework', 'analyze-answer-key', 'match-key'];

test('the five ai:dev-only functions now exist on Edge with auth before the model call', () => {
  for (const name of PORTED) {
    const rel = `supabase/functions/${name}/index.ts`;
    assert.ok(existsSync(join(root, rel)), rel);
    const src = read(rel);
    assert.doesNotMatch(src, /PLACEHOLDER|not_implemented/);
    assert.match(src, /withCors/);
    const authAt = src.indexOf('requireUserClient(req)');
    const meterAt = src.indexOf('callMetered(');
    if (meterAt >= 0) assert.ok(authAt > 0 && authAt < meterAt, `${name}: auth before callMetered`);
    else assert.ok(authAt > 0, `${name}: auth`);
    assert.match(read('supabase/config.toml'), new RegExp(`\\[functions\\.${name}\\]\\nverify_jwt = true`));
  }
});

test('ai:dev imports the same prompts and post-processing as Edge (no private copies)', () => {
  const dev = read('scripts/ai-dev-server.mjs');
  for (const mod of ['aiPrompts.ts', 'homeworkPrompts.ts', 'rosterExtract.ts', 'speechIntent.ts', 'evaluateHomework.ts', 'answerKeyMatch.ts', 'anskeySanitize.mjs']) {
    assert.match(dev, new RegExp(`_shared/${mod.replace('.', '\\.')}`), mod);
  }
  for (const copy of ['const rosterPrompt =', 'const speechPrompt =', 'const evaluatePrompt =', 'const analyzeKeyPrompt =', 'const matchKeyPrompt =', 'const homeworkPrompt =', 'const submissionReviewPrompt =', 'function dropRowIndexIds', 'function hammingHex']) {
    assert.ok(!dev.includes(copy), `ai:dev still defines ${copy}`);
  }
});

test('roster: flips LAST, FIRST, drops junk and row-index ids, flags shaky reads', () => {
  const out = finalizeRosterExtract({
    document_kind_guess: 'class_roster',
    names: [
      { name: 'CHEN, MAYA', student_id: '1' },
      { name: 'Jamal Brooks', student_id: '2' },
      { name: 'Period 3' },
      { name: 'Mr. Smith' },
      { name: '### ???' },
      { name: 'Jamal Brooks', student_id: '3' },
    ],
  });
  assert.deepEqual(out.names.map((r) => r.name), ['Maya Chen', 'Jamal Brooks']);
  assert.ok(out.names.every((r) => r.student_id === null));
  assert.equal(out.rejected, false);
  assert.equal(finalizeRosterExtract({ document_kind_guess: 'not_roster', names: [{ name: 'A B' }] }).rejected, true);
  assert.equal(finalizeRosterExtract({ names: [{ name: 'Sam K' }, { name: 'Lee' }] }).low_confidence, true);
});

test('speech: unknown intents fall back from captureIntent / name; junk captureIntent dropped', () => {
  assert.deepEqual(finalizeSpeechIntent({ captureIntent: 'roster' }), {
    intent: 'capture',
    captureIntent: 'roster',
    studentName: null,
    parentName: null,
    skillLabel: null,
  });
  assert.equal(finalizeSpeechIntent({ studentName: ' Mateo  Ruiz ' }).intent, 'add_student');
  assert.equal(finalizeSpeechIntent({ studentName: ' Mateo  Ruiz ' }).studentName, 'Mateo Ruiz');
  assert.equal(finalizeSpeechIntent({ captureIntent: 'rocket' }).captureIntent, null);
});

test('evaluate-homework: unkeyed score comes from item credits; reject → null score', () => {
  const graded = finalizeEvaluateHomework(
    {
      studentName: 'Maya',
      draftScore: 100,
      items: [
        { n: 1, expected: '4', seen: '4', credit: 1, of: 1 },
        { n: 2, expected: '9', seen: '8', credit: 0, of: 1 },
      ],
    },
    {},
  );
  assert.equal(graded.draftScore, 50);
  assert.equal(graded.maxScore, 100);
  assert.equal(graded.studentName, 'Maya');
  const rejected = finalizeEvaluateHomework({ draftScore: 0, items: [] }, {});
  assert.equal(rejected.draftScore, null);
  const prompt = evaluatePromptText(
    { rosterNames: ['Maya Chen'], keyItems: [{ n: 1, answer: '4', points: 2 }], maxScore: 2 },
    true,
  );
  assert.match(prompt, /roster spelling: Maya/);
  assert.match(prompt, /ANSWER KEY \(score only against this\)/);
  assert.match(prompt, /1\. 4 \(2 pt\)/);
  assert.match(prompt, /answer key photo/);
});

test('match-key: identical signature wins on hash; ambiguous → vision shortlist; pick must be listed', () => {
  const grey = Array.from({ length: 32 * 32 }, (_, i) => ((i * 37) % 255));
  const sig = signatureFromGrey32(grey);
  assert.equal(sig.phash.length, 16);
  assert.equal(sig.layout.length, 64);
  const other = signatureFromGrey32(grey.map((v) => 255 - v));
  const sure = planKeyMatch(
    [
      { id: 'a', title: 'HW 16', phash: sig.phash, layout: sig.layout },
      { id: 'b', title: 'HW 17', phash: other.phash, layout: other.layout },
    ],
    sig,
  );
  assert.ok('result' in sure && sure.result.assignmentId === 'a');
  const unsure = planKeyMatch(
    [
      { id: 'a', title: 'HW 16', phash: sig.phash, layout: sig.layout, imageUrl: 'data:x' },
      { id: 'b', title: 'HW 16b', phash: sig.phash, layout: sig.layout, imageUrl: 'data:y' },
    ],
    sig,
  );
  assert.ok('shortlist' in unsure && unsure.shortlist.length === 2);
  if ('shortlist' in unsure) {
    assert.equal(finalizeKeyPick({ assignmentId: 'zzz' }, ['a', 'b'], unsure.best, unsure.scores).assignmentId, null);
    assert.equal(finalizeKeyPick({ assignmentId: 'b', confidence: 0.9 }, ['a', 'b'], unsure.best, unsure.scores).assignmentId, 'b');
  }
});
