import assert from 'node:assert/strict';
import test from 'node:test';

import { allowOriginalPhotoFallback, thumbStoragePath } from './paths.ts';

test('avatar thumbs never fall back to the original still', () => {
  assert.equal(allowOriginalPhotoFallback(undefined), true);
  assert.equal(allowOriginalPhotoFallback(true), true);
  assert.equal(allowOriginalPhotoFallback(false), false);
  assert.equal(thumbStoragePath('class/a.jpg'), 'class/a_thumb.jpg');
});
