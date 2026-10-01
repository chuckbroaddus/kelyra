import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(process.cwd(), 'src/components/MultiShotCameraSession.tsx'), 'utf8');

test('multi-shot controls render a centered round shutter (not full-width SecondaryButton)', () => {
  assert.match(source, /accessibilityLabel=\{atCap \? shutterDisabledMessage\(count, max\) \|\| 'At limit' : 'Shutter'\}/);
  assert.match(source, /styles\.shutterOuter/);
  assert.match(source, /styles\.shutterInner/);
  assert.match(source, /width:\s*78/);
  assert.match(source, /borderRadius:\s*39/);
  // Flip is a compact side control; count sits opposite. Tray still gates on count > 0.
  assert.match(source, /accessibilityLabel=\{facing === 'back' \? 'Front camera' : 'Back camera'\}/);
  assert.match(source, /styles\.sideSlot/);
  assert.match(source, /\{count\}\/\{max\}/);
  assert.match(source, /count > 0 \? \(/);
  assert.match(source, /styles\.tray/);
  // SecondaryButton width:100% was the device bug (Front camera stole the row).
  assert.doesNotMatch(
    source,
    /controls[\s\S]*SecondaryButton[\s\S]*Front camera[\s\S]*IconButton[\s\S]*name="capture"/,
  );
  assert.doesNotMatch(source, /name="capture"/);
});

test('multi-shot shutter path fires takePictureAsync with visible feedback', () => {
  assert.match(source, /takePictureAsync\(/);
  assert.match(source, /animateShutter/);
  assert.match(source, /pulseFlash\(/);
  assert.match(source, /styles\.flash/);
  assert.match(source, /addShot\(/);
});

test('multi-shot arms hardware volume shutter only while session is visible', () => {
  assert.match(source, /import \{ startVolumeShutter \} from 'volume-shutter'/);
  assert.match(source, /startVolumeShutter\(/);
  assert.match(source, /onShutterRef\.current/);
  // Gated on visible so presses outside the session never capture.
  assert.match(source, /if \(!visible\) return;\s*return startVolumeShutter/s);
});
