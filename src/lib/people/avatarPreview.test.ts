import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const frame = readFileSync(new URL('./framePortrait.ts', import.meta.url), 'utf8');
const photos = readFileSync(new URL('./photos.ts', import.meta.url), 'utf8');
const form = readFileSync(new URL('../../components/ui/PeopleAdmin.tsx', import.meta.url), 'utf8');

test('prepareFramedPortrait cuts out + centers and always drops the probe upload', () => {
  assert.match(frame, /export async function prepareFramedPortrait\(/);
  assert.match(frame, /return await framePortraitFile\(input\.uri, url\);\s*\} finally \{\s*if \(tempAssetId\) await dropProbeAsset\(tempAssetId\);/);
});

test('a preframed photo is uploaded as-is (no second cutout)', () => {
  assert.match(frame, /const framed = input\.preframed\s*\? \{ uri: input\.uri, mimeType: input\.mimeType \}\s*: await prepareFramedPortrait\(input\);/);
  assert.match(photos, /preframed: input\.preframed,/);
});

test('create form processes right after the shot, shows the Working K, previews the result', () => {
  assert.match(form, /setProcessingPhoto\(true\);\s*try \{\s*const framed = await prepareFramedPortrait\(/);
  assert.match(form, /setPhoto\(\{ \.\.\.framed, framed: true \}\);/);
  assert.match(form, /processingPhoto \? 'Processing photo…' : null/);
  assert.match(form, /preframed: photo\.framed,/);
  assert.match(form, /disabled=\{busy \|\| processingPhoto\}/);
});
