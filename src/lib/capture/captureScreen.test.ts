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

test('unified Capture: Image Preview, icon row, text+mic, Ask AI, inline confirm', () => {
  assert.doesNotMatch(source, /SectionHeader[^\n]*Image Preview|label="Image Preview"/);
  assert.match(source, /mediaHits:[\s\S]*?justifyContent:\s*'space-evenly'/);
  assert.match(source, /label="Camera"/);
  assert.match(source, /label="Photo or Video"/);
  assert.match(source, /label="Files"/);
  assert.match(source, /Ask AI to process/);
  assert.match(source, /This will be/);
  assert.match(source, /classify-capture/);
  assert.match(source, /MediaTypeOptions\.All/);
  assert.match(source, /pickMessageDocument/);
  assert.match(source, /transcribeAudioDirect/);
  assert.match(source, /startLiveDictation/);
  assert.match(source, /isLiveDictationSupported/);
  assert.match(source, /dictationBaseRef/);
  assert.match(source, /onDrop/);
  assert.doesNotMatch(source, /Who is this\?/);
  assert.doesNotMatch(source, /Ask AI to guess the name/);
  assert.doesNotMatch(source, /Record the name/);
});

test('PhotoFrame empty well uses Image Preview and drops one-student meta', () => {
  const frame = readFileSync(join(process.cwd(), 'src/components/ui/PhotoFrame.tsx'), 'utf8');
  assert.match(frame, /Image Preview/);
  assert.doesNotMatch(frame, /Photograph the work/);
  assert.doesNotMatch(frame, /One student per photo/);
});

test('Pack B Approve path remains reachable on Capture', () => {
  assert.match(source, /KeygradePackBReview/);
  assert.match(source, /canApproveKeygrade/);
  assert.match(source, /persistCapture\('approve'/);
});
