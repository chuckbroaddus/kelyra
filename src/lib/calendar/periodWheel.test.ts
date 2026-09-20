import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  WHEEL_CENTER_OPACITY,
  WHEEL_CENTER_SCALE,
  WHEEL_FOCUS_BAND,
  WHEEL_MAX_ROTATE_Y_DEG,
  WHEEL_PERSPECTIVE,
  WHEEL_SIDE_OPACITY,
  WHEEL_SIDE_SCALE,
  WHEEL_SPACING_RATIO,
  wheelInFocusBand,
  wheelNormFromOffset,
  wheelOpacityForNorm,
  wheelRotateYDegForNorm,
  wheelSample,
  wheelScaleForNorm,
  wheelSpacingNudgePx,
} from './periodWheel.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('wheel curves: center larger/brighter than sides; far dimmer still', () => {
  assert.equal(wheelScaleForNorm(0), WHEEL_CENTER_SCALE);
  assert.ok(wheelScaleForNorm(0) > wheelScaleForNorm(1));
  assert.ok(wheelScaleForNorm(1) >= WHEEL_SIDE_SCALE - 0.001);
  assert.ok(wheelScaleForNorm(2) <= WHEEL_SIDE_SCALE);
  assert.ok(wheelScaleForNorm(2) >= 0.5);
  assert.equal(wheelOpacityForNorm(0), WHEEL_CENTER_OPACITY);
  assert.ok(wheelOpacityForNorm(0) > wheelOpacityForNorm(1));
  assert.ok(wheelOpacityForNorm(1) <= WHEEL_SIDE_OPACITY + 0.001);
});

test('wheel rotateY: left positive, right negative, |t|=1 → max', () => {
  assert.equal(wheelRotateYDegForNorm(0), 0);
  assert.equal(wheelRotateYDegForNorm(-1), WHEEL_MAX_ROTATE_Y_DEG);
  assert.equal(wheelRotateYDegForNorm(1), -WHEEL_MAX_ROTATE_Y_DEG);
  assert.ok(wheelRotateYDegForNorm(-0.5) > 0);
  assert.ok(wheelRotateYDegForNorm(0.5) < 0);
});

test('wheel spacing + focus band + sample', () => {
  assert.ok(WHEEL_SPACING_RATIO < 1);
  assert.ok(WHEEL_SPACING_RATIO > 0.5);
  assert.equal(wheelSpacingNudgePx(0, 100), 0);
  assert.ok(wheelSpacingNudgePx(1, 100) < 0); // pull inward
  assert.equal(wheelInFocusBand(0), true);
  assert.equal(wheelInFocusBand(WHEEL_FOCUS_BAND), true);
  assert.equal(wheelInFocusBand(WHEEL_FOCUS_BAND + 0.01), false);
  assert.equal(wheelNormFromOffset(72, 72), 1);
  const s = wheelSample({ parkedOffsetPx: 0, dragPx: 0, slotWidth: 100 });
  assert.equal(s.norm, 0);
  assert.equal(s.scale, WHEEL_CENTER_SCALE);
  assert.equal(s.inFocus, true);
});

test('PeriodPager is 3D wheel: rotateY + perspective; RM no tilt; tap side; no className', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /rotateY/);
  assert.match(pager, /WHEEL_PERSPECTIVE|perspective/);
  assert.match(pager, /tapSide/);
  assert.match(pager, /useReducedMotion/);
  assert.match(pager, /velocity/);
  assert.match(pager, /WHEEL_SPRING|friction/);
  assert.match(pager, /PERIOD_PAGER_EDGE_GUARD_PX/);
  assert.match(pager, /label=["']<<["']/);
  assert.doesNotMatch(pager, /className\s*:/);
  // RM path must not apply rotateY
  assert.match(pager, /reduceMotion/);
  const rmBlock = pager.slice(pager.indexOf('if (reduceMotion)'), pager.indexOf('const roles'));
  assert.doesNotMatch(rmBlock, /rotateY/);
  assert.match(rmBlock, /wheelScaleForNorm/);
  assert.match(rmBlock, /wheelOpacityForNorm/);
  void WHEEL_PERSPECTIVE;
});

test('PeriodLeaf Set B icon tiles: no PNG; no full-bleed year danger pill; Y/M/W/D glyphs', () => {
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.doesNotMatch(leaf, /\.png|ImageBackground|require\(/);
  assert.match(leaf, /YearIcon|WeekIcon|DayIcon/);
  assert.match(leaf, /MonthHangingGrid|hangGrid/);
  assert.match(leaf, /elevated/);
  // year leaf must not be a full danger background pill
  assert.doesNotMatch(leaf, /yearLeaf[\s\S]{0,120}backgroundColor:\s*colors\.danger/);
  assert.doesNotMatch(leaf, /styles\.yearLeaf[\s\S]{0,80}danger/);
});

test('calendar still wires PeriodPager; day list excluded; no SQL', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /PeriodPager/);
  assert.match(screen, /showsPeriodPager\(activeView, dayMode\)/);
  const src = read('src/lib/calendar/periodWheel.ts');
  assert.doesNotMatch(src, /supabase|execute_sql|from\('/);
  assert.match(src, /WHEEL_FOCUS_BAND/);
  assert.match(src, /WHEEL_SPACING_RATIO/);
});
