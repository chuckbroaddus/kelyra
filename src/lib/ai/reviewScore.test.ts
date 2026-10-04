import assert from 'node:assert/strict';
import test from 'node:test';

import { exactValue, keyedScore, reconcileDraftScore } from '../../../supabase/functions/_shared/reviewScore.ts';

const items = [
  { id: 'item-1', answerKey: '85' },
  { id: 'item-2', answerKey: '85' },
  { id: 'item-3', answerKey: '91' },
  { id: 'item-4', answerKey: '37' },
];

test('1 of 4 correct counts as 25 and beats a model 75 (eval V01)', () => {
  const answers = { 'item-1': '75', 'item-2': '75', 'item-3': '81', 'item-4': '37' };
  assert.equal(keyedScore(items, answers), 25);
  assert.equal(reconcileDraftScore(75, 25), 25);
});

test('model score within tolerance is kept; null model takes the count', () => {
  assert.equal(reconcileDraftScore(80, 75), 80);
  assert.equal(reconcileDraftScore(null, 50), 50);
  assert.equal(reconcileDraftScore(60, null), 60);
});

test('fractions, decimals, percents and x= compare by value', () => {
  assert.equal(exactValue('x = 6'), 6);
  assert.equal(exactValue('.25'), 0.25);
  assert.equal(exactValue('25%'), 0.25);
  assert.equal(exactValue('10/12'), 10 / 12);
  assert.equal(keyedScore([{ id: 'a', answerKey: '5/6' }, { id: 'b', answerKey: '0.4' }], { a: '10/12', b: '.4' }), 100);
});

test('free-text keys are never auto-graded; blanks are wrong', () => {
  assert.equal(keyedScore([{ id: 'a', answerKey: 'plentiful' }, { id: 'b', answerKey: '3' }], { a: 'x', b: '3' }), null);
  assert.equal(keyedScore([{ id: 'a', answerKey: '340' }, { id: 'b', answerKey: '500' }], {}), 0);
});
