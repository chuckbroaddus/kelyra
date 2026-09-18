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

test('SoftMark hosts Soft v8b SoT (soft-v8b-host / gas-svg / preserve-3d) — not bead SoftMark alone', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const softWeb = read('src/components/ui/SoftMark.web.tsx');
  const host = read('assets/brand/soft-v8b-host.html');
  const hostTs = read('src/components/ui/softV8bHostHtml.ts');
  assert.match(host, /soft-v8b-host|class="av"|id="soft-root"/);
  assert.match(host, /gas-svg/);
  assert.match(host, /preserve-3d/);
  assert.match(hostTs, /soft-v8b-host|SOFT_V8B_HOST_HTML|gas-svg/);
  assert.match(hostTs, /preserve-3d/);
  // Native: WebView host; web: real DOM host
  assert.match(soft, /WebView|react-native-webview/);
  assert.match(soft, /softV8bHostDocument|soft-v8b-host/);
  assert.match(softWeb, /dangerouslySetInnerHTML|createElement\('div'/);
  assert.match(softWeb, /softV8bHostInnerHtml|soft-v8b-host/);
  assert.doesNotMatch(soft, /kelyra-soft\.png/);
  assert.doesNotMatch(soft, /SOFT_LETTER_SCALE/);
});

test('SoftMark morph via .is-on; SoftMode + SoftMark export kept', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const softWeb = read('src/components/ui/SoftMark.web.tsx');
  const host = read('assets/brand/soft-v8b-host.html');
  assert.match(soft, /export type SoftMode/);
  assert.match(soft, /export function SoftMark/);
  assert.match(softWeb, /export function SoftMark/);
  assert.match(host, /\.is-on/);
  assert.match(soft, /is-on/);
  assert.match(softWeb, /is-on/);
  assert.ok(SOFT_INTRO.faceMs >= 200);
  assert.ok(SOFT_INTRO.cometMs >= 300);
  assert.ok(SOFT_INTRO.outroMs >= 150);
});

test('SoftMark has zero RN className on View/Animated.View props', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const softWeb = read('src/components/ui/SoftMark.web.tsx');
  assert.doesNotMatch(soft, /\bclassName\s*:/);
  assert.doesNotMatch(soft, /className=/);
  assert.doesNotMatch(soft, /Animated\.View/);
  assert.doesNotMatch(softWeb, /\bclassName\s*:/);
  // Web may toggle DOM classList on the host root — that is not RN View className
  assert.match(softWeb, /classList\.(add|remove)\('is-on'\)|is-on/);
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

test('KelyraMark: idle letter kelyra.png; SoftMark only while working; outro before unmount', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /mode=\{working \? 'working' : 'static'\}/);
  assert.match(mark, /softMounted/);
  assert.match(mark, /SOFT_INTRO\.outroMs/);
  assert.match(mark, /assets\/brand\/kelyra\.png/);
  assert.doesNotMatch(mark, /opacity: softOpacity[\s\S]{0,80}SoftMark/);
});

test('COMET_ORBIT: tilt 26° oval squash + yaw-rev (−360)', () => {
  assert.equal(COMET_ORBIT.tiltXDeg, 26);
  assert.equal(COMET_ORBIT.cantZDeg, 14);
  assert.ok(Math.abs(COMET_ORBIT.ovalY - Math.cos((26 * Math.PI) / 180)) < 1e-9);
  assert.ok(COMET_ORBIT.ovalY < 1 && COMET_ORBIT.ovalY > 0.85);
  assert.equal(COMET_ORBIT.yawToDeg, -360);
  assert.equal(COMET_ORBIT.radiusOfLetter, 0.41);
  assert.equal(SOFT_MOTION.blinkPeriodMs, 4400);
  assert.equal(SOFT_MOTION.glancePeriodMs, 8000);
});

test('soft-v8b-host embeds idle PNG data URL + SoT motion hooks', () => {
  const host = read('assets/brand/soft-v8b-host.html');
  assert.match(host, /data:image\/png;base64,/);
  assert.match(host, /breathe|breath/);
  assert.match(host, /gimbal|gimbal/);
  assert.match(host, /ring-spin/);
  assert.match(host, /billboard/);
  assert.match(host, /yaw-rev/);
  assert.match(host, /blink/);
  assert.match(host, /glance|look/);
  assert.match(host, /prefers-reduced-motion/);
});

test('Soft v8b host is SoT extract (gas trail + face gates)', () => {
  const host = read('assets/brand/soft-v8b-host.html');
  const ts = read('src/components/ui/softV8bHostHtml.ts');
  for (const src of [host, ts]) {
    assert.match(src, /feGaussianBlur/);
    assert.match(src, /stroke-dasharray/);
    assert.match(src, /rotateX\(90deg\)/);
    assert.match(src, /blush/);
    assert.match(src, /clipPath/);
    assert.doesNotMatch(src, /radialGradient id="gasGlow"/);
  }
});


