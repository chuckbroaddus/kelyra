import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPacketGuess } from '../src/packets.ts';

test('I2-packets: 25 pages × pages_per_student=1 → 25 packets', () => {
  const pages = Array.from({ length: 25 }, (_, i) => ({
    id: `p${i}`,
    pageIndex: i,
    blank: false,
  }));
  const packets = buildPacketGuess(pages, 1, true);
  assert.equal(packets.length, 25);
  assert.equal(packets[0]!.pageIds.length, 1);
  assert.equal(packets[24]!.ordinal, 25);
});

test('I2-packets: ignore blank backs drops blanks from stream', () => {
  const pages = [
    { id: 'a', pageIndex: 0, blank: false },
    { id: 'b', pageIndex: 1, blank: true },
    { id: 'c', pageIndex: 2, blank: false },
  ];
  const packets = buildPacketGuess(pages, 1, true);
  assert.equal(packets.length, 2);
  assert.deepEqual(packets.map((p) => p.pageIds[0]), ['a', 'c']);
});

test('I2-packets: N=2 chunks with leftover short packet', () => {
  const pages = Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    pageIndex: i,
    blank: false,
  }));
  const packets = buildPacketGuess(pages, 2, true);
  assert.equal(packets.length, 3);
  assert.equal(packets[2]!.pageIds.length, 1);
});
