import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { SOFT_INTRO_TOTAL_MS, softFaceIntro } from './softFaceIntro.ts';
import { SOFT_INTRO } from './softLetterScale.ts';

const src = readFileSync(join(process.cwd(), 'src/components/ui/SoftMarkShared.tsx'), 'utf8');

test('SoftMark intro/outro never use the native driver (Fabric re-render pins face at 0)', () => {
  assert.equal(src.includes('useNativeDriver: true'), false);
  assert.match(src, /const SOFT_NATIVE_DRIVER = false;/);
  assert.equal((src.match(/useNativeDriver: SOFT_NATIVE_DRIVER/g) ?? []).length, 2);
});

test('face layer is a plain View above the K (zIndex), driven by the rAF clock', () => {
  assert.match(src, /zIndex: Z_FACE,\s*elevation: Platform\.OS === 'android' \? Z_FACE : undefined,\s*opacity: face\.opacity/);
  assert.match(src, /transform: \[\{ scale: face\.scale \}\]/);
  assert.doesNotMatch(src, /faceOpacity|faceGrow|blinkOpen/);
  assert.match(src, /setIntroElapsed\(elapsed\)/);
});

test('softFaceIntro grows in, blinks open, then hands lids to the loop', () => {
  assert.deepEqual(softFaceIntro(false, false, 500), { opacity: 0, scale: 0.2, lid: null });
  assert.deepEqual(softFaceIntro(true, true, 0), { opacity: 1, scale: 1, lid: null });
  const start = softFaceIntro(true, false, 0);
  assert.equal(start.opacity, 0);
  assert.equal(start.lid, 1);
  const mid = softFaceIntro(true, false, SOFT_INTRO.faceMs / 2);
  assert.ok(mid.opacity > 0.5 && mid.opacity < 1);
  const grown = softFaceIntro(true, false, SOFT_INTRO.faceMs);
  assert.equal(grown.opacity, 1);
  assert.equal(grown.scale, 1);
  const after = softFaceIntro(true, false, SOFT_INTRO_TOTAL_MS + 1);
  assert.equal(after.lid, null);
  assert.equal(after.opacity, 1);
});

test('SoftMark never uses StyleSheet.absoluteFillObject (removed in RN 0.86; face fell below the K)', () => {
  assert.doesNotMatch(src, /absoluteFillObject/);
  assert.match(src, /\.\.\.FILL,\s*zIndex: Z_FACE/);
});
