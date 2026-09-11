import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideSwipeSnap,
  decideSwipeTerminate,
  syncGrantFromCurrentX,
  SWIPE_TILE,
} from './swipeRowSnap.ts';

const trail2 = { leadCount: 0, trailCount: 2, rowWidth: 320 };
const both = { leadCount: 1, trailCount: 2, rowWidth: 320 };

test('tap while trailing open closes (onStart claim stole Pressable)', () => {
  const r = decideSwipeSnap({
    grantX: -2 * SWIPE_TILE,
    offset: -2 * SWIPE_TILE,
    gesture: { dx: 0, dy: 0, vx: 0 },
    ...trail2,
  });
  assert.deepEqual(r, { kind: 'snap', to: 0 });
});

test('LTR close from trailing open with modest dx snaps shut', () => {
  const r = decideSwipeSnap({
    grantX: -2 * SWIPE_TILE,
    offset: -2 * SWIPE_TILE + 50,
    gesture: { dx: 50, dy: 0, vx: 0.1 },
    ...trail2,
  });
  assert.deepEqual(r, { kind: 'snap', to: 0 });
});

test('LTR close from trailing open with velocity snaps shut', () => {
  const r = decideSwipeSnap({
    grantX: -2 * SWIPE_TILE,
    offset: -2 * SWIPE_TILE + 20,
    gesture: { dx: 20, dy: 0, vx: 0.5 },
    ...trail2,
  });
  assert.deepEqual(r, { kind: 'snap', to: 0 });
});

test('tiny LTR from trailing open without velocity keeps open (no jitter-close)', () => {
  const r = decideSwipeSnap({
    grantX: -2 * SWIPE_TILE,
    offset: -2 * SWIPE_TILE + 10,
    gesture: { dx: 10, dy: 0, vx: 0 },
    ...trail2,
  });
  assert.deepEqual(r, { kind: 'snap', to: -2 * SWIPE_TILE });
});

test('RTL reveal from closed past 56 opens full trailing width', () => {
  const r = decideSwipeSnap({
    grantX: 0,
    offset: -80,
    gesture: { dx: -80, dy: 0, vx: -0.2 },
    ...trail2,
  });
  assert.deepEqual(r, { kind: 'snap', to: -2 * SWIPE_TILE });
});

test('RTL from closed under 56 snaps closed', () => {
  const r = decideSwipeSnap({
    grantX: 0,
    offset: -40,
    gesture: { dx: -40, dy: 0, vx: 0 },
    ...trail2,
  });
  assert.deepEqual(r, { kind: 'snap', to: 0 });
});

test('full trailing swipe without deciding autoCommit here returns auto trail', () => {
  const r = decideSwipeSnap({
    grantX: 0,
    offset: -200,
    gesture: { dx: -200, dy: 0, vx: -1 },
    ...trail2,
  });
  assert.deepEqual(r, { kind: 'auto', side: 'trail' });
});

test('RTL close from leading open snaps shut', () => {
  const r = decideSwipeSnap({
    grantX: SWIPE_TILE,
    offset: SWIPE_TILE - 50,
    gesture: { dx: -50, dy: 0, vx: -0.1 },
    ...both,
  });
  assert.deepEqual(r, { kind: 'snap', to: 0 });
});

test('terminate near open trailing rests open', () => {
  assert.equal(decideSwipeTerminate(-90, 0, 2), -2 * SWIPE_TILE);
});

test('terminate near closed rests closed', () => {
  assert.equal(decideSwipeTerminate(-20, 0, 2), 0);
});

test('terminate while closing LTR from trailing-open prefers shut', () => {
  assert.equal(decideSwipeTerminate(-90, 0, 2, 30), 0);
});

test('terminate without closing dx still rests open when past threshold', () => {
  assert.equal(decideSwipeTerminate(-90, 0, 2, 0), -2 * SWIPE_TILE);
});

test('terminate while closing RTL from leading-open prefers shut', () => {
  assert.equal(decideSwipeTerminate(90, 1, 0, -30), 0);
});

test('syncGrantFromCurrentX returns the sync mirror (no async race)', () => {
  assert.equal(syncGrantFromCurrentX(-160), -160);
  assert.equal(syncGrantFromCurrentX(0), 0);
});
