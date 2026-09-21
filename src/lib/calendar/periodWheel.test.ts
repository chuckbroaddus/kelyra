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
  WHEEL_SLOT_OFFSETS,
  WHEEL_STAGE_HEIGHT,
  WHEEL_VISIBLE_SLOTS,
  WHEEL_Z_CENTER,
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
  assert.equal(WHEEL_VISIBLE_SLOTS, 7);
  assert.deepEqual([...WHEEL_SLOT_OFFSETS], [-3, -2, -1, 0, 1, 2, 3]);
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
  assert.equal(s.inFocus, true);
  const side = wheelSample({ parkedSlot: 1, dragPx: 0 });
  assert.equal(side.translateX, 78);
  assert.equal(side.rotateYDeg, -14);
});

test('Set B palette locked (CAL-3DW-10)', () => {
  assert.equal(SET_B.header, '#C62828');
  assert.equal(SET_B.sunday, '#E53935');
  assert.equal(SET_B.body, '#FFFFFF');
  assert.equal(SET_B.type, '#1A1A1A');
  assert.equal(SET_B.tabMetal, '#B0BEC5');
  assert.equal(SET_B.tabHighlight, '#ECEFF1');
});

test('PeriodPager is 7-slot SoT wheel: pitch/perspective/rotateY; no translateZ in style; RM no tilt; no className', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /WHEEL_SLOT_OFFSETS/);
  assert.match(pager, /WHEEL_PITCH/);
  assert.match(pager, /rotateY/);
  assert.match(pager, /WHEEL_PERSPECTIVE/);
  assert.match(pager, /tapSide/);
  assert.match(pager, /useReducedMotion/);
  assert.match(pager, /WHEEL_SPRING|friction/);
  // CAL-P6-1A: carve dropped; full-band stage claim (no pageX left guard).
  assert.doesNotMatch(pager, /pageX\s*<\s*PERIOD_PAGER_EDGE_GUARD_PX/);
  assert.match(pager, /CAL_P6_1A_ON_DRUM_CARVE_PX|CAL-P6-1A/);
  assert.match(pager, /label=["']<<["']/);
  assert.doesNotMatch(pager, /className\s*:/);
  // RN Fabric rejects translateZ in style.transform — must not appear as a transform key
  assert.doesNotMatch(pager, /\{\s*translateZ\s*[,}]/);
  assert.doesNotMatch(pager, /translateZ\s*,/);
  assert.doesNotMatch(pager, /outputRange:\s*samples\.zs/);
  // RM branch: scale+opacity only (no rotateY in that block)
  const rmStart = pager.indexOf('if (reduceMotion)');
  assert.ok(rmStart >= 0);
  const rmReturn = pager.indexOf('return (', rmStart);
  const afterRm = pager.indexOf('const samples = makeNormSamples', rmReturn);
  const rmSrc = pager.slice(rmStart, afterRm > rmStart ? afterRm : rmStart + 1200);
  assert.doesNotMatch(rmSrc, /rotateY/);
  assert.doesNotMatch(rmSrc, /translateZ/);
  assert.match(rmSrc, /wheelScaleForNorm/);
  assert.match(rmSrc, /wheelOpacityForNorm/);
  // Full-motion path keeps rotateY + translateX + scale; still no translateZ in style array
  const full = pager.slice(afterRm);
  assert.match(full, /rotateY/);
  assert.match(full, /translateX/);
  assert.match(full, /\{\s*scale\s*[,}]|\{\s*scale\s*\}/);
  assert.doesNotMatch(full, /translateZ/);
  // Transform array keys must not include translateZ
  const transformMatch = full.match(/transform:\s*\[([\s\S]*?)\]/);
  assert.ok(transformMatch, 'expected transform array in full-motion path');
  assert.doesNotMatch(transformMatch[1], /translateZ/);
  assert.match(transformMatch[1], /translateX/);
  assert.match(transformMatch[1], /rotateY/);
  assert.match(transformMatch[1], /scale/);
});

test('PeriodLeaf Set B hanging-ledger: fixed hex; metal tabs; no YearIcon bars; no theme recolor', () => {
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.doesNotMatch(leaf, /\.png|ImageBackground|require\(/);
  assert.match(leaf, /MetalTabs|tabMetal|SET_B/);
  assert.match(leaf, /#C62828|SET_B\.header/);
  assert.match(leaf, /MonthHangingGrid|hangGrid/);
  assert.match(leaf, /WeekDayStrip|weekStrip/);
  assert.match(leaf, /dayNumeral/);
  assert.doesNotMatch(leaf, /YearIcon|WeekIcon|DayIcon/);
  assert.doesNotMatch(leaf, /colors\.elevated|colors\.danger|colors\.ink/);
  assert.doesNotMatch(leaf, /body caption|wrapBodyText/);
  assert.doesNotMatch(leaf, /borderRadius:\s*14|dayCircle/);
});

test('calendar still wires PeriodPager; day list included; SoT ship defaults; no SQL', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /PeriodPager/);
  assert.match(screen, /showsPeriodPager\(activeView, dayMode\)/);
  assert.equal(showsPeriodPager('day', 'list'), true);
  const src = read('src/lib/calendar/periodWheel.ts');
  assert.doesNotMatch(src, /supabase|execute_sql|from\('/);
  assert.match(src, /WHEEL_FOCUS_BAND/);
  assert.match(src, /WHEEL_PITCH/);
  assert.equal(WHEEL_PERSPECTIVE, 920);
  // SoT ship defaults (not prior brief)
  assert.doesNotMatch(src, /export const WHEEL_PERSPECTIVE = 900/);
  assert.doesNotMatch(src, /WHEEL_MAX_ROTATE_Y_DEG = 48/);
  assert.doesNotMatch(src, /WHEEL_SPACING_RATIO = 0\.72/);
});
