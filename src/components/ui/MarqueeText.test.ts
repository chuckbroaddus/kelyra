import assert from 'node:assert/strict';
import test from 'node:test';

import { marqueeMetrics } from './marqueeMetrics.ts';

test('marqueeMetrics: fit clip → not overflowing (zero crawl)', () => {
  const { overflowing, distance } = marqueeMetrics(96, 96);
  assert.equal(overflowing, false);
  assert.equal(distance, 0);
});

test('marqueeMetrics: hairline over clip stays static (epsilon)', () => {
  // Sub-pixel / rounding noise under slack must not crawl.
  const { overflowing } = marqueeMetrics(100, 100.5);
  assert.equal(overflowing, false);
});

test('marqueeMetrics: small real overflow marquees (Jamal-class clip)', () => {
  // Prior slack of 8 left ~4–6 pt overflow clipped without crawl ("Jama").
  const { overflowing, distance } = marqueeMetrics(44, 48);
  assert.equal(overflowing, true);
  assert.equal(distance, 4);
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
