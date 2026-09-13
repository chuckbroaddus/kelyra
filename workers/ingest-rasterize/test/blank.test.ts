import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { detectBlank } from '../src/blank.ts';

test('I2-blank: near-white JPEG is blank', async () => {
  const jpeg = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .jpeg()
    .toBuffer();
  assert.equal(await detectBlank(jpeg), true);
});

test('I2-blank: dark ink JPEG is not blank', async () => {
  const jpeg = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .jpeg()
    .toBuffer();
  assert.equal(await detectBlank(jpeg), false);
});
