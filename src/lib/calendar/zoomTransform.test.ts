/**
 * Live drill transform math — identity at 0, source→dest at 1.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeDayDockTranslateX,
  computeDrillTransform,
  computeWeekDockTranslateY,
  siblingBandOpacity,
  type ZoomRect,
} from './zoomTransform.ts';

const host: ZoomRect = { x: 100, y: 200, width: 400, height: 600 };
const source: ZoomRect = { x: 140, y: 280, width: 80, height: 100 };
const dest: ZoomRect = { x: 100, y: 200, width: 400, height: 600 };

test('computeDrillTransform progress=0 is identity', () => {
  const t = computeDrillTransform(host, source, dest, 0);
  assert.equal(t.scaleX, 1);
  assert.equal(t.scaleY, 1);
  assert.equal(t.translateX, 0);
  assert.equal(t.translateY, 0);
});

test('computeDrillTransform progress=1 maps source TL onto dest TL (uniform)', () => {
  const t = computeDrillTransform(host, source, dest, 1);
  const sx = source.x - host.x; // 40
  const sy = source.y - host.y; // 80
  const dx = dest.x - host.x; // 0
  const dy = dest.y - host.y; // 0
  const scaleXT = dest.width / source.width; // 5

  assert.ok(Math.abs(t.scaleX - scaleXT) < 1e-9);
  assert.ok(Math.abs(t.scaleY - scaleXT) < 1e-9); // uniform

  // After transform about host TL: source TL lands on dest TL
  const mappedX = sx * t.scaleX + t.translateX;
  const mappedY = sy * t.scaleY + t.translateY;
  assert.ok(Math.abs(mappedX - dx) < 1e-6, `mappedX=${mappedX} dx=${dx}`);
  assert.ok(Math.abs(mappedY - dy) < 1e-6, `mappedY=${mappedY} dy=${dy}`);

  // Source size maps to dest width
  assert.ok(Math.abs(source.width * t.scaleX - dest.width) < 1e-6);
});

test('computeDrillTransform mid progress keeps source TL on linear path', () => {
  const p = 0.4;
  const t = computeDrillTransform(host, source, dest, p);
  const sx = source.x - host.x;
  const sy = source.y - host.y;
  const dx = dest.x - host.x;
  const dy = dest.y - host.y;
  const mappedX = sx * t.scaleX + t.translateX;
  const mappedY = sy * t.scaleY + t.translateY;
  assert.ok(Math.abs(mappedX - (sx + p * (dx - sx))) < 1e-6);
  assert.ok(Math.abs(mappedY - (sy + p * (dy - sy))) < 1e-6);
});

test('computeDrillTransform non-uniform uses independent scaleY', () => {
  const t = computeDrillTransform(host, source, dest, 1, { uniform: false });
  assert.ok(Math.abs(t.scaleX - dest.width / source.width) < 1e-9);
  assert.ok(Math.abs(t.scaleY - dest.height / source.height) < 1e-9);
});

test('computeWeekDockTranslateY docks source top to dest top at p=1', () => {
  const week: ZoomRect = { x: 100, y: 350, width: 400, height: 48 };
  assert.equal(computeWeekDockTranslateY(host, week, dest, 0), 0);
  const ty = computeWeekDockTranslateY(host, week, dest, 1);
  // localSy=150, localDy=0 → translateY = -150
  assert.equal(ty, dest.y - week.y);
});

test('computeDayDockTranslateX docks source left to dest left at p=1', () => {
  const day: ZoomRect = { x: 220, y: 200, width: 50, height: 600 };
  assert.equal(computeDayDockTranslateX(host, day, dest, 0), 0);
  assert.equal(computeDayDockTranslateX(host, day, dest, 1), dest.x - day.x);
});

test('siblingBandOpacity focus stays 1; neighbor fades', () => {
  assert.equal(siblingBandOpacity(0.5, true), 1);
  assert.equal(siblingBandOpacity(0, false), 1);
  assert.ok(Math.abs(siblingBandOpacity(1, false) - 0.08) < 1e-9);
});
