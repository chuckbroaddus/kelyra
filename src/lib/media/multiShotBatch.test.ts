import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MULTI_SHOT_BATCH_CAP,
  addShot,
  canAddShot,
  doneLabel,
  makeShotId,
  multiShotCap,
  orderedUris,
  removeShot,
  shutterDisabledMessage,
  type MultiShot,
} from './multiShotBatch.ts';
import { MAX_GRADING_DOC_PAGES } from '../ingest/gradingDocPages.ts';

test('cap matches AI grading-doc pipeline max', () => {
  assert.equal(MULTI_SHOT_BATCH_CAP, MAX_GRADING_DOC_PAGES);
  assert.equal(MULTI_SHOT_BATCH_CAP, 20);
  assert.equal(multiShotCap(), 20);
  assert.equal(multiShotCap(3), 3);
  assert.equal(multiShotCap(999), 20);
  assert.equal(multiShotCap(0), 1);
});

test('addShot appends in order and stops at cap', () => {
  let shots: MultiShot[] = [];
  for (let i = 0; i < 3; i++) {
    const r = addShot(shots, { uri: `file://${i}.jpg`, mimeType: 'image/jpeg' }, 3);
    assert.equal(r.added, true);
    shots = r.shots;
  }
  assert.equal(shots.length, 3);
  assert.deepEqual(
    shots.map((s) => s.uri),
    ['file://0.jpg', 'file://1.jpg', 'file://2.jpg'],
  );
  const blocked = addShot(shots, { uri: 'file://x.jpg' }, 3);
  assert.equal(blocked.added, false);
  assert.equal(blocked.atCap, true);
  assert.equal(blocked.shots.length, 3);
  assert.equal(canAddShot(3, 3), false);
  assert.match(shutterDisabledMessage(3, 3) ?? '', /Limit is 3/);
  assert.equal(shutterDisabledMessage(2, 3), null);
});

test('removeShot updates tray and preserves remaining order', () => {
  let shots: MultiShot[] = [
    { id: 'a', uri: 'file://a.jpg', mimeType: 'image/jpeg' },
    { id: 'b', uri: 'file://b.jpg', mimeType: 'image/jpeg' },
    { id: 'c', uri: 'file://c.jpg', mimeType: 'image/jpeg' },
  ];
  const mid = removeShot(shots, 'b');
  assert.equal(mid.removed?.id, 'b');
  shots = mid.shots;
  assert.deepEqual(
    shots.map((s) => s.id),
    ['a', 'c'],
  );
  assert.equal(canAddShot(shots.length, 3), true);
  const miss = removeShot(shots, 'nope');
  assert.equal(miss.removed, null);
  assert.equal(miss.shots.length, 2);
});

test('doneLabel and orderedUris', () => {
  assert.equal(doneLabel(0), 'Done');
  assert.equal(doneLabel(1), 'Done (1)');
  assert.equal(doneLabel(4), 'Done (4)');
  const shots: MultiShot[] = [
    { id: makeShotId(0, 1), uri: 'u1', mimeType: 'image/png' },
    { id: makeShotId(1, 1), uri: 'u2', mimeType: 'image/jpeg' },
  ];
  assert.deepEqual(orderedUris(shots), [
    { uri: 'u1', mimeType: 'image/png' },
    { uri: 'u2', mimeType: 'image/jpeg' },
  ]);
});

test('addShot rejects empty uri', () => {
  const r = addShot([], { uri: '', mimeType: 'image/jpeg' });
  assert.equal(r.added, false);
  assert.equal(r.shots.length, 0);
});
