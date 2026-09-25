import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  diaryBodyWithoutTokens,
  fileToken,
  insertTokenAt,
  nextPhotoNumber,
  photoToken,
  removeToken,
  renumberStagedPhotoTokens,
  splitDiaryBody,
} from './inlineTokens.ts';

test('splitDiaryBody keeps text, photo, and file markers in order', () => {
  const body = 'Morning walk.\n[Photo 1]\nThen class.\n[File: plan.pdf]\nDone';
  assert.deepEqual(splitDiaryBody(body), [
    { kind: 'text', text: 'Morning walk.' },
    { kind: 'photo', n: 1 },
    { kind: 'text', text: 'Then class.' },
    { kind: 'file', name: 'plan.pdf' },
    { kind: 'text', text: 'Done' },
  ]);
});

test('splitDiaryBody on plain text is one segment; empty body is none', () => {
  assert.deepEqual(splitDiaryBody('  hello  '), [{ kind: 'text', text: 'hello' }]);
  assert.deepEqual(splitDiaryBody(''), []);
  assert.deepEqual(splitDiaryBody('[Photo 2]'), [{ kind: 'photo', n: 2 }]);
});

test('insertTokenAt puts the marker on its own line at the cursor', () => {
  const r = insertTokenAt('abc def', { start: 3, end: 3 }, photoToken(1));
  assert.equal(r.body, 'abc\n[Photo 1]\n def');
  assert.equal(r.body.slice(0, r.cursor), 'abc\n[Photo 1]\n');
  assert.equal(insertTokenAt('', null, photoToken(1)).body, '[Photo 1]');
  assert.equal(insertTokenAt('abc', null, photoToken(1)).body, 'abc\n[Photo 1]');
  assert.equal(insertTokenAt('abc\n', { start: 4, end: 4 }, photoToken(1)).body, 'abc\n[Photo 1]');
  assert.equal(insertTokenAt('abc', { start: 99, end: 99 }, fileToken('a.pdf')).body, 'abc\n[File: a.pdf]');
});

test('removeToken drops the marker and its line break', () => {
  assert.equal(removeToken('abc\n[Photo 1]\n def', '[Photo 1]'), 'abc\n def');
  assert.equal(removeToken('abc\n[Photo 1]', '[Photo 1]'), 'abc');
  assert.equal(removeToken('abc', '[Photo 1]'), 'abc');
});

test('fileToken strips brackets and line breaks from names', () => {
  assert.equal(fileToken('a]b[c\nd.pdf'), '[File: a b c d.pdf]');
});

test('nextPhotoNumber passes existing photos and markers', () => {
  assert.equal(nextPhotoNumber('', 0), 1);
  assert.equal(nextPhotoNumber('', 2), 3);
  assert.equal(nextPhotoNumber('[Photo 5]', 2), 6);
});

test('renumberStagedPhotoTokens closes gaps after a removed photo', () => {
  const body = 'a\n[Photo 1]\nb\n[Photo 3]\nc\n[Photo 4]';
  // Photo 1 already saved; staged were 3 and 4 (staged 2 was removed).
  assert.equal(renumberStagedPhotoTokens(body, [3, 4], 1), 'a\n[Photo 1]\nb\n[Photo 2]\nc\n[Photo 3]');
  // Swap-safe: 2 and 1 both staged in reverse order.
  assert.equal(renumberStagedPhotoTokens('[Photo 2] [Photo 1]', [2, 1], 0), '[Photo 1] [Photo 2]');
});

test('diaryBodyWithoutTokens strips markers', () => {
  assert.equal(diaryBodyWithoutTokens('hi\n[Photo 1]\nthere [File: x.pdf]'), 'hi\n\nthere');
});
