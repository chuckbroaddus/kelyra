import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowOriginalPhotoFallback,
  cacheKeyForUri,
  isThumbStoragePath,
  originalStoragePath,
  thumbStoragePath,
} from './paths.ts';

test('avatar and list thumbs never fall back to the original still by default', () => {
  assert.equal(allowOriginalPhotoFallback(undefined), false);
  assert.equal(allowOriginalPhotoFallback(false), false);
  assert.equal(allowOriginalPhotoFallback(true), true);
});

test('thumb path convention is stable and idempotent', () => {
  assert.equal(thumbStoragePath('class/a.jpg'), 'class/a_thumb.jpg');
  assert.equal(thumbStoragePath('class/a_thumb.jpg'), 'class/a_thumb.jpg');
  assert.equal(thumbStoragePath('owner/noext'), 'owner/noext_thumb');
  assert.equal(isThumbStoragePath('class/a_thumb.jpg'), true);
  assert.equal(isThumbStoragePath('class/a.jpg'), false);
  assert.equal(originalStoragePath('class/a_thumb.jpg'), 'class/a.jpg');
  assert.equal(originalStoragePath('class/a.jpg'), 'class/a.jpg');
});

test('cacheKeyForUri strips the signed token so expo-image can reuse disk cache', () => {
  const signed =
    'https://abc.supabase.co/storage/v1/object/sign/photos/teacher/shot.jpg?token=abc.def.ghi';
  assert.equal(cacheKeyForUri(signed), 'photos/teacher/shot.jpg');
  assert.equal(
    cacheKeyForUri('https://abc.supabase.co/storage/v1/object/public/photos/logo.png'),
    'photos/logo.png',
  );
  assert.equal(cacheKeyForUri('file:///tmp/local.jpg'), 'tmp/local.jpg');
});
