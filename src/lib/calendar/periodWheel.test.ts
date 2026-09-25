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
  WHEEL_PERSPECTIVE_ORIGIN,
  WHEEL_MIN_HIT_PX,
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
  WHEEL_MOBILE_ROW_SCALE,
  wheelRowLayout,
  WHEEL_VISIBLE_SLOTS,
  WHEEL_Z_CENTER,
  slotIndexForOffset,
  slotPoolKey,
  stableSlotHostKey,
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
  assert.equal(WHEEL_PERSPECTIVE_ORIGIN, '50% 45%');
  assert.equal(WHEEL_MIN_HIT_PX, 56);
  // |d|=2 scale 0.48 → 108*0.48=51.84 < 56 → hits must live outside scale.
  assert.ok(WHEEL_HERO_WIDTH * 0.48 < WHEEL_MIN_HIT_PX);
  assert.equal(WHEEL_PITCH, 78);
  assert.equal(WHEEL_HERO_WIDTH, 108);
  assert.equal(WHEEL_HERO_HEIGHT, 126);
  assert.equal(WHEEL_STAGE_HEIGHT, 148);
  assert.equal(WHEEL_VISIBLE_SLOTS, 7);
  assert.deepEqual([...WHEEL_SLOT_OFFSETS], [-3, -2, -1, 0, 1, 2, 3]);
  assert.equal(WHEEL_SLOT_OFFSETS.length, WHEEL_VISIBLE_SLOTS);
  assert.equal(WHEEL_CENTER_INDEX, 3);
  assert.equal(WHEEL_ROTATE_Y_PER_SLOT, -14);
  assert.equal(WHEEL_MAX_ROTATE_Y_DEG, 42);
  assert.equal(WHEEL_Z_CENTER, 36);
});


test('wheelRowLayout: web SoT; native ≈66% stage/hero/pitch (CEO mobile row)', () => {
  assert.equal(WHEEL_MOBILE_ROW_SCALE, 0.66);
  const web = wheelRowLayout(true);
  assert.equal(web.scale, 1);
  assert.equal(web.stageHeight, WHEEL_STAGE_HEIGHT);
  assert.equal(web.heroHeight, WHEEL_HERO_HEIGHT);
  assert.equal(web.pitch, WHEEL_PITCH);
  const native = wheelRowLayout(false);
  assert.equal(native.scale, 0.66);
  assert.equal(native.stageHeight, Math.round(WHEEL_STAGE_HEIGHT * 0.66));
  assert.equal(native.heroHeight, Math.round(WHEEL_HERO_HEIGHT * 0.66));
  assert.equal(native.heroWidth, Math.round(WHEEL_HERO_WIDTH * 0.66));
  assert.equal(native.pitch, Math.round(WHEEL_PITCH * 0.66));
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
  assert.equal(slotPoolKey('year:2026', 0), 'year:2026:0');
  assert.equal(slotPoolKey('month:2026-09', 4), 'month:2026-09:4');
  // P0: React hosts are slot-index only (no periodKey remount mid-fling).
  assert.equal(stableSlotHostKey(0), 'slot-0');
  assert.equal(stableSlotHostKey(3), 'slot-3');
  assert.equal(stableSlotHostKey(6), 'slot-6');
  assert.equal(slotIndexForOffset(0), WHEEL_CENTER_INDEX);
  assert.equal(slotIndexForOffset(-3), 0);
  assert.equal(slotIndexForOffset(3), 6);
  // Flinging: ±3 from origin stay full; beyond → silhouette
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: true, distanceFromOrigin: 0 }), 'full');
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: true, distanceFromOrigin: 3 }), 'full');
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: true, distanceFromOrigin: -3 }), 'full');
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: true, distanceFromOrigin: 4 }), 'silhouette');
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: true, distanceFromOrigin: -4 }), 'silhouette');
  // Not flinging: center neighbors full
  assert.equal(wheelContentModeFor({ parkedOffset: 0, flinging: false }), 'full');
  assert.equal(wheelContentModeFor({ parkedOffset: 1, flinging: false }), 'full');
  assert.equal(wheelContentModeFor({ parkedOffset: 2, flinging: false }), 'silhouette');
  assert.equal(wheelContentModeFor({ parkedOffset: -3, flinging: false }), 'silhouette');
});

