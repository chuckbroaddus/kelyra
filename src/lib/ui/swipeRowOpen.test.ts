import assert from 'node:assert/strict';
import test from 'node:test';

import { setSwipeRowStackGestures, type SwipeRowNavLike } from './swipeRowStackGestures.ts';

test('setSwipeRowStackGestures disables leaf and every parent stack', () => {
  const calls: { id: string; opts: Record<string, unknown> }[] = [];
  const root: SwipeRowNavLike = {
    setOptions: (opts) => calls.push({ id: 'root', opts }),
  };
  const classStack: SwipeRowNavLike = {
    setOptions: (opts) => calls.push({ id: 'class', opts }),
    getParent: () => root,
  };
  const leaf: SwipeRowNavLike = {
    setOptions: (opts) => calls.push({ id: 'leaf', opts }),
    getParent: () => classStack,
  };

  setSwipeRowStackGestures(leaf, false);

  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map((c) => c.id),
    ['leaf', 'class', 'root'],
  );
  for (const c of calls) {
    assert.equal(c.opts.gestureEnabled, false);
    assert.equal(c.opts.fullScreenGestureEnabled, false);
  }
});

test('setSwipeRowStackGestures restores enabled on the parent chain', () => {
  const calls: Record<string, unknown>[] = [];
  const parent: SwipeRowNavLike = {
    setOptions: (opts) => calls.push(opts),
  };
  const leaf: SwipeRowNavLike = {
    setOptions: (opts) => calls.push(opts),
    getParent: () => parent,
  };

  setSwipeRowStackGestures(leaf, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].gestureEnabled, true);
  assert.equal(calls[1].fullScreenGestureEnabled, true);
});

test('setSwipeRowStackGestures does not loop if getParent returns self', () => {
  let n = 0;
  const nav: SwipeRowNavLike = {
    setOptions: () => {
      n += 1;
    },
    getParent: () => nav,
  };
  setSwipeRowStackGestures(nav, false);
  assert.equal(n, 1);
});
