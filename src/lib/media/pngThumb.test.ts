import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('PNG photos (transparent avatar cutouts) keep a PNG thumb', () => {
  const src = readFileSync(new URL('./upload.ts', import.meta.url), 'utf8');
  assert.match(src, /PNG-THUMB/);
  assert.match(src, /const thumbMime = prepared\.mimeType\.includes\('png'\) \? 'image\/png' : 'image\/jpeg';/);
  assert.match(src, /makePhotoThumb\(prepared\.uri, thumbMime\)/);
  assert.doesNotMatch(src, /makePhotoThumb\(prepared\.uri, 'image\/jpeg'\)/);
  assert.doesNotMatch(src, /uploadObject\('photos', thumbPath, thumbBytes, 'image\/jpeg'\)/);
});

test('PNG resize never reads the JPEG-encoded measure copy (keeps cutout alpha)', () => {
  const src = readFileSync(new URL('./photo.ts', import.meta.url), 'utf8');
  assert.match(src, /PNG-ALPHA/);
  assert.match(src, /const source = png \? uri : info\.uri;/);
  assert.match(src, /manipulateAsync\(source, actions,/);
  assert.doesNotMatch(src, /manipulateAsync\(info\.uri, actions,/);
});