test('PeriodPager is 7-slot SlotPool: reanimated native+web; no translateZ; RM no tilt; no className', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /wheelRowLayout/);
  assert.match(pager, /ROW\.pitch/);
  assert.match(pager, /66%|WHEEL_MOBILE_ROW_SCALE/);
  // P0: stable slot-${index} hosts — do NOT remount-key on tile.key mid-fling.
  assert.match(pager, /stableSlotHostKey\(slotIndex\)/);
  assert.match(pager, /stableSlotHostKey/);
  assert.doesNotMatch(pager, /slotPoolKey\(tile\.key,\s*slotIndex\)/);
  assert.doesNotMatch(pager, /slotPoolKey\(kind,\s*slotIndex\)/);
  assert.match(pager, /Math\.trunc\(-/);
  assert.doesNotMatch(pager, /Math\.round\(-dragShared/);
  assert.match(pager, /react-native-reanimated/);
  assert.match(pager, /willChange/);
  // Web uses SharedValue + withSpring — no per-frame setWebDragPx.
  assert.doesNotMatch(pager, /setWebDragPx/);
  assert.doesNotMatch(pager, /WebSlotMotion/);
  assert.match(pager, /withSpring/);
  assert.match(pager, /wheelContentModeFor|contentMode/);
  assert.match(pager, /if \(!tile\) return null/);
  assert.doesNotMatch(pager, /className\s*:/);
  assert.doesNotMatch(pager, /\{\s*translateZ\s*[,}]/);
  assert.doesNotMatch(pager, /translateZ\s*,/);
  // FL-08 / t_df6159db P0: Fabric rejects translateZ — lock EVERY style.transform array
  // (prior assert only checked the first match, often the RM scale-only branch).
  const transformBlocks = [...pager.matchAll(/transform:\s*\[[\s\S]*?\]/g)].map((m) => m[0]);
  assert.ok(transformBlocks.length >= 3, `expected ≥3 transform arrays, got ${transformBlocks.length}`);
  for (const block of transformBlocks) {
    assert.doesNotMatch(block, /translateZ/);
  }
  // SoT wheelZForNorm / wheelSample.translateZ must never wire into PeriodPager styles.
  assert.doesNotMatch(pager, /wheelZForNorm|wheelSample|\.translateZ/);
  // RM path: scale only — no rotateY in reduceMotion branch of NativeSlotMotion
  assert.match(pager, /reduceMotion/);
  assert.match(pager, /rotateY/);
  assert.match(pager, /WHEEL_LOCAL_SAMPLE_SLOTS|residualFromTotalDrag|visualShift/);
  assert.match(pager, /shiftPeriodAnchor/);
  assert.match(pager, /useAnimatedReaction/);
});

test('MAX_FLING soft ceiling uncapped (≥30, ~48); SlotPool N=7 rebounds mid-fling', () => {
  assert.equal(WHEEL_MAX_FLING_SLOTS, 48);
  assert.ok(WHEEL_MAX_FLING_SLOTS >= 30);
  assert.ok(WHEEL_MAX_FLING_SLOTS <= 60);
  assert.equal(WHEEL_FLING_DECEL, 2000);
  assert.ok(WHEEL_FLING_DECEL >= 1800 && WHEEL_FLING_DECEL <= 2800);
  assert.equal(WHEEL_LOCAL_SAMPLE_SLOTS, 4);
  assert.ok(WHEEL_LOCAL_SAMPLE_SLOTS >= 3);
  // N=7 covers local residual after rebound (not the soft ceiling)
  assert.ok(WHEEL_VISIBLE_SLOTS / 2 >= WHEEL_LOCAL_SAMPLE_SLOTS - 1);
  assert.deepEqual([...WHEEL_SLOT_OFFSETS], [-3, -2, -1, 0, 1, 2, 3]);
});

test('showsPeriodPager still true for day list', () => {
  assert.equal(showsPeriodPager('day', 'list'), true);
});

test('PeriodLeaf P1: fixed plate — no MonthHangingGrid/WeekDayStrip; contentMode + silhouettes', () => {
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.doesNotMatch(leaf, /function MonthHangingGrid|const MonthHangingGrid|<MonthHangingGrid|function WeekDayStrip|<WeekDayStrip|styles\.hangGrid|styles\.weekStrip|weekStrip:\s*\{/);
  assert.match(leaf, /contentMode/);
  assert.match(leaf, /SilhouetteLeaf|clone idle chrome/);
  assert.match(leaf, /silhouetteYearText|styles\.yearPage|yearPage/);
  assert.match(leaf, /tile\.kind === 'year'|kind === 'year'/);
  assert.match(leaf, /monthBody/);
  assert.match(leaf, /silhouetteSoftText|wrapFooter|dayNumeral/);
  assert.match(leaf, /SilhouetteLeaf tile=\{tile\}|<SilhouetteLeaf tile/);
  assert.match(leaf, /fixed plate|monthStub|plateBodyLine|dayNumeral/);
  assert.match(leaf, /showCenterExtras|motionCompact/);
  // CAL-DRUM P0 N4: opacity-dim silhouette — no BlurView / CSS blur on hot path.
  assert.match(leaf, /DimOut/);
  assert.match(leaf, /dimOutOpacity|opacity:\s*0\.4/);
  assert.doesNotMatch(leaf, /from ['"]expo-blur['"]|<BlurView/);
  assert.doesNotMatch(leaf, /BlurOut/);
  assert.doesNotMatch(leaf, /SoftBlurText/);
  assert.doesNotMatch(leaf, /blur\(6px\)/);
  assert.match(leaf, /yearPage/);
  assert.match(leaf, /SET_B\.header|#C62828/);
  // Idle plate labels: year never Dynamic-Type ellipsis; day/week header+footer chrome.
  assert.match(leaf, /allowFontScaling=\{false\}/);
  assert.match(leaf, /weekHeaderMonth/);
  assert.match(leaf, /weekFooterYear/);
  assert.match(leaf, /weekBody/);
  assert.match(leaf, /monthFooterYear/);
  assert.doesNotMatch(leaf, /monthTallHeader|monthHeaderYear/);
  assert.match(leaf, /Red header on week plate — start month/);
  assert.match(leaf, /Footer on month plate — year/);
  assert.match(leaf, /Body on month plate — month name/);
  assert.match(leaf, /dayBody/);
  assert.match(leaf, /dayHeaderMonth/);
  assert.match(leaf, /dayFooterYear/);
  assert.match(leaf, /wrapFooter/);
  assert.match(leaf, /silhouetteSoftText/);
  assert.match(leaf, /clone idle chrome/);


});
