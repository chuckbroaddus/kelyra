import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreFromLessonResult } from './score.ts';
import type { LessonResult } from './protocol.ts';

function result(partial: Partial<LessonResult>): LessonResult {
  return { kind: 'lesson', state: 'complete', ...partial };
}

test('counts each check item once from last ok, ignores retries in counters', () => {
  const scored = scoreFromLessonResult(
    result({
      correct: 7,
      incorrect: 7,
      marks: {
        b1: { user: '2071', ok: true },
        b2: { user: '0.248', ok: true },
        b3: { user: '18.0404', ok: true },
        b4: { user: '56.03', ok: true },
        b5: { user: '362.901', ok: true },
        b6: { user: 'inverse operations', ok: true },
        slider37: { user: '3.7', ok: true },
      },
    }),
  );
  assert.deepEqual(scored, { correct: 6, incorrect: 0, skipped: 0 });
});

test('uses pack item_ids so leaked 1.1 answers are not graded into 1.2', () => {
  const scored = scoreFromLessonResult(
    result({
      correct: 14,
      incorrect: 2,
      marks: {
        houses: { user: '29.108', ok: true },
        a1: { user: 'nope', ok: false },
        b1: { user: '2071', ok: true },
        b2: { user: '0.248', ok: true },
      },
      extras: { item_ids: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'], wrong: [], skipped: ['b3', 'b4', 'b5', 'b6'] },
    }),
  );
  assert.equal(scored?.correct, 2);
  assert.equal(scored?.incorrect, 0);
  assert.equal(scored?.skipped, 4);
});

test('tries and later-corrected do not inflate last-ok counts', () => {
  const scored = scoreFromLessonResult(
    result({
      extras: { item_ids: ['b1', 'b2'] },
      marks: {
        b1: { user: '2071', ok: true, tries: 5, first_ok: false, later_corrected: true },
        b2: { user: 'nope', ok: false, tries: 3, hints: 2 },
      },
    }),
  );
  assert.deepEqual(scored, { correct: 1, incorrect: 1, skipped: 0 });
});

test('blank skipped is not incorrect', () => {
  const scored = scoreFromLessonResult(
    result({
      extras: { item_ids: ['b1', 'b2'] },
      marks: { b1: { user: '2071', ok: true } },
    }),
  );
  assert.deepEqual(scored, { correct: 1, incorrect: 0, skipped: 1 });
});
