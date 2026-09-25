import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { applyDictationResult, dictationValue, EMPTY_DICTATION, joinDictation } from './dictationText.ts';

test('iOS style: one growing interim result replaces itself', () => {
  let s = applyDictationResult(EMPTY_DICTATION, false, 'hello');
  s = applyDictationResult(s, false, 'hello there');
  assert.equal(dictationValue(s), 'hello there');
  s = applyDictationResult(s, true, 'Hello there.');
  assert.equal(dictationValue(s), 'Hello there.');
});

test('Android / web style: finalized segments append, interim trails', () => {
  let s = applyDictationResult(EMPTY_DICTATION, true, 'First part.');
  s = applyDictationResult(s, false, 'second');
  assert.equal(dictationValue(s), 'First part. second');
  s = applyDictationResult(s, true, 'Second part.');
  assert.equal(dictationValue(s), 'First part. Second part.');
});

test('joinDictation appends after existing field text', () => {
  assert.equal(joinDictation('', ' hi '), 'hi');
  assert.equal(joinDictation('Already here ', 'more'), 'Already here more');
  assert.equal(joinDictation('Keep me', '   '), 'Keep me');
});

test('DEVICE-STT: device recognizer first, AI only as fallback; Journal mics use it', () => {
  const lib = readFileSync(join(process.cwd(), 'src/lib/media/dictation.ts'), 'utf8');
  const start = lib.slice(lib.indexOf('export async function startDictation'));
  assert.ok(start.indexOf('startDeviceDictation') < start.indexOf('startAiDictation'));
  assert.match(lib, /require\('expo-speech-recognition'\)/);
  assert.doesNotMatch(lib, /^import .*from 'expo-speech-recognition'/m);
  const screen = readFileSync(join(process.cwd(), 'src/app/diary.tsx'), 'utf8');
  assert.match(screen, /startDictation\(/);
  assert.doesNotMatch(screen, /transcribeAudioDirect/);
  const app = readFileSync(join(process.cwd(), 'app.json'), 'utf8');
  assert.match(app, /expo-speech-recognition/);
});
