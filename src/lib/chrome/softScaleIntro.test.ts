import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  BEAD_N,
  BEAD_SIZE_HEAD,
  BEAD_SIZE_TAIL_DELTA,
  TRAIL_SPAN,
  softCometFrame,
  softCometPlace,
  softLetterHeight,
} from '../../components/ui/softCometFacing.ts';
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

test('SoftMark is native RN Views — no WebView / no HTML host runtime', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const softWeb = read('src/components/ui/SoftMark.web.tsx');
  assert.doesNotMatch(soft, /from ['"]react-native-webview['"]/);
  assert.doesNotMatch(soft, /import\s*\{[^}]*\bWebView\b/);
  assert.doesNotMatch(soft, /softV8bHostDocument|softV8bHostInnerHtml/);
  assert.doesNotMatch(soft, /injectJavaScript|onLoadEnd/);
  assert.doesNotMatch(softWeb, /from ['"]react-native-webview['"]/);
  assert.doesNotMatch(softWeb, /import\s*\{[^}]*\bWebView\b/);
  assert.doesNotMatch(softWeb, /dangerouslySetInnerHTML|softV8bHost/);
  assert.match(soft, /SoftMark/);
  assert.match(soft, /SoftMode/);
  const shared = read('src/components/ui/SoftMarkShared.tsx');
  assert.match(shared, /export function SoftMark/);
  assert.match(shared, /export type SoftMode/);
  assert.match(shared, /requestAnimationFrame/);
  assert.match(shared, /softCometFrame/);
  assert.match(shared, /kelyra\.png/);
  assert.doesNotMatch(shared, /kelyra-soft\.png/);
  assert.doesNotMatch(shared, /SOFT_LETTER_SCALE/);
  // Web shares SoftMarkShared tree — no separate HTML host
  assert.match(softWeb, /export \{[\s\S]*SoftMark/);
  assert.match(softWeb, /SoftMarkShared/);
  assert.doesNotMatch(shared, /from ['"]react-native-webview['"]/);
  assert.doesNotMatch(shared, /import\s*\{[^}]*\bWebView\b/);
});

test('SoftMark SoftMode static|working + ORBIT_PAD + overflow visible', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const shared = read('src/components/ui/SoftMarkShared.tsx');
  assert.match(soft, /SoftMode/);
  assert.match(shared, /export type SoftMode/);
  assert.match(shared, /'static' \| 'working'|static.*working/);
  assert.match(shared, /ORBIT_PAD_FRAC/);
  assert.match(shared, /overflow:\s*['"]visible['"]/);
  assert.ok(SOFT_INTRO.faceMs >= 200);
  assert.ok(SOFT_INTRO.cometMs >= 300);
  assert.ok(SOFT_INTRO.outroMs >= 150);
});

test('SoftMark has zero RN className on View props', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const softWeb = read('src/components/ui/SoftMark.web.tsx');
  const shared = read('src/components/ui/SoftMarkShared.tsx');
  for (const src of [soft, softWeb, shared]) {
    assert.doesNotMatch(src, /\bclassName\s*:/);
    assert.doesNotMatch(src, /className=/);
  }
});

test('face coords match Soft v8b lock; runtime face is eyes+glasses no mouth', () => {
  assert.equal(SOFT_FACE.leftEye.x, 169);
  assert.equal(SOFT_FACE.leftEye.y, 198);
  assert.equal(SOFT_FACE.rightEye.x, 292);
  assert.equal(SOFT_FACE.rightEye.y, 198);
  assert.equal(SOFT_FACE.glassesLeftR, 31.1);
  assert.equal(SOFT_FACE.glassesRightR, 32.4);
  assert.equal(SOFT_FACE.mouth.x, 230);
  assert.equal(SOFT_FACE.mouth.y, 268);
  assert.equal(SOFT_FACE.mouth.halfW, 39);
  assert.equal(COMET_ORBIT.faceMode, 'eyes-glasses-nomouth');
  const shared = read('src/components/ui/SoftMarkShared.tsx');
  assert.match(shared, /SoftFaceEyesGlasses|eyes-glasses-nomouth/);
  assert.doesNotMatch(shared, /SoftMouth|className=\"mouth\"/);
});

test('KelyraMark: idle letter kelyra.png; SoftMark only while working; outro before unmount', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /mode=\{working \? 'working' : 'static'\}/);
  assert.match(mark, /softMounted/);
  assert.match(mark, /SOFT_INTRO\.outroMs/);
  assert.match(mark, /assets\/brand\/kelyra\.png/);
  assert.doesNotMatch(mark, /opacity: softOpacity[\s\S]{0,80}SoftMark/);
});

test('COMET_ORBIT locked oval for iPhone chrome (ovalY 0.58, cant 14, tilt 26)', () => {
  assert.equal(COMET_ORBIT.tiltXDeg, 26);
  assert.equal(COMET_ORBIT.cantZDeg, 14);
  assert.equal(COMET_ORBIT.ovalY, 0.58);
  assert.ok(COMET_ORBIT.ovalY < 0.75, 'ovalY must read elliptical at ~40px chrome');
  assert.ok(COMET_ORBIT.ovalY >= 0.55 && COMET_ORBIT.ovalY <= 0.62);
  assert.equal(COMET_ORBIT.yawToDeg, -360);
  assert.equal(COMET_ORBIT.radiusOfLetter, 0.41);
  assert.equal(COMET_ORBIT.facingMode, 'js-always');
  assert.equal(COMET_ORBIT.occlusionMode, 'phase-z');
  assert.equal(COMET_ORBIT.trailMode, 'js-beads');
  assert.equal(SOFT_MOTION.blinkPeriodMs, 4400);
  assert.equal(SOFT_MOTION.glancePeriodMs, 8000);
  assert.equal(SOFT_MOTION.orbitMs, 2450);
});

test('softCometFacing exports place/frame math + thick bead trail contracts', () => {
  const facing = read('src/components/ui/softCometFacing.ts');
  assert.match(facing, /export function softCometPlace/);
  assert.match(facing, /export function softCometFrame/);
  assert.match(facing, /export const BEAD_N = 14/);
  assert.match(facing, /export const TRAIL_SPAN = 0\.38/);
  assert.match(facing, /0\.14/);
  assert.match(facing, /0\.095/);
  assert.equal(BEAD_N, 14);
  assert.equal(TRAIL_SPAN, 0.38);
  assert.equal(BEAD_SIZE_HEAD, 0.14);
  assert.equal(BEAD_SIZE_TAIL_DELTA, 0.095);
  // No WebView inject path
  assert.doesNotMatch(facing, /softCometFacingInjectScript|injectJavaScript/);
  assert.doesNotMatch(facing, /startSoftCometFacing/);
});

test('softCometPlace / softCometFrame: yaw-rev oval + phase-z front/behind', () => {
  const mark = 40;
  const letter = softLetterHeight(mark);
  assert.ok(Math.abs(letter - (mark * 468) / 512) < 1e-9);
  const r = letter * COMET_ORBIT.radiusOfLetter;
  // theta=0 → place near bottom of oval (cos), then cantZ
  const p0 = softCometPlace(0, r);
  assert.ok(Number.isFinite(p0.x) && Number.isFinite(p0.y));
  // front when cos(theta)>0 → phase 0 → theta 0 → front
  const f0 = softCometFrame(0, mark);
  assert.equal(f0.front, true);
  assert.equal(f0.beads.length, BEAD_N);
  assert.ok(f0.headSize > f0.beads[BEAD_N - 1]!.size);
  // phase 0.5 → theta = −π → cos(theta) = −1 → behind
  const fHalf = softCometFrame(0.5, mark);
  assert.equal(fHalf.front, false);
});

test('HTML Soft v8b remains design SoT only (not SoftMark runtime)', () => {
  const host = read('assets/brand/soft-v8b-host.html');
  const note = read('notes/company/soft-native-rn-runtime.md');
  assert.match(host, /soft-v8b-host|id="soft-root"/);
  assert.match(note, /native RN|WebView Soft abandoned|design SoT/i);
  assert.match(note, /2026-09-17/);
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.doesNotMatch(soft, /soft-v8b-host\.html/);
});

test('SoftMark comet: always-facing ball + bead trail zIndex swap', () => {
  const soft = read('src/components/ui/SoftMarkShared.tsx');
  assert.match(soft, /SoftCometBall|LinearGradient/);
  assert.match(soft, /BEAD_N|frame\.beads/);
  assert.match(soft, /zIndex/);
  assert.match(soft, /frame\.front/);
  assert.match(soft, /ORBIT_PAD_FRAC/);
});
