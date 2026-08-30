import assert from 'node:assert/strict';
import test from 'node:test';

import type { LessonResult } from './protocol.ts';
import {
  draftGapLabelsFromLessonWork,
  formatLessonWorkForPrompt,
  lessonWorkFromResult,
  lessonWorkLines,
} from './work.ts';

function result(partial: Partial<LessonResult>): LessonResult {
  return { kind: 'lesson', state: 'complete', ...partial };
}

test('Colton-style all-correct 1.2 is six of six, not JSON', () => {
  const work = lessonWorkFromResult(
    result({
      correct: 7,
      incorrect: 7,
      duration_ms: 188000,
      audio_used: true,
      kinetic_used: false,
      hints: 0,
      marks: {
        b1: { user: '2071', ok: true },
        b2: { user: '0.248', ok: true },
        b3: { user: '18.0404', ok: true },
        b4: { user: '56.03', ok: true },
        b5: { user: '362.901', ok: true },
        b6: { user: 'inverse operations', ok: true },
        slider37: { user: '3.7', ok: true },
      },
      extras: { item_ids: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] },
    }),
  );
  assert.equal(work?.headline, '6 of 6 correct');
  assert.equal(work?.correct, 6);
  assert.equal(work?.incorrect, 0);
  assert.equal(work?.skipped, 0);
  assert.equal(work?.items.length, 6);
  assert.equal(work?.items[0]?.prompt, '4468 − 2397');
  assert.equal(work?.items[0]?.outcome, 'correct');
  assert.equal(work?.struggleSummary, null);
  assert.equal(work?.practiceNote, null);
  for (const row of lessonWorkLines(work)) {
    assert.equal(row.value.includes('{'), false);
    assert.equal(row.label.includes('"ok"'), false);
  }
  assert.match(formatLessonWorkForPrompt(work), /6 of 6 correct/);
});

test('skips, later-corrected, extra tries, and hints become teacher language', () => {
  const work = lessonWorkFromResult(
    result({
      duration_ms: 240000,
      hints: 3,
      audio_used: true,
      marks: {
        b1: { user: '2071', ok: true, tries: 1, first_ok: true },
        b2: {
          user: '0.248',
          ok: true,
          tries: 4,
          first_ok: false,
          later_corrected: true,
          guesses: ['0.24', '0.25', '0.248'],
          hints: 2,
        },
        b3: { user: '', ok: false, tries: 1 },
      },
      extras: {
        item_ids: ['b1', 'b2', 'b3', 'b4'],
        item_stems: { b1: '4468 − 2397', b2: '8.949 − 8.701', b3: '26.4 − 8.3596', b4: '$65 − $8.97' },
        skipped: ['b4'],
        later_corrected: ['b2'],
      },
    }),
  );
  assert.equal(work?.headline, '2 of 4 correct · 1 incorrect · 1 skipped');
  assert.equal(work?.items[1]?.laterCorrected, true);
  assert.equal(work?.items[1]?.tries, 4);
  assert.deepEqual(work?.items[1]?.guesses, ['0.24', '0.25']);
  assert.equal(work?.items[1]?.worthPractice, true);
  assert.equal(work?.items[2]?.outcome, 'incorrect');
  assert.equal(work?.items[3]?.outcome, 'skipped');
  assert.equal(work?.items[3]?.prompt, '$65 − $8.97');
  assert.match(work?.struggleSummary ?? '', /skipped/);
  assert.match(work?.struggleSummary ?? '', /corrected after a miss/);
  assert.match(work?.struggleSummary ?? '', /hint/);
  assert.ok(work?.practiceNote);
  const prompt = formatLessonWorkForPrompt(work);
  assert.match(prompt, /8\.949/);
  assert.match(prompt, /4 tries/);
  assert.match(prompt, /Earlier tries: 0\.24, 0\.25/);
  assert.equal(prompt.includes('{"user"'), false);
});

test('in-progress unattempted items are not skipped', () => {
  const work = lessonWorkFromResult({
    kind: 'lesson',
    state: 'in_progress',
    marks: { b1: { user: '2071', ok: true } },
    extras: { item_ids: ['b1', 'b2'] },
  });
  assert.equal(work?.status, 'In progress');
  assert.equal(work?.items[1]?.outcome, 'open');
  assert.equal(work?.skipped, 0);
  assert.equal(work?.headline, 'In progress · 1 checked');
  assert.equal(work?.practiceNote, null);
});

test('draftGapLabelsFromLessonWork only from worthPractice complete items', () => {
  const clean = lessonWorkFromResult(
    result({
      marks: {
        b1: { user: '2071', ok: true, tries: 1 },
        b2: { user: '0.248', ok: true, tries: 1 },
      },
      extras: { item_ids: ['b1', 'b2'], item_stems: { b1: '4468 − 2397', b2: '8.949 − 8.701' } },
    }),
  );
  assert.deepEqual(draftGapLabelsFromLessonWork(clean), []);

  const struggle = lessonWorkFromResult(
    result({
      marks: {
        b1: { user: '2071', ok: true, tries: 1 },
        b2: { user: '0.248', ok: true, tries: 4, first_ok: false, later_corrected: true, hints: 2 },
        b3: { user: '', ok: false },
      },
      extras: {
        item_ids: ['b1', 'b2', 'b3', 'b4'],
        item_stems: {
          b1: '4468 − 2397',
          b2: '8.949 − 8.701',
          b3: '26.4 − 8.3596',
          b4: '$65 − $8.97',
        },
      },
    }),
  );
  assert.deepEqual(draftGapLabelsFromLessonWork(struggle), [
    '8.949 − 8.701',
    '26.4 − 8.3596',
    '$65 − $8.97',
  ]);
});
