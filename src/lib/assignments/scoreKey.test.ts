import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreKey, normalizeMc, normalizeNumeric } from './scoreKey.ts';

test('score-key MC exact match after normalize', () => {
  const result = scoreKey({
    keyItems: [
      { n: 1, answer: 'A', points: 1, type: 'mc' },
      { n: 2, answer: '(b)', points: 1, type: 'mc' },
      { n: 3, answer: 'C', points: 2, type: 'mc' },
    ],
    extract: [
      { n: 1, extracted: 'a', confidence: 0.9 },
      { n: 2, extracted: 'B', confidence: 0.9 },
      { n: 3, extracted: 'D', confidence: 0.9 },
    ],
  });
  assert.equal(result.method, 'key_score');
  assert.equal(result.items[0]!.awarded, 1);
  assert.equal(result.items[1]!.awarded, 1);
  assert.equal(result.items[2]!.awarded, 0);
  assert.equal(result.draft_score, Math.round((2 / 4) * 1000) / 10);
  assert.equal(result.ignored_model_total, false);
});

test('score-key numeric strips commas/spaces/%', () => {
  assert.equal(normalizeNumeric('1,200'), '1200');
  assert.equal(normalizeNumeric('12 %'), '12');
  const result = scoreKey({
    keyItems: [{ n: 1, answer: '12', points: 5, type: 'numeric' }],
    extract: [{ n: 1, extracted: '12%', confidence: 0.8 }],
  });
  assert.equal(result.items[0]!.awarded, 5);
});

test('score-key blanks and residuals are null not zero', () => {
  const result = scoreKey({
    keyItems: [
      { n: 1, answer: 'A', points: 1, type: 'mc' },
      { n: 2, answer: 'explain', points: 3, type: 'short' },
      { n: 3, answer: '7', points: 1, type: 'numeric', needsTeacher: true },
    ],
    extract: [
      { n: 1, extracted: null, confidence: 0.1, flag: 'blank' },
      { n: 2, extracted: 'something', confidence: 0.6 },
      { n: 3, extracted: '7', confidence: 0.9 },
    ],
  });
  assert.equal(result.items[0]!.awarded, null);
  assert.equal(result.items[0]!.residual, true);
  assert.equal(result.items[1]!.awarded, null);
  assert.equal(result.items[1]!.residual, true);
  assert.equal(result.items[2]!.awarded, null);
  assert.ok(result.residuals >= 2);
  // only scored items count — none scored → null draft
  assert.equal(result.draft_score, null);
});

test('score-key ignores model totals (GAUTH L3 / S1 T4)', () => {
  const result = scoreKey({
    keyItems: [{ n: 1, answer: 'A', points: 1, type: 'mc' }],
    extract: [{ n: 1, extracted: 'A', confidence: 0.9 }],
    modelTotal: 99,
  });
  assert.equal(result.ignored_model_total, true);
  assert.equal(result.draft_score, 100);
  assert.notEqual(result.draft_score, 99);
});

test('normalizeMc handles TF and parentheses', () => {
  assert.equal(normalizeMc('(A)'), 'a');
  assert.equal(normalizeMc('True'), 't');
  assert.equal(normalizeMc('false'), 'f');
});

test('score-key respects maxScore scaling', () => {
  const result = scoreKey({
    keyItems: [
      { n: 1, answer: 'A', points: 1, type: 'mc' },
      { n: 2, answer: 'B', points: 1, type: 'mc' },
    ],
    extract: [
      { n: 1, extracted: 'A', confidence: 0.9 },
      { n: 2, extracted: 'B', confidence: 0.9 },
    ],
    maxScore: 10,
  });
  // earned 2 / max 10 → 20
  assert.equal(result.draft_score, 20);
});
