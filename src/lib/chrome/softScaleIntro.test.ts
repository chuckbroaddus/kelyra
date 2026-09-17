import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  COMET_ORBIT,
  LETTER_INK,
  SOFT_FACE,
  SOFT_INTRO,
  SOFT_MOTION,
} from '../../components/ui/softLetterScale.ts';

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('LETTER_INK documents 512-space Soft v8b letter box (not Soft PNG scale)', () => {
  assert.equal(LETTER_INK.canvas, 512);
  assert.equal(LETTER_INK.width, 443);
  assert.equal(LETTER_INK.height, 468);
  assert.equal(LETTER_INK.x, 24);
  assert.equal(LETTER_INK.y, 21);
  assert.equal(LETTER_INK.cx, 245);
  assert.equal(LETTER_INK.cy, 254.5);
});

test('SoftMark letter is kelyra.png 1:1; no SOFT_LETTER_SCALE size solution', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const metrics = read('src/components/ui/softLetterScale.ts');
  assert.match(soft, /assets\/brand\/kelyra\.png/);
  assert.doesNotMatch(soft, /kelyra-soft\.png/);
  assert.doesNotMatch(soft, /SOFT_LETTER_SCALE/);
  assert.doesNotMatch(metrics, /export const SOFT_LETTER_SCALE/);
  assert.match(soft, /LETTER_INK/);
  assert.match(soft, /resizeMode="contain"/);
});

test('SoftMark morph intro keys: lids/faceGrow/mouth/cometIn', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.match(soft, /faceGrow/);
  assert.match(soft, /lids/);
  assert.match(soft, /mouth/);
  assert.match(soft, /cometIn/);
  assert.match(soft, /cometScale/);
  assert.match(soft, /SOFT_INTRO/);
  assert.ok(SOFT_INTRO.faceMs >= 200);
  assert.ok(SOFT_INTRO.cometMs >= 300);
  assert.ok(SOFT_INTRO.outroMs >= 150);
});

test('look loop independent of blink; glance ~8s; blink 4.4s', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.match(soft, /lookX/);
  assert.match(soft, /pupilX/);
  assert.match(soft, /blinkPeriodMs/);
  assert.match(soft, /glancePeriodMs|upperLeft|upper-left|go\(upperLeft\)/);
  assert.equal(SOFT_MOTION.blinkPeriodMs, 4400);
  assert.equal(SOFT_MOTION.glancePeriodMs, 8000);
  // Separate effects: blink loop and look loop both gated on showMotion
  assert.match(soft, /\/\/ Blink loop/);
  assert.match(soft, /Glance \/ look loop/);
});

test('wobble is rotate-only (no letter scale grow)', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.match(soft, /wobbleRotate/);
  assert.match(soft, /rotate only|Wobble: rotate only/);
  assert.doesNotMatch(soft, /faceScaleX|1\.045|SOFT_LETTER_SCALE/);
  // Letter Image itself is not scaled by wobble
  assert.match(soft, /transform: \[\{ rotate: wobbleRotate \}\]/);
});

test('face coords match Soft v8b lock (eyes/glasses/mouth)', () => {
  assert.equal(SOFT_FACE.leftEye.x, 169);
  assert.equal(SOFT_FACE.leftEye.y, 198);
  assert.equal(SOFT_FACE.rightEye.x, 292);
  assert.equal(SOFT_FACE.rightEye.y, 198);
  assert.equal(SOFT_FACE.glassesLeftR, 31.1);
  assert.equal(SOFT_FACE.glassesRightR, 32.4);
  assert.equal(SOFT_FACE.mouth.x, 230);
  assert.equal(SOFT_FACE.mouth.y, 268);
  assert.equal(SOFT_FACE.mouth.halfW, 39);
});

test('KelyraMark: idle unmount Soft after outro; SoftMark owns morph', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /mode=\{working \? 'working' : 'static'\}/);
  assert.match(mark, /softMounted/);
  assert.match(mark, /SOFT_INTRO\.outroMs/);
  assert.doesNotMatch(mark, /opacity: softOpacity[\s\S]{0,80}SoftMark/);
  assert.match(mark, /assets\/brand\/kelyra\.png/);
});

test('COMET_ORBIT: tilt 26° oval squash + yaw-rev (−360)', () => {
  assert.equal(COMET_ORBIT.tiltXDeg, 26);
  assert.equal(COMET_ORBIT.cantZDeg, 14);
  assert.ok(Math.abs(COMET_ORBIT.ovalY - Math.cos((26 * Math.PI) / 180)) < 1e-9);
  assert.ok(COMET_ORBIT.ovalY < 1 && COMET_ORBIT.ovalY > 0.85);
  assert.equal(COMET_ORBIT.yawToDeg, -360);
  assert.equal(COMET_ORBIT.radiusOfLetter, 0.41);
  assert.equal(COMET_ORBIT.webYawNativeId, 'kelyra-soft-yaw-spin');
});

test('SoftMark comet: oval + SoT yaw; web CSS via nativeID (no Animated.loop hang)', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.match(soft, /COMET_ORBIT/);
  assert.match(soft, /ovalY/);
  assert.match(soft, /orbitR \* Math\.cos/);
  assert.match(soft, /orbitR \* Math\.sin\(rad\) \* ovalY/);
  assert.doesNotMatch(soft, /rotateX:\s*['"]26deg['"]/);
  assert.match(soft, /ensureSoftCometYawCss/);
  assert.match(soft, /webYawNativeId/);
  assert.match(soft, /Platform\.OS === 'web'/);
});

test('SoftMark has zero RN className; web yaw via nativeID + #id CSS', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.doesNotMatch(soft, /\bclassName\s*:/);
  assert.doesNotMatch(soft, /className=/);
  assert.match(soft, /nativeID=\{showMotion \? COMET_ORBIT\.webYawNativeId/);
  assert.match(soft, /#\$\{COMET_ORBIT\.webYawNativeId\}/);
  assert.match(soft, /ensureSoftCometYawCss/);
  assert.doesNotMatch(soft, /transform:\s*showMotion \? \[\{ rotate \}\] : undefined/);
});
