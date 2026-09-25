import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const src = readFileSync(join(process.cwd(), 'src/components/ui/SoftMarkShared.tsx'), 'utf8');

test('SoftMark intro/outro never use the native driver (Fabric re-render pins face at 0)', () => {
  assert.equal(src.includes('useNativeDriver: true'), false);
  assert.match(src, /const SOFT_NATIVE_DRIVER = false;/);
  assert.equal((src.match(/useNativeDriver: SOFT_NATIVE_DRIVER/g) ?? []).length, 9);
});

test('face layer still fades/grows from faceOpacity + faceGrow', () => {
  assert.match(src, /opacity: faceOpacity/);
  assert.match(src, /scale: faceGrow\.interpolate/);
});
