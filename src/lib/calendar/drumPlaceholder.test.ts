import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DRUM_PH_ENTER_SPEED,
  DRUM_PH_EXIT_SPEED,
  DRUM_PH_FOCUS_MS,
  DRUM_PH_FOCUS_TOTAL_MS,
  DRUM_PH_SHIMMER_MS,
  DRUM_PH_SPEED_TAU_MS,
  DRUM_PH_STAGGER_MAX,
  DRUM_PH_STAGGER_MS,
  DRUM_PH_TELEPORT,
  drumPhCardK,
  drumPhLayers,
  drumPhNextMode,
  drumPhShimmerX,
  drumPhSpeedStep,
} from './drumPlaceholder.ts';

const read = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
const K = (mode: number, blurOut: number, clock: number, center: number, index: number) =>
  drumPhCardK(mode, blurOut, clock, center, index, DRUM_PH_FOCUS_MS, DRUM_PH_STAGGER_MS, DRUM_PH_STAGGER_MAX);

test('CAL-DRUM-PH mockup timings (variant C)', () => {
  assert.equal(DRUM_PH_EXIT_SPEED, 6);
  assert.ok(DRUM_PH_ENTER_SPEED > DRUM_PH_EXIT_SPEED);
  assert.equal(DRUM_PH_FOCUS_MS, 200);
  assert.equal(DRUM_PH_STAGGER_MS, 40);
  assert.equal(DRUM_PH_FOCUS_TOTAL_MS, 320);
  assert.equal(DRUM_PH_SHIMMER_MS, 1100);
});

test('CAL-DRUM-PH speed EMA: periods/s, teleport + first sample ignored', () => {
  const step = (prev: number, pos: number, dt: number, s: number) =>
    drumPhSpeedStep(prev, pos, dt, s, DRUM_PH_SPEED_TAU_MS, DRUM_PH_TELEPORT);
  assert.equal(step(Number.NaN, 5, 16, 0), 0);
  assert.equal(step(5, 5.5, 0, 3), 3);
  // Today jump: 30 periods in one frame is not speed.
  assert.equal(step(0, 30, 16, 2), 2);
  // Sustained 0.5 period / 16ms → converges to 31.25/s.
  let s = 0;
  let p = 0;
  for (let i = 0; i < 40; i++) {
    s = step(p, p + 0.5, 16, s);
    p += 0.5;
  }
  assert.ok(Math.abs(s - 31.25) < 0.1, String(s));
  // dt ≥ tau → instantaneous.
  assert.equal(step(0, 0.1, 50, 99), 2);
});

test('CAL-DRUM-PH mode hysteresis: real → placeholder → focusing → real', () => {
  const E = DRUM_PH_ENTER_SPEED;
  const X = DRUM_PH_EXIT_SPEED;
  assert.equal(drumPhNextMode(0, 7, E, X), 0);
  assert.equal(drumPhNextMode(0, 9, E, X), 1);
  assert.equal(drumPhNextMode(1, 7, E, X), 1);
  assert.equal(drumPhNextMode(1, 5.9, E, X), 2);
  assert.equal(drumPhNextMode(2, 3, E, X), 2);
  assert.equal(drumPhNextMode(2, 20, E, X), 1);
});

test('CAL-DRUM-PH card k: blur-out then center-first focus (40ms stagger, 200ms)', () => {
  assert.equal(K(0, 0, 0, 0, 5), 1);
  assert.equal(K(1, 0, 0, 0, 0), 1);
  assert.equal(K(1, 1, 0, 0, 0), 0);
  assert.equal(K(1, 0.5, 0, 0, 0), 0.5);
  // Focusing around center 10.
  assert.equal(K(2, 1, 0, 10, 10), 0);
  assert.equal(K(2, 1, 100, 10, 10), 0.5);
  assert.equal(K(2, 1, 200, 10, 10), 1);
  assert.equal(K(2, 1, 40, 10, 11), 0);
  assert.equal(K(2, 1, 140, 10, 9), 0.5);
  // Center first: a side card is never ahead of the center card.
  for (let t = 0; t <= 320; t += 10) {
    assert.ok(K(2, 1, t, 10, 10) >= K(2, 1, t, 10, 12));
  }
  // Stagger caps at 3 rings: every card is real by 320ms.
  assert.equal(K(2, 1, 320, 10, 40), 1);
  assert.equal(K(2, 1, 319, 10, 13), 0.995);
});

test('CAL-DRUM-PH layers: mockup curve; RM is a plain fade', () => {
  assert.deepEqual(drumPhLayers(1, false), [1, 1, 0, 1]);
  const [l0, s0, b0, bs0] = drumPhLayers(0, false);
  assert.equal(l0, 0);
  assert.equal(s0, 1.08);
  assert.equal(b0, 1);
  assert.equal(bs0, 1);
  // Blob gone by k = 0.625 (1 − 1.6k).
  assert.equal(drumPhLayers(0.625, false)[2], 0);
  // Label ink and scale are monotonic.
  let prev = drumPhLayers(0, false);
  for (let k = 0.05; k <= 1.0001; k += 0.05) {
    const cur = drumPhLayers(k, false);
    assert.ok(cur[0] >= prev[0] - 1e-9);
    assert.ok(cur[1] <= prev[1] + 1e-9);
    prev = cur;
  }
  assert.deepEqual(drumPhLayers(0.3, true), [0.3, 1, 0.7, 1]);
  assert.deepEqual(drumPhLayers(0, true), [0, 1, 1, 1]);
});

test('CAL-DRUM-PH shimmer sweep matches mockup background-position 120% → −120%', () => {
  const w = 46;
  // band center = left + 0.44w
  assert.ok(Math.abs(drumPhShimmerX(0, w) + 0.44 * w - -0.34 * w) < 1e-9);
  assert.ok(Math.abs(drumPhShimmerX(1, w) + 0.44 * w - 2.54 * w) < 1e-9);
  assert.ok(drumPhShimmerX(0.5, w) > drumPhShimmerX(0.2, w));
});

test('CAL-DRUM-PH wiring: shared pager, no live blur, RM gate, cheap layers', () => {
  const pager = read('src/components/calendar/PeriodPager.tsx');
  const ph = read('src/components/calendar/DrumPlaceholder.tsx');
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.match(pager, /useDrumPlaceholderDriver\(/);
  assert.match(pager, /DrumFocusProvider/);
  assert.match(leaf, /DrumFocusText/);
  assert.match(leaf, /DrumBlob/);
  // No live blur filter anywhere on the drum hot path.
  for (const src of [pager, ph, leaf]) {
    assert.doesNotMatch(src, /from ['"]expo-blur['"]|<BlurView|filter:\s*['"`]blur|blurRadius/);
  }
  assert.match(ph, /expo-linear-gradient/);
  assert.match(ph, /drum-blob-body\.png/);
  assert.match(ph, /drum-blob-band\.png/);
  // RM: no shimmer.
  assert.match(ph, /reduceMotion/);
  assert.match(ph, /drumPhLayers\(/);
  assert.match(ph, /drumPhShimmerX\(/);
});
