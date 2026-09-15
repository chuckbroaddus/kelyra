import assert from 'node:assert/strict';
import test from 'node:test';

import {
  enqueueExclusive,
  nextPersistChainOk,
  shouldRollbackSplitPersist,
} from './saveQueue.ts';

test('I3-07 rollback only when RPC did not succeed', () => {
  assert.equal(shouldRollbackSplitPersist(false), true);
  assert.equal(shouldRollbackSplitPersist(true), false);
});

test('I3-10 failed-then-coalesced-Confirm must not proceed (empty pending keeps priorOk)', () => {
  // Debounced save failed; Confirm's second chain step finds no pending.
  assert.equal(nextPersistChainOk(false, false), false);
  // Prior success + empty pending (already flushed) may proceed.
  assert.equal(nextPersistChainOk(true, false), true);
  // Pending present: authoritative persist result wins.
  assert.equal(nextPersistChainOk(true, true, false), false);
  assert.equal(nextPersistChainOk(false, true, false), false);
  assert.equal(nextPersistChainOk(false, true, true), true);
  assert.equal(nextPersistChainOk(true, true, true), true);
});

test('I3-08 enqueueExclusive serializes tasks on the same key', async () => {
  const order: number[] = [];
  const slow = enqueueExclusive('batch-a', async () => {
    await new Promise((r) => setTimeout(r, 30));
    order.push(1);
    return 'one';
  });
  const fast = enqueueExclusive('batch-a', async () => {
    order.push(2);
    return 'two';
  });
  const [a, b] = await Promise.all([slow, fast]);
  assert.equal(a, 'one');
  assert.equal(b, 'two');
  assert.deepEqual(order, [1, 2]);
});

test('I3-09 enqueueExclusive continues after prior failure', async () => {
  const failed = enqueueExclusive('batch-b', async () => {
    throw new Error('boom');
  });
  const next = enqueueExclusive('batch-b', async () => 'ok');
  const settled = await Promise.allSettled([failed, next]);
  assert.equal(settled[0]!.status, 'rejected');
  assert.equal(settled[1]!.status, 'fulfilled');
  if (settled[1]!.status === 'fulfilled') assert.equal(settled[1].value, 'ok');
});
