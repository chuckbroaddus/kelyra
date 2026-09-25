import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ROW_BOTTOM,
  ROW_COMPACT_H,
  ROW_GAP,
  ROW_META_H,
  ROW_PAD_V,
  ROW_PHOTO_H,
  ROW_TEXT_LINE,
  ROW_TITLE_H,
  planDiaryRow,
} from './rowPlan.ts';

const photo = (id: string) => ({ id, kind: 'photo' });
const file = (id: string, name: string) => ({ id, kind: 'file', file_name: name });

test('plain short entry stays the classic compact row', () => {
  const plan = planDiaryRow({ title: 'Hi', body: 'short', media: [], meta: 'tag', charsPerLine: 40 });
  assert.equal(plan.compact, true);
  assert.equal(plan.height, ROW_COMPACT_H);
  if (plan.compact) {
    assert.equal(plan.headline, 'Hi');
    assert.equal(plan.meta, 'short · tag');
  }
});

test('photo entry keeps title and body and grows to fit (the clipped-slice bug)', () => {
  const plan = planDiaryRow({
    title: 'Field trip',
    body: 'We went out.\n[Photo 1]\nGreat day.',
    media: [photo('p1')],
    meta: '3:00 PM',
    charsPerLine: 40,
  });
  assert.equal(plan.compact, false);
  if (plan.compact) return;
  assert.deepEqual(
    plan.blocks.map((b) => b.kind),
    ['title', 'text', 'photo', 'text', 'meta'],
  );
  const content = ROW_TITLE_H + ROW_TEXT_LINE + ROW_PHOTO_H + ROW_TEXT_LINE + ROW_META_H + ROW_GAP * 4;
  assert.equal(plan.height, ROW_BOTTOM + ROW_PAD_V * 2 + content);
});

test('photos without a marker (older entries) go after the text', () => {
  const plan = planDiaryRow({ title: '', body: 'Note', media: [photo('a')], meta: '', charsPerLine: 40 });
  assert.equal(plan.compact, false);
  if (!plan.compact) assert.deepEqual(plan.blocks.map((b) => b.kind), ['text', 'photo']);
});

test('several unmarked photos form a grid; marked ones stay inline', () => {
  const plan = planDiaryRow({
    body: '[Photo 2]\nhello',
    media: [photo('a'), photo('b'), photo('c')],
    meta: '',
    charsPerLine: 40,
  });
  if (plan.compact) assert.fail('expected rich row');
  assert.deepEqual(plan.blocks[0], { kind: 'photo', index: 1 });
  assert.deepEqual(plan.blocks[2], { kind: 'grid', indices: [0, 2] });
});

test('file markers match by name; missing media markers are hidden', () => {
  const plan = planDiaryRow({
    body: 'See [File: plan.pdf] and [Photo 4]',
    media: [file('f1', 'plan.pdf')],
    meta: '',
    charsPerLine: 40,
  });
  if (plan.compact) assert.fail('expected rich row');
  assert.deepEqual(plan.blocks.map((b) => b.kind), ['text', 'file', 'text']);
});

test('long text is capped per segment', () => {
  const plan = planDiaryRow({ body: 'x'.repeat(1000), media: [photo('a')], meta: '', charsPerLine: 40 });
  if (plan.compact) assert.fail('expected rich row');
  const text = plan.blocks.find((b) => b.kind === 'text');
  assert.equal(text && text.kind === 'text' ? text.lines : 0, 4);
});

test('multi-line text without attachments becomes a rich row showing the body', () => {
  const plan = planDiaryRow({ title: 'T', body: 'a\nb\nc', media: [], meta: 'm', charsPerLine: 40 });
  assert.equal(plan.compact, false);
});

test('links become compact chips at the end', () => {
  const plan = planDiaryRow({ body: 'read https://example.com/x now', media: [], meta: '', charsPerLine: 40 });
  if (plan.compact) assert.fail('expected rich row');
  assert.deepEqual(plan.blocks.map((b) => b.kind), ['text', 'link']);
});
