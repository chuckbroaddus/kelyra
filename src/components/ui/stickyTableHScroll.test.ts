import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideStickyHScroll,
  stickyHScrollBeginDrag,
  stickyHScrollCanDrive,
  stickyHScrollNeedsFollow,
  stickyHScrollRelease,
  type StickyHDriver,
} from './stickyTableHScroll.ts';

test('follower cannot drive while the other is locked', () => {
  assert.equal(stickyHScrollCanDrive('head', 'body'), false);
  assert.equal(stickyHScrollCanDrive('body', 'head'), false);
  assert.equal(stickyHScrollCanDrive('head', 'head'), true);
  assert.equal(stickyHScrollCanDrive('none', 'body'), true);
});

test('needsFollow skips sub-pixel jitter', () => {
  assert.equal(stickyHScrollNeedsFollow(100, 100.2), false);
  assert.equal(stickyHScrollNeedsFollow(100, 101), true);
});

test('decide ignores peer while body drives (no reverse scrollTo)', () => {
  const d = decideStickyHScroll({
    driving: 'body',
    who: 'head',
    x: 40,
    lastSyncedX: 12,
  });
  assert.equal(d.action, 'ignore');
});

test('decide follows when free driver moves past epsilon', () => {
  const d = decideStickyHScroll({
    driving: 'none',
    who: 'body',
    x: 48,
    lastSyncedX: 12,
  });
  assert.deepEqual(d, { action: 'follow', nextDriving: 'body', nextLastX: 48 });
});

test('decide ignores no-op x while still free (avoids scrollTo fight)', () => {
  const d = decideStickyHScroll({
    driving: 'none',
    who: 'head',
    x: 20.1,
    lastSyncedX: 20,
  });
  assert.equal(d.action, 'ignore');
});

test('begin drag always claims the scroller under the finger', () => {
  assert.equal(stickyHScrollBeginDrag('none', 'head'), 'head');
  assert.equal(stickyHScrollBeginDrag('body', 'head'), 'head');
});

test('release only clears when the active driver ends', () => {
  assert.equal(stickyHScrollRelease('body', 'body'), 'none');
  assert.equal(stickyHScrollRelease('body', 'head'), 'body');
  assert.equal(stickyHScrollRelease('none', 'head'), 'none');
});

test('simulated lag: follower ticks after driver move stay ignored', () => {
  let driving: StickyHDriver = 'none';
  let last = 0;
  const bodyMove = decideStickyHScroll({ driving, who: 'body', x: 80, lastSyncedX: last });
  assert.equal(bodyMove.action, 'follow');
  if (bodyMove.action === 'follow') {
    driving = bodyMove.nextDriving;
    last = bodyMove.nextLastX;
  }
  // Programmatic head onScroll arrives late with a slightly different x.
  const headLag = decideStickyHScroll({ driving, who: 'head', x: 79.2, lastSyncedX: last });
  assert.equal(headLag.action, 'ignore');
  driving = stickyHScrollRelease(driving, 'body');
  assert.equal(driving, 'none');
  // After release, tiny residual must not re-drive.
  const residual = decideStickyHScroll({ driving, who: 'head', x: 80.2, lastSyncedX: last });
  assert.equal(residual.action, 'ignore');
});
