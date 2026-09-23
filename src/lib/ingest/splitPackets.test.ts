import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canConfirmSplit,
  eligiblePacketCount,
  mergeWithPrevious,
  movePacket,
  packetsForRpc,
  planSaveIngestSplit,
  rosterCheckOff,
  splitAtFocus,
  togglePacketBlank,
  type SplitPacketDraft,
} from './splitPackets.ts';

function pkt(
  id: string,
  page_ids: string[],
  blank = false,
  ordinal = 1,
): SplitPacketDraft {
  return { id, ordinal, page_ids, blank };
}

test('I3-01 Confirm disabled at 0 eligible packets', () => {
  assert.equal(canConfirmSplit({ packets: [] }), false);
  assert.equal(canConfirmSplit({ packets: [pkt('a', ['p1'], true)] }), false);
  assert.equal(canConfirmSplit({ packets: [pkt('a', [])] }), false);
  assert.equal(canConfirmSplit({ packets: [pkt('a', ['p1'])] }), true);
  assert.equal(canConfirmSplit({ packets: [pkt('a', ['p1'])], busy: true }), false);
  assert.equal(
    canConfirmSplit({ packets: [pkt('a', ['p1'])], versionConflict: true }),
    false,
  );
  assert.equal(eligiblePacketCount([pkt('a', ['p1']), pkt('b', ['p2'], true)]), 1);
});

test('I3-02 S splits at focus; M merges previous; B toggles blank', () => {
  const base = [pkt('a', ['p1', 'p2', 'p3'], false, 1)];
  const split = splitAtFocus(base, { packetIndex: 0, pageIndex: 1 }, 'b');
  assert.equal(split.length, 2);
  assert.deepEqual(split[0]!.page_ids, ['p1']);
  assert.deepEqual(split[1]!.page_ids, ['p2', 'p3']);
  assert.equal(split[0]!.ordinal, 1);
  assert.equal(split[1]!.ordinal, 2);

  const merged = mergeWithPrevious(split, 1);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0]!.page_ids, ['p1', 'p2', 'p3']);

  const blanked = togglePacketBlank(merged, 0);
  assert.equal(blanked[0]!.blank, true);
  assert.equal(canConfirmSplit({ packets: blanked }), false);
});

test('I3-03 reorder + RPC payload has no student_id', () => {
  const packets = [
    pkt('a', ['p1'], false, 1),
    pkt('b', ['p2'], false, 2),
  ];
  const moved = movePacket(packets, 1, -1);
  assert.equal(moved[0]!.id, 'b');
  assert.equal(moved[1]!.id, 'a');
  assert.equal(moved[0]!.ordinal, 1);

  const payload = packetsForRpc(moved);
  const json = JSON.stringify(payload);
  assert.doesNotMatch(json, /student_id/);
  assert.doesNotMatch(json, /Approve|approved/);
  assert.ok(payload.every((p) => typeof p.blank === 'boolean'));
});

test('I3-04 roster check-off is count only (no names)', () => {
  const check = rosterCheckOff({
    eligiblePackets: 24,
    rosterCount: 25,
    pagesPerStudent: 1,
  });
  assert.equal(check.match, false);
  assert.match(check.label, /24 packets/);
  assert.match(check.label, /roster 25/);
  assert.doesNotMatch(check.label, /Maya|student name/i);

  const ok = rosterCheckOff({
    eligiblePackets: 25,
    rosterCount: 25,
    pagesPerStudent: 2,
  });
  assert.equal(ok.match, true);
  assert.match(ok.label, /2 pp/);
});

test('I3-05 mid-stack Split inserts with non-colliding temp ordinal (not final dense)', () => {
  const server = [
    { id: 'a', ordinal: 1, capture_id: null, status: 'draft' },
    { id: 'b', ordinal: 2, capture_id: null, status: 'draft' },
    { id: 'c', ordinal: 3, capture_id: null, status: 'draft' },
  ];
  const afterSplit = splitAtFocus(
    [pkt('a', ['p1', 'p2'], false, 1), pkt('b', ['p3'], false, 2), pkt('c', ['p4'], false, 3)],
    { packetIndex: 0, pageIndex: 1 },
    'd',
  );
  assert.equal(afterSplit.length, 4);
  assert.equal(afterSplit[1]!.id, 'd');
  assert.equal(afterSplit[1]!.ordinal, 2); // final dense — would collide with server b if inserted as-is

  const plan = planSaveIngestSplit(afterSplit, server);
  assert.equal(plan.toInsert.length, 1);
  assert.equal(plan.toInsert[0]!.id, 'd');
  assert.ok(plan.toInsert[0]!.tempOrdinal > 3, 'temp ordinal must clear server max');
  assert.ok(
    !server.some((row) => row.ordinal === plan.toInsert[0]!.tempOrdinal),
    'temp ordinal must not collide with unique(batch_id, ordinal)',
  );
  assert.notEqual(plan.toInsert[0]!.tempOrdinal, afterSplit[1]!.ordinal);
  assert.deepEqual(plan.toDeleteAfter, []);
  assert.ok(plan.parkIds.includes('d'));
  assert.ok(plan.parkBase >= 1_000_000);
});

test('FL-20 parkBase clears leftover park ordinals after failed restore', () => {
  // Simulate rows left parked at/above INGEST_PACKET_ORDINAL_PARK after a failed restore.
  const server = [
    { id: 'a', ordinal: 1_000_000, capture_id: null, status: 'draft' },
    { id: 'b', ordinal: 1_000_001, capture_id: null, status: 'draft' },
  ];
  const local = [pkt('a', ['p1'], false, 1), pkt('b', ['p2'], false, 2)];
  const plan = planSaveIngestSplit(local, server);
  const serverOrdinals = new Set(server.map((r) => r.ordinal));
  assert.ok(plan.parkBase > 1_000_000);
  assert.equal(plan.parkBase, Math.max(1_000_001, 1_000_000) + 1);
  assert.ok(
    !serverOrdinals.has(plan.parkBase),
    'parkBase itself must not collide with unique(batch_id, ordinal)',
  );
  for (let i = 0; i < plan.parkIds.length; i++) {
    const parked = plan.parkBase + i;
    assert.ok(
      !serverOrdinals.has(parked),
      `parked ordinal ${parked} must not collide with existing server ordinals`,
    );
  }
});

test('I3-06 Merge defers delete until after RPC — pages stay on removed id if RPC fails', () => {
  const server = [
    { id: 'a', ordinal: 1, capture_id: null, status: 'draft' },
    { id: 'b', ordinal: 2, capture_id: null, status: 'draft' },
  ];
  const local = mergeWithPrevious(
    [pkt('a', ['p1'], false, 1), pkt('b', ['p2'], false, 2)],
    1,
  );
  assert.deepEqual(local[0]!.page_ids, ['p1', 'p2']);

  const plan = planSaveIngestSplit(local, server);
  assert.equal(plan.toInsert.length, 0);
  assert.deepEqual(plan.toDeleteAfter, ['b']);
  // Survivor keeps merged pages in RPC payload; removed id is not deleted in the plan step itself.
  const rpcB = plan.rpcPackets.find((p) => p.id === 'b');
  assert.equal(rpcB, undefined);
  const rpcA = plan.rpcPackets.find((p) => p.id === 'a');
  assert.deepEqual(rpcA?.page_ids, ['p1', 'p2']);
  assert.deepEqual(
    plan.priorOrdinals.map((r) => r.id).sort(),
    ['a', 'b'],
  );
});
