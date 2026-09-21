import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { showsPeriodPager } from './periodPager.ts';
import {
  SET_B,
  WHEEL_CENTER_OPACITY,
  WHEEL_CENTER_SCALE,
  WHEEL_FAR_OPACITY,
  WHEEL_FAR_SCALE,
  WHEEL_FOCUS_BAND,
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
  WHEEL_MAX_ROTATE_Y_DEG,
  WHEEL_MIN_OPACITY,
  WHEEL_MIN_SCALE,
  WHEEL_PERSPECTIVE,
  WHEEL_PITCH,
  WHEEL_ROTATE_Y_PER_SLOT,
  WHEEL_SIDE_OPACITY,
  WHEEL_SIDE_SCALE,
  WHEEL_CENTER_INDEX,
  WHEEL_FLING_DECEL,
  WHEEL_MAX_FLING_SLOTS,
  WHEEL_LOCAL_SAMPLE_SLOTS,
  WHEEL_SLOT_OFFSETS,
  WHEEL_STAGE_HEIGHT,
  WHEEL_VISIBLE_SLOTS,
  WHEEL_Z_CENTER,
  slotIndexForOffset,
  slotPoolKey,
  wheelContentModeFor,
  wheelInFocusBand,
  wheelNormFromOffset,
  wheelOpacityForNorm,
  wheelRotateYDegForNorm,
  wheelSample,
  wheelScaleForNorm,
  wheelZForNorm,
} from './periodWheel.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('SoT geometry constants: perspective 920, pitch 78, hero 108×126, stage 148', () => {
  assert.equal(WHEEL_PERSPECTIVE, 920);
  assert.equal(WHEEL_PITCH, 78);
  assert.equal(WHEEL_HERO_WIDTH, 108);
  assert.equal(WHEEL_HERO_HEIGHT, 126);
  assert.equal(WHEEL_STAGE_HEIGHT, 148);
  assert.equal(WHEEL_VISIBLE_SLOTS, 9);
  assert.deepEqual([...WHEEL_SLOT_OFFSETS], [-4, -3, -2, -1, 0, 1, 2, 3, 4]);
  assert.equal(WHEEL_SLOT_OFFSETS.length, WHEEL_VISIBLE_SLOTS);
  assert.equal(WHEEL_CENTER_INDEX, 4);
  assert.equal(WHEEL_ROTATE_Y_PER_SLOT, -14);
  assert.equal(WHEEL_MAX_ROTATE_Y_DEG, 42);
  assert.equal(WHEEL_Z_CENTER, 36);
});

test('wheel scale SoT: clamp(1 - 0.22*|d| - 0.02*d², 0.46, 1)', () => {
  assert.equal(wheelScaleForNorm(0), WHEEL_CENTER_SCALE);
  assert.ok(Math.abs(wheelScaleForNorm(1) - WHEEL_SIDE_SCALE) < 0.02);
  assert.ok(Math.abs(wheelScaleForNorm(2) - WHEEL_FAR_SCALE) < 0.02);
  assert.equal(wheelScaleForNorm(3), WHEEL_MIN_SCALE);
  assert.ok(wheelScaleForNorm(0) > wheelScaleForNorm(1));
  assert.ok(wheelScaleForNorm(1) > wheelScaleForNorm(2));
});

test('wheel opacity SoT: clamp(1 - 0.24*|d| - 0.03*d², 0.22, 1)', () => {
  assert.equal(wheelOpacityForNorm(0), WHEEL_CENTER_OPACITY);
  assert.ok(Math.abs(wheelOpacityForNorm(1) - WHEEL_SIDE_OPACITY) < 0.05);
  assert.ok(Math.abs(wheelOpacityForNorm(2) - WHEEL_FAR_OPACITY) < 0.05);
  assert.ok(wheelOpacityForNorm(3) >= WHEEL_MIN_OPACITY);
  assert.ok(wheelOpacityForNorm(0) > wheelOpacityForNorm(1));
});

test('wheel rotateY SoT: clamp(d,-3,3) * -14; left +, right −', () => {
  assert.equal(wheelRotateYDegForNorm(0), 0);
  assert.equal(wheelRotateYDegForNorm(-1), 14);
  assert.equal(wheelRotateYDegForNorm(1), -14);
  assert.equal(wheelRotateYDegForNorm(-2), 28);
  assert.equal(wheelRotateYDegForNorm(2), -28);
  assert.equal(wheelRotateYDegForNorm(-3), 42);
  assert.equal(wheelRotateYDegForNorm(3), -42);
  assert.equal(wheelRotateYDegForNorm(-4), 42); // clamp
});

test('wheel z SoT: 36 - 18*|d|', () => {
  assert.equal(wheelZForNorm(0), 36);
  assert.equal(wheelZForNorm(1), 18);
  assert.equal(wheelZForNorm(2), 0);
  assert.equal(wheelZForNorm(-1), 18);
});

test('wheel focus band + sample + norm', () => {
  assert.ok(WHEEL_FOCUS_BAND > 0.5);
  assert.equal(wheelInFocusBand(0), true);
  assert.equal(wheelInFocusBand(WHEEL_FOCUS_BAND), true);
  assert.equal(wheelInFocusBand(WHEEL_FOCUS_BAND + 0.01), false);
  assert.equal(wheelNormFromOffset(78, 78), 1);
  const s = wheelSample({ parkedSlot: 0, dragPx: 0 });
  assert.equal(s.norm, 0);
  assert.equal(s.scale, WHEEL_CENTER_SCALE);
  assert.equal(s.translateZ, 36);
});

