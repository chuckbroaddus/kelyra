import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPracticeLessonHtml,
  isPracticePackId,
  parsePracticePageSpec,
  practiceBeatWindow,
  specFromItems,
} from './practicePage.ts';

test('specFromItems keeps every question on one page spec', () => {
  const spec = specFromItems('Regrouping', [
    { id: 'item-1', prompt: '34 + 18', answerKey: '52' },
    { id: 'item-2', prompt: '51 - 19', answerKey: '32' },
    { id: 'item-3', prompt: 'What is 7 × 8?' },
  ]);
  assert.equal(spec.beats.length, 3);
  assert.equal(spec.beats[0]?.stem, '34 + 18');
  assert.deepEqual(spec.beats[0]?.accept, ['52']);
  assert.deepEqual(practiceBeatWindow(spec), { start: 'q1', end: 'done' });
});

test('hosted HTML is one document with Check, pips, and Done', () => {
  const html = buildPracticeLessonHtml(
    specFromItems('Regrouping', [
      { id: 'item-1', prompt: '34 + 18', answerKey: '52' },
      { id: 'item-2', prompt: '51 - 19', answerKey: '32' },
    ]),
  );
  assert.match(html, /id="markDone"/);
  assert.match(html, /id="check"/);
  assert.match(html, /__kelyraPackReport/);
  assert.match(html, /KELYRA_PRACTICE/);
  assert.match(html, /34 \+ 18/);
  assert.match(html, /51 - 19/);
  assert.equal((html.match(/<!DOCTYPE html>/g) ?? []).length, 1);
});

test('AI spec cannot drop teacher stems', () => {
  const fallback = specFromItems('Practice', [{ id: 'item-1', prompt: 'Keep this stem' }]);
  const parsed = parsePracticePageSpec({ title: 'X', beats: [{ stem: 'Keep this stem', accept: ['1'] }] }, fallback);
  assert.equal(parsed.beats[0]?.stem, 'Keep this stem');
});

test('practice pack ids stay off the published catalog prefix', () => {
  assert.equal(isPracticePackId('prac-abc'), true);
  assert.equal(isPracticePackId('fom-ch01'), false);
});
