import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { JPEG_HARD_MAX_BYTES, JPEG_LONG_EDGE_MAX } from '../src/config.ts';
import { longEdgeOf, normalizePageJpeg } from '../src/jpeg.ts';

test('I2-jpeg: downscales huge page to long-edge ≤2048 and ≤4MB', async () => {
  const big = await sharp({
    create: { width: 4000, height: 5000, channels: 3, background: { r: 240, g: 240, b: 240 } },
  })
    .png()
    .toBuffer();
  const pair = await normalizePageJpeg(big);
  assert.ok(longEdgeOf(pair.width, pair.height) <= JPEG_LONG_EDGE_MAX);
  assert.ok(pair.full.byteLength <= JPEG_HARD_MAX_BYTES);
  assert.ok(pair.thumb.byteLength > 0);
  const thumbMeta = await sharp(pair.thumb).metadata();
  assert.ok(longEdgeOf(thumbMeta.width ?? 0, thumbMeta.height ?? 0) <= 400);
});

test('I2-jpeg: small source stays below 1600 (allowed)', async () => {
  const small = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 200, b: 200 } },
  })
    .jpeg()
    .toBuffer();
  const pair = await normalizePageJpeg(small);
  assert.ok(longEdgeOf(pair.width, pair.height) <= 800);
});
