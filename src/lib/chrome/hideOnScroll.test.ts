import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createHideOnScrollState,
  revealFromTopDrag,
  stepHideOnScroll,
} from './hideOnScroll.ts';

test('HOS-01: swipe-up accumulates past 12 → hide', () => {
  let state = createHideOnScrollState(true);
  state.lastLayoutH = 400;
  const step = stepHideOnScroll(state, { y: 20, maxY: 800, layoutH: 400, vy: 0 });
  assert.equal(step.show, false);
  assert.equal(step.state.visible, false);
});

test('HOS-02: swipe-down accumulates past −8 → show (mid list, not only y≈0)', () => {
  let state = createHideOnScrollState(false);
  state.lastY = 200;
  state.lastLayoutH = 400;
  const step = stepHideOnScroll(state, { y: 190, maxY: 800, layoutH: 400, vy: 0 });
  assert.equal(step.show, true);
  assert.equal(step.state.visible, true);
});

test('HOS-03: viewport grow from ClassTabs collapse clamps stale lastY (reflow)', () => {
  let state = createHideOnScrollState(false);
  state.lastY = 120;
  state.lastLayoutH = 400;
  // Collapse freed ~80px → layoutH 480, maxY dropped; y still 120 briefly > maxY 40
  const step = stepHideOnScroll(state, { y: 120, maxY: 40, layoutH: 480, vy: 0 });
  assert.equal(step.show, null);
  assert.equal(step.state.lastY, 40);
  // After native clamps, swipe-down mid-range still restores
  state = { ...step.state, lastY: 40 };
  const restore = stepHideOnScroll(state, { y: 28, maxY: 40, layoutH: 480, vy: 0 });
  assert.equal(restore.show, true);
});

test('HOS-04: y < 8 always shows when hidden', () => {
  const state = createHideOnScrollState(false);
  state.lastLayoutH = 500;
  const step = stepHideOnScroll(state, { y: 2, maxY: 100, layoutH: 500, vy: 0 });
  assert.equal(step.show, true);
});

test('HOS-05: top begin-drag reveals after collapse left feed at y≈0', () => {
  assert.equal(revealFromTopDrag(false, 0), true);
  assert.equal(revealFromTopDrag(false, 7), true);
  assert.equal(revealFromTopDrag(false, 20), false);
  assert.equal(revealFromTopDrag(true, 0), false);
});

test('HOS-06: end rubber-band does not false-show', () => {
  const state = createHideOnScrollState(false);
  state.lastY = 500;
  state.lastLayoutH = 400;
  const step = stepHideOnScroll(state, { y: 520, maxY: 500, layoutH: 400, vy: -1.5 });
  assert.equal(step.show, null);
});

test('HOS-07: short maxY after collapse still allows swipe-down show', () => {
  let state = createHideOnScrollState(false);
  state.lastY = 40;
  state.lastLayoutH = 480;
  const step = stepHideOnScroll(state, { y: 28, maxY: 40, layoutH: 480, vy: 0 });
  assert.equal(step.show, true);
});
