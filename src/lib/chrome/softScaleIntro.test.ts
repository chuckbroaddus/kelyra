import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { SOFT_INTRO, SOFT_LETTER_SCALE } from '../../components/ui/softLetterScale.ts';

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('SOFT_LETTER_SCALE is < 1 (scale Soft down; never upscale idle K)', () => {
  assert.ok(SOFT_LETTER_SCALE > 0.5 && SOFT_LETTER_SCALE < 1);
  assert.equal(SOFT_LETTER_SCALE, 0.78);
});

test('SoftMark uses SOFT_LETTER_SCALE and staged intro (blink/grow/comet)', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.match(soft, /SOFT_LETTER_SCALE/);
  assert.match(soft, /faceGrow/);
  assert.match(soft, /blink/);
  assert.match(soft, /cometIn/);
  assert.match(soft, /cometScale/);
  assert.match(soft, /styles\.mouth/);
  assert.doesNotMatch(soft, /1\.045/);
});

test('SOFT_INTRO timings documented', () => {
  assert.ok(SOFT_INTRO.faceMs >= 200);
  assert.ok(SOFT_INTRO.cometMs >= 300);
  assert.ok(SOFT_INTRO.outroMs >= 150);
});

test('KelyraMark does not opacity-crossfade Soft into a pop (SoftMark owns intro)', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /mode=\{working \? 'working' : 'static'\}/);
  // Soft wrapper is a plain View, not softOpacity-driven
  assert.doesNotMatch(mark, /opacity: softOpacity[\s\S]{0,80}SoftMark/);
});
