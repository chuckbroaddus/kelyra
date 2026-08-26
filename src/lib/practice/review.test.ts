import assert from 'node:assert/strict';
import test from 'node:test';

import {
  answerText,
  asDraftScore,
  formatWorkForPrompt,
  mergeReviewDraft,
  mergeReviewGaps,
  parseSubmissionReview,
  practiceWorkLines,
  reviewDraftHasWork,
  reviewHasGap,
  submissionReviewPath,
  teacherDraftPrompt,
  withPendingGap,
} from './review.ts';

test('parseSubmissionReview keeps gaps, items, and notes', () => {
  const withGap = parseSubmissionReview({
    summary: 'Missed regrouping on two items.',
    draftScore: 72.4,
    teacherNote: 'Glow: showed work. Grow: lining up tens.',
    gaps: [{ label: ' two-digit regrouping ', sortOrder: 1 }, { label: '' }],
    items: [
      { id: 'item-1', prompt: '34 + 28', answerKey: '62' },
      { prompt: '  ' },
    ],
  });
  assert.equal(withGap.summary, 'Missed regrouping on two items.');
  assert.equal(withGap.draftScore, 72);
  assert.deepEqual(withGap.gaps, [{ label: 'two-digit regrouping', sortOrder: 1 }]);
  assert.equal(withGap.items.length, 1);
  assert.equal(withGap.items[0]?.prompt, '34 + 28');
  assert.equal(reviewHasGap(withGap), true);
  assert.equal(reviewDraftHasWork(withGap), true);
  assert.equal(reviewDraftHasWork(parseSubmissionReview({})), false);

  const solid = parseSubmissionReview({
    summary: 'All correct.',
    draftScore: '100',
    gaps: [],
    items: [{ id: 'item-1', prompt: 'Should not assign this' }],
  });
  assert.equal(solid.draftScore, 100);
  assert.equal(reviewHasGap(solid), false);
  assert.equal(solid.items[0]?.prompt, 'Should not assign this');
});

test('asDraftScore clamps to 0–100 and ignores junk', () => {
  assert.equal(asDraftScore(140), 100);
  assert.equal(asDraftScore(-3), 0);
  assert.equal(asDraftScore('88'), 88);
  assert.equal(asDraftScore('nope'), null);
  assert.equal(asDraftScore(null), null);
});

test('practiceWorkLines pair prompts with student answers', () => {
  const lines = practiceWorkLines(
    [
      { id: 'item-1', prompt: 'What is 8 × 7?', answerKey: '56' },
      { id: 'item-2', prompt: 'What is 9 × 6?' },
    ],
    { 'item-1': '54', 'item-2': '  ' },
  );
  assert.equal(lines[0]?.answer, '54');
  assert.equal(lines[0]?.expected, '56');
  assert.equal(lines[1]?.answer, '');
  assert.equal(answerText({ 'item-1': '54' }, 'item-1'), '54');
  assert.equal(answerText({ 'item-1': 12 }, 'item-1'), '12');
});

test('formatWorkForPrompt is a compact teacher-facing packet', () => {
  const text = formatWorkForPrompt({
    title: 'Practice: regrouping',
    kind: 'practice',
    keyNotes: 'Textbook method',
    lines: [{ id: 'item-1', prompt: '34 + 28', answer: '52', expected: '62' }],
  });
  assert.match(text, /Kind: practice/);
  assert.match(text, /Teacher key note: Textbook method/);
  assert.match(text, /Expected: 62/);
  assert.match(text, /Student: 52/);
});

test('formatWorkForPrompt keeps lesson review human-readable', () => {
  const text = formatWorkForPrompt({
    title: 'FoM 1.2',
    kind: 'lesson',
    lessonLines: [
      { label: 'Score', value: '5 of 6 correct · 1 skipped' },
      { label: '1. 4468 − 2397', value: 'Correct · 2071 · 3 tries · corrected after a miss' },
    ],
  });
  assert.match(text, /Kind: lesson/);
  assert.match(text, /5 of 6 correct/);
  assert.match(text, /corrected after a miss/);
  assert.equal(text.includes('{"user"'), false);
});

test('mergeReviewDraft keeps teacher questions when AI returns nothing', () => {
  const prior = {
    ...parseSubmissionReview({
      gaps: [{ label: 'regrouping', sortOrder: 1 }],
      items: [{ id: 'item-1', prompt: 'What is 34 + 28?' }],
      teacherNote: 'Watch the tens.',
    }),
    items: [
      { id: 'item-1', prompt: 'What is 34 + 28?' },
      { id: 'item-2', prompt: '' },
    ],
  };
  const merged = mergeReviewDraft(prior, emptyIncoming());
  assert.equal(merged.gaps[0]?.label, 'regrouping');
  assert.equal(merged.items[0]?.prompt, 'What is 34 + 28?');
  assert.equal(merged.items[1]?.id, 'item-2');
  assert.equal(merged.teacherNote, 'Watch the tens.');
});

test('parseSubmissionReview reads a JSON string the same as an object', () => {
  const asObject = parseSubmissionReview({
    summary: 'Missed two.',
    gaps: [{ label: 'regrouping', sortOrder: 1 }],
  });
  const asString = parseSubmissionReview(
    JSON.stringify({ summary: 'Missed two.', gaps: [{ label: 'regrouping', sortOrder: 1 }] }),
  );
  assert.deepEqual(asString, asObject);
});

test('withPendingGap commits a typed label without dropping existing gaps', () => {
  const draft = withPendingGap(
    parseSubmissionReview({ gaps: [{ label: 'place value', sortOrder: 1 }] }),
    '  regrouping  ',
  );
  assert.deepEqual(
    draft.gaps.map((gap) => gap.label),
    ['place value', 'regrouping'],
  );
});

test('teacherDraftPrompt lists gaps and questions for the model', () => {
  const text = teacherDraftPrompt(
    parseSubmissionReview({
      gaps: [{ label: 'regrouping', sortOrder: 1 }],
      items: [{ id: 'item-1', prompt: 'What is 34 + 28?' }],
      teacherNote: 'Watch the tens.',
    }),
  );
  assert.match(text, /Teacher gaps: regrouping/);
  assert.match(text, /What is 34 \+ 28\?/);
  assert.match(text, /Watch the tens/);
});

function emptyIncoming() {
  return parseSubmissionReview({});
}

test('mergeReviewGaps keeps teacher labels and caps at three', () => {
  const merged = mergeReviewGaps(
    [{ label: 'regrouping', sortOrder: 1 }],
    [
      { label: 'place value', sortOrder: 1 },
      { label: 'Regrouping', sortOrder: 2 },
      { label: 'fractions', sortOrder: 3 },
      { label: 'extra', sortOrder: 4 },
    ],
  );
  assert.deepEqual(
    merged.map((gap) => gap.label),
    ['regrouping', 'place value', 'fractions'],
  );
});

test('submissionReviewPath stays under the class', () => {
  assert.equal(submissionReviewPath('class-1', 'sub-9'), '/class/class-1/review/sub-9');
});