test('Set B palette locked (CAL-3DW-10)', () => {
  assert.equal(SET_B.header, '#C62828');
  assert.equal(SET_B.sunday, '#E53935');
  assert.equal(SET_B.body, '#FFFFFF');
  assert.equal(SET_B.type, '#1A1A1A');
  assert.equal(SET_B.grid, '#E0E0E0');
  assert.equal(SET_B.tabMetal, '#B0BEC5');
  assert.equal(SET_B.tabHighlight, '#ECEFF1');
});

test('SlotPool keys + content policy', () => {
  assert.equal(slotPoolKey('month', 4), 'month:4');
  assert.equal(slotIndexForOffset(0), WHEEL_CENTER_INDEX);
  assert.equal(slotIndexForOffset(-4), 0);
  assert.equal(slotIndexForOffset(4), 8);
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: true }), 'silhouette');
  assert.equal(wheelContentModeFor({ parkedOffset: 2, flinging: true }), 'silhouette');
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: false }), 'full');
  assert.equal(wheelContentModeFor({ parkedOffset: 1, flinging: false }), 'full');
  assert.equal(wheelContentModeFor({ parkedOffset: 2, flinging: false }), 'silhouette');
  assert.equal(wheelContentModeFor({ parkedOffset: -4, flinging: false }), 'silhouette');
});

test('PeriodPager is 9-slot SlotPool: reanimated native / CSS web; no translateZ; RM no tilt; no className', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /WHEEL_PITCH/);
  assert.match(pager, /slotPoolKey/);
  assert.match(pager, /react-native-reanimated/);
  assert.match(pager, /willChange/);
  assert.match(pager, /wheelContentModeFor|contentMode/);
  assert.match(pager, /if \(!tile\) return null/);
  assert.doesNotMatch(pager, /className\s*:/);
  assert.doesNotMatch(pager, /\{\s*translateZ\s*[,}]/);
  assert.doesNotMatch(pager, /translateZ\s*,/);
  // RM path: scale only — no rotateY in reduceMotion branch of NativeSlotMotion
  assert.match(pager, /reduceMotion/);
  assert.match(pager, /rotateY/);
  const transformMatch = pager.match(/transform:\s*\[[\s\S]*?\]/);
  assert.ok(transformMatch);
  assert.doesNotMatch(transformMatch![0], /translateZ/);
  assert.match(pager, /WHEEL_LOCAL_SAMPLE_SLOTS|residualFromTotalDrag|visualShift/);
  assert.match(pager, /shiftPeriodAnchor/);
  assert.match(pager, /useAnimatedReaction/);
});

test('MAX_FLING soft ceiling uncapped (≥30, ~48); SlotPool N=9 rebounds mid-fling', () => {
  assert.equal(WHEEL_MAX_FLING_SLOTS, 48);
  assert.ok(WHEEL_MAX_FLING_SLOTS >= 30);
  assert.ok(WHEEL_MAX_FLING_SLOTS <= 60);
  assert.equal(WHEEL_FLING_DECEL, 2000);
  assert.ok(WHEEL_FLING_DECEL >= 1800 && WHEEL_FLING_DECEL <= 2800);
  assert.equal(WHEEL_LOCAL_SAMPLE_SLOTS, 5);
  assert.ok(WHEEL_LOCAL_SAMPLE_SLOTS >= 4);
  // N=9 still covers local residual after rebound (not the soft ceiling)
  assert.ok(WHEEL_VISIBLE_SLOTS / 2 >= WHEEL_LOCAL_SAMPLE_SLOTS - 1);
  assert.deepEqual([...WHEEL_SLOT_OFFSETS], [-4, -3, -2, -1, 0, 1, 2, 3, 4]);
});

test('showsPeriodPager still true for day list', () => {
  assert.equal(showsPeriodPager('day', 'list'), true);
});

test('PeriodLeaf P1: memo MonthHangingGrid + contentMode + per-kind silhouettes', () => {
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.match(leaf, /memo\(MonthHangingGridImpl\)|const MonthHangingGrid = memo/);
  assert.match(leaf, /contentMode/);
  assert.match(leaf, /SilhouetteLeaf|silhouetteHeader/);
  assert.match(leaf, /silhouetteBlurYear|styles\.yearPage/);
  assert.match(leaf, /tile\.kind === 'year'|kind === 'year'/);
  assert.match(leaf, /silhouetteBlurDay|silhouetteHintRow/);
  assert.match(leaf, /silhouetteBlurLabel|silhouetteBlurDayNumeral|silhouetteBlurCaption/);
  assert.match(leaf, /SilhouetteLeaf tile=\{tile\}|<SilhouetteLeaf tile/);
  assert.match(leaf, /key=\{`\$\{tile\.key\}:\$\{line\}`\}|key=\{`\$\{iso\}-\$\{i\}`\}/);
  assert.match(leaf, /mountGrid|showExtras/);
  // Real soft look: textShadow (not opacity-only), SoftBlurText ghost, year red+white.
  assert.match(leaf, /SoftBlurText/);
  assert.match(leaf, /textShadowRadius/);
  assert.match(leaf, /textShadowColor/);
  assert.doesNotMatch(leaf, /from ['\"]expo-blur['\"]|<BlurView/);
  assert.match(leaf, /yearPage/);
  assert.match(leaf, /SET_B\.header|#C62828/);
});
