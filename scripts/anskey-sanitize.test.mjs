import assert from 'node:assert/strict';
import test from 'node:test';
import {
  finalizeAnswerKeyAnalysis,
  isPromptExampleLeak,
  isRubricPlaceholderAnswer,
  isSolvedTrivialArithmetic,
  parseKeyItemsFromModel,
  sanitizeKeyItems,
} from './lib/anskey-sanitize.mjs';

test('detects exact prompt example leaks', () => {
  assert.equal(isPromptExampleLeak({ stem: '12 + 9 =', answer: '21' }), true);
  assert.equal(isPromptExampleLeak({ stem: '7 + 8 =', answer: '15' }), true);
  assert.equal(isPromptExampleLeak({ stem: '12 + 9', answer: '21' }), true);
  assert.equal(isPromptExampleLeak({ stem: 'slope of y=2x+1', answer: '2' }), false);
});

test('trivial arithmetic detector', () => {
  assert.equal(isSolvedTrivialArithmetic({ stem: '6 + 9 =', answer: '15' }), true);
  assert.equal(isSolvedTrivialArithmetic({ stem: '8 + 8 =', answer: '16' }), true);
  assert.equal(isSolvedTrivialArithmetic({ stem: '3 × 4 =', answer: '12' }), true);
  assert.equal(isSolvedTrivialArithmetic({ stem: '1', answer: 'C' }), false);
});

test('rubric placeholder answers become needsTeacher', () => {
  assert.equal(isRubricPlaceholderAnswer('see rubric'), true);
  assert.equal(isRubricPlaceholderAnswer('see rubric – 2 pts each cause'), true);
  assert.equal(isRubricPlaceholderAnswer('safety goggles'), false);
  const out = sanitizeKeyItems([
    { n: 8, stem: 'Explain hair', answer: 'see rubric', points: 2, needsTeacher: false },
  ]);
  assert.equal(out[0].answer, '');
  assert.equal(out[0].needsTeacher, true);
  assert.match(String(out[0].note || ''), /rubric/i);
});

test('K18-style fabricated arithmetic cluster → unreadable, no example answers', () => {
  const raw = [];
  for (let i = 1; i <= 10; i += 1) {
    const a = 5 + (i % 4);
    const b = 8 + (i % 3);
    raw.push({ n: i, stem: `${a} + ${b} =`, answer: String(a + b), type: 'numeric' });
  }
  // inject exact prompt example as row 1
  raw[0] = { n: 1, stem: '7 + 8 =', answer: '15', type: 'numeric' };
  const items = sanitizeKeyItems(parseKeyItemsFromModel(raw), { pageState: 'filled' });
  assert.ok(items.length >= 8);
  for (const it of items) {
    assert.equal(String(it.answer || '').trim(), '', `item ${it.n} should not keep invented answer`);
    assert.equal(it.needsTeacher, true);
  }
  assert.equal(items.some((it) => /12 \+ 9|7 \+ 8/.test(String(it.stem || '')) && it.answer === '21'), false);
});

test('good MC bubble key is unchanged', () => {
  const items = sanitizeKeyItems(
    parseKeyItemsFromModel([
      { n: 1, stem: '1', answer: 'C', type: 'mc' },
      { n: 2, stem: '2', answer: 'A', type: 'mc' },
      { n: 3, stem: '3', answer: 'D', type: 'mc' },
    ]),
    { pageState: 'filled' },
  );
  assert.deepEqual(
    items.map((it) => it.answer),
    ['C', 'A', 'D'],
  );
});

test('item-number-as-answer cluster cleared', () => {
  const items = sanitizeKeyItems(
    [
      { n: 1, stem: 'solve', answer: '1' },
      { n: 2, stem: 'solve', answer: '2' },
      { n: 3, stem: 'solve', answer: '3' },
      { n: 4, stem: 'solve', answer: '4' },
    ],
    { pageState: 'filled' },
  );
  assert.ok(items.every((it) => !String(it.answer || '').trim()));
});

test('dedupes duplicate n and rejects non-keys', () => {
  const items = sanitizeKeyItems([
    { n: 1, stem: 'a', answer: '' },
    { n: 1, stem: 'a', answer: 'B', type: 'mc' },
    { n: 2, stem: 'b', answer: 'C', type: 'mc' },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0].answer, 'B');
  const rejected = finalizeAnswerKeyAnalysis(
    { reject: true, teacherNote: 'Not an answer key', items: [{ n: 1, answer: 'X' }] },
    {},
  );
  assert.equal(rejected.reject, true);
  assert.deepEqual(rejected.items, []);
});

test('unreadable token and low confidence clear answer', () => {
  const items = parseKeyItemsFromModel([
    { n: 1, stem: 'q', answer: 'unreadable' },
    { n: 2, stem: 'q2', answer: 'B', confidence: 0.2, type: 'mc' },
  ]);
  assert.equal(items[0].answer, '');
  assert.equal(items[0].needsTeacher, true);
  assert.equal(items[1].answer, '');
  assert.equal(items[1].needsTeacher, true);
});
