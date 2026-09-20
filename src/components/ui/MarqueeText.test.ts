import assert from 'node:assert/strict';
import test from 'node:test';

import { marqueeMetrics } from './marqueeMetrics.ts';

test('marqueeMetrics: fit clip → not overflowing (zero crawl)', () => {
  const { overflowing, distance } = marqueeMetrics(96, 96);
  assert.equal(overflowing, false);
  assert.equal(distance, 0);
});

test('marqueeMetrics: text within slack of clip → not overflowing', () => {
  const { overflowing } = marqueeMetrics(100, 105);
  assert.equal(overflowing, false);
});

test('marqueeMetrics: clear overflow → overflowing (marquee after ready)', () => {
  const { overflowing, distance } = marqueeMetrics(80, 160);
  assert.equal(overflowing, true);
  assert.equal(distance, 80);
});

test('marqueeMetrics: clip below MIN_CLIP → never overflowing', () => {
  const { overflowing } = marqueeMetrics(16, 200);
  assert.equal(overflowing, false);
});