test('Soft comet: JS always-facing ball + phase-z front/behind K (not CSS billboard alone)', () => {
  const host = read('assets/brand/soft-v8b-host.html');
  const soft = read('src/components/ui/SoftMark.tsx');
  const ts = read('src/components/ui/softV8bHostHtml.ts');
  assert.equal(COMET_ORBIT.facingMode, 'js-always');
  assert.equal(COMET_ORBIT.occlusionMode, 'phase-z');
  // Host file (unescaped HTML attrs)
  assert.match(host, /data-soft-facing=["']js-always["']/);
  assert.match(host, /data-soft-occlusion=["']phase-z["']/);
  assert.match(host, /data-soft-ball=["']always-facing["']/);
  assert.match(host, /comet-front/);
  assert.match(host, /comet-behind/);
  assert.match(host, /requestAnimationFrame/);
  // softV8bHostHtml.ts embeds JSON-escaped HTML — match tokens, not raw quotes
  assert.match(ts, /js-always/);
  assert.match(ts, /phase-z/);
  assert.match(ts, /always-facing/);
  assert.match(ts, /comet-front/);
  assert.match(ts, /requestAnimationFrame/);
  // Native SoftMark: transparent WebView + visible overflow (gas/orbit not clipped)
  assert.match(soft, /opaque=\{false\}/);
  assert.match(soft, /overflow:\s*['"]visible['"]/);
  assert.match(soft, /ORBIT_PAD_FRAC/);
});


test('SoftMark native: onLoadEnd injects softCometFacing (not HTML inline script alone)', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  const facing = read('src/components/ui/softCometFacing.ts');
  assert.match(soft, /onLoadEnd/);
  assert.match(soft, /softCometFacingInjectScript/);
  assert.match(soft, /injectJavaScript\(facingInject\)/);
  assert.match(facing, /export function softCometFacingInjectScript/);
  assert.match(facing, /\.mouth/);
  assert.match(facing, /gas-orbit|js-orbit/);
  assert.match(facing, /comet-front/);
  assert.match(facing, /data-soft-facing-injected/);
});


test('softCometFacing module exports startSoftCometFacing (web DOM driver)', () => {
  const facing = read('src/components/ui/softCometFacing.ts');
  const softWeb = read('src/components/ui/SoftMark.web.tsx');
  assert.match(facing, /export function startSoftCometFacing/);
  assert.match(facing, /export function softCometFacingInjectScript/);
  assert.match(facing, /comet-front/);
  assert.match(facing, /js-always|facingMode/);
  assert.match(softWeb, /startSoftCometFacing/);
  assert.doesNotMatch(softWeb, /\bclassName\s*:/);
  assert.doesNotMatch(softWeb, /Animated\.loop/);
});


test('Soft CEO face: eyes+glasses; mouth hard-hidden (no mouth any phase)', () => {
  const host = read('assets/brand/soft-v8b-host.html');
  const ts = read('src/components/ui/softV8bHostHtml.ts');
  const facing = read('src/components/ui/softCometFacing.ts');
  assert.equal(COMET_ORBIT.faceMode, 'eyes-glasses-nomouth');
  for (const src of [host, ts]) {
    assert.match(src, /eyes-glasses-nomouth|data-soft-face/);
    // Hard-hide mouth — must not paint
    assert.match(src, /\.mouth\s*\{[^}]*display:\s*none\s*!important/);
    assert.match(src, /glasses/);
    assert.match(src, /class="lid"|\.lid/);
  }
  assert.match(facing, /faceMode|eyes-glasses-nomouth/);
});

test('Soft gas trail: JS orbit with ball (not CSS rotateX(90) alone on native)', () => {
  const host = read('assets/brand/soft-v8b-host.html');
  const ts = read('src/components/ui/softV8bHostHtml.ts');
  const facing = read('src/components/ui/softCometFacing.ts');
  assert.equal(COMET_ORBIT.trailMode, 'js-orbit');
  assert.equal(COMET_ORBIT.facingMode, 'js-always');
  assert.equal(COMET_ORBIT.occlusionMode, 'phase-z');
  for (const src of [host, ts]) {
    assert.match(src, /data-soft-trail=["']js-orbit["']|js-orbit/);
    assert.match(src, /gas-orbit/);
    // SoT Peek gas layers retained
    assert.match(src, /feGaussianBlur/);
    assert.match(src, /stroke-dasharray/);
    // rotateX(90) may remain as SoT reference but js-always must not rely on it alone
    assert.match(src, /rotateX\(90deg\)/);
  }
  assert.match(facing, /gas-orbit|js-orbit/);
  assert.match(facing, /trailMode/);
});
