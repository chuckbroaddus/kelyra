import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(process.cwd(), 'src/app/capture.tsx'), 'utf8');

test('capture camera focus effect depends on the stable chrome setter', () => {
  assert.match(source, /const setForceHidden = chrome\.setForceHidden/);
  assert.match(source, /\[cameraOpen, setForceHidden\]/);
  assert.doesNotMatch(source, /\[cameraOpen, chrome\]/);
});
