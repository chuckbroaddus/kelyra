import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DAY_LIST_CHUNK_DAYS,
  DAY_LIST_EMPTY_H,
  DAY_LIST_EXTEND_THRESHOLD,
  DAY_LIST_HEADER_H,
  DAY_LIST_ITEM_H,
  buildDayListLayout,
  dayListChunkAfter,
  dayListChunkBefore,
  dayListCompensatedOffset,
  dayListDayNumber,
  dayListDaysBetween,
  dayListExtendNeeds,
  dayListFollowAt,
  dayListFollowPosition,
  dayListOffsetAt,
  dayListSeedRange,
  dayListTopIndexAt,
} from './dayListRows.ts';

type It = { id: string };
const key = (i: It) => i.id;

test('dayListDaysBetween: inclusive, crosses months and years', () => {
  assert.deepEqual(dayListDaysBetween('2026-01-30', '2026-02-02'), [
    '2026-01-30',
    '2026-01-31',
    '2026-02-01',
    '2026-02-02',
  ]);
  assert.deepEqual(dayListDaysBetween('2026-12-31', '2027-01-01'), ['2026-12-31', '2027-01-01']);
  assert.deepEqual(dayListDaysBetween('2026-02-02', '2026-02-01'), []);
});

test('buildDayListLayout: header per day, events or one "No events" row, fixed heights', () => {
  const days = ['2026-02-04', '2026-02-05', '2026-02-06'];
  const items = new Map<string, It[]>([
    ['2026-02-04', [{ id: 'a' }, { id: 'b' }]],
    ['2026-02-06', [{ id: 'c' }]],
  ]);
  const lay = buildDayListLayout(days, items, key);
  assert.deepEqual(
    lay.rows.map((r) => r.kind),
    ['header', 'item', 'item', 'header', 'empty', 'header', 'item'],
  );
  assert.deepEqual(lay.headerIndices, [0, 3, 5]);
  const h = DAY_LIST_HEADER_H;
  const i = DAY_LIST_ITEM_H;
  const e = DAY_LIST_EMPTY_H;
  assert.deepEqual(lay.headerOffsets, [0, h + 2 * i, h + 2 * i + h + e]);
  assert.equal(lay.totalHeight, 3 * h + 3 * i + e);
  for (let k = 1; k < lay.rows.length; k += 1) {
    assert.equal(lay.offsets[k], lay.offsets[k - 1]! + lay.lengths[k - 1]!);
  }
  assert.equal(new Set(lay.rows.map((r) => r.key)).size, lay.rows.length, 'unique keys');
});

test('dayListTopIndexAt: pinned day = last header at or above the top edge', () => {
  const offs = [0, 100, 150, 400];
  assert.equal(dayListTopIndexAt(offs, 0), 0);
  assert.equal(dayListTopIndexAt(offs, 99), 0);
  assert.equal(dayListTopIndexAt(offs, 100), 1);
  assert.equal(dayListTopIndexAt(offs, 149), 1);
  assert.equal(dayListTopIndexAt(offs, 151), 2);
  assert.equal(dayListTopIndexAt(offs, 5000), 3);
  assert.equal(dayListTopIndexAt(offs, -40), 0);
  assert.equal(dayListTopIndexAt([], 10), -1);
});

test('dayListExtendNeeds: loads ahead well before either edge', () => {
  const n = 151;
  assert.deepEqual(dayListExtendNeeds(75, n), { before: false, after: false });
  assert.deepEqual(dayListExtendNeeds(DAY_LIST_EXTEND_THRESHOLD - 1, n), { before: true, after: false });
  assert.deepEqual(dayListExtendNeeds(n - DAY_LIST_EXTEND_THRESHOLD, n), { before: false, after: true });
  assert.ok(DAY_LIST_CHUNK_DAYS > DAY_LIST_EXTEND_THRESHOLD, 'a chunk clears the threshold');
});

test('seed + chunk ranges tile with no gaps or overlaps', () => {
  const seed = dayListSeedRange('2026-02-04');
  assert.ok(seed.start < '2026-02-04' && seed.end > '2026-02-04');
  const before = dayListChunkBefore(seed.start);
  const after = dayListChunkAfter(seed.end);
  assert.equal(dayListDaysBetween(before.end, seed.start).length, 2);
  assert.equal(dayListDaysBetween(seed.end, after.start).length, 2);
  assert.equal(dayListDaysBetween(before.start, before.end).length, DAY_LIST_CHUNK_DAYS);
});

test('dayListCompensatedOffset: prepend keeps the same content under the top edge', () => {
  const items = new Map<string, It[]>([['2026-02-05', [{ id: 'x' }]]]);
  const a = buildDayListLayout(dayListDaysBetween('2026-02-04', '2026-02-10'), items, key);
  const y = a.headerOffsets[1]! + 20;
  const b = buildDayListLayout(dayListDaysBetween('2026-01-01', '2026-02-10'), items, key);
  const off = dayListCompensatedOffset(b, '2026-02-05', 20)!;
  assert.equal(off - y, b.headerOffsets[b.days.indexOf('2026-02-04')]!);
  assert.equal(dayListCompensatedOffset(b, '2025-01-01', 0), null);
});

test('CAL-DRUM-FOLLOW dayListDayNumber is whole consecutive days', () => {
  assert.equal(dayListDayNumber('1970-01-01'), 0);
  assert.equal(dayListDayNumber('2026-03-09') - dayListDayNumber('2026-03-08'), 1);
  assert.equal(dayListDayNumber('2026-11-02') - dayListDayNumber('2026-11-01'), 1);
  assert.equal(dayListDayNumber('2027-01-01') - dayListDayNumber('2026-12-31'), 1);
});

test('CAL-DRUM-FOLLOW dayListFollowPosition runs 0..1 through each section', () => {
  const layout = { headerOffsets: [0, 100, 300], days: ['2026-02-03', '2026-02-04', '2026-02-05'], totalHeight: 400 };
  const base = dayListDayNumber('2026-02-03');
  assert.equal(dayListFollowPosition(layout, 0), base);
  assert.equal(dayListFollowPosition(layout, 50), base + 0.5);
  assert.equal(dayListFollowPosition(layout, 100), base + 1);
  assert.equal(dayListFollowPosition(layout, 200), base + 1.5);
  assert.equal(dayListFollowPosition(layout, 350), base + 2.5);
  assert.equal(dayListFollowPosition({ headerOffsets: [], days: [], totalHeight: 0 }, 10), null);
});

test('CAL-DRUM-FOLLOW wiring: list feeds follow, pager follows unless drum owns it', () => {
  const pager = readFileSync('src/components/calendar/PeriodPager.tsx', 'utf8');
  const pane = readFileSync('src/components/calendar/DayListPane.tsx', 'utf8');
  const screen = readFileSync('src/app/calendar.tsx', 'utf8');
  assert.match(pager, /followPosition\?: SharedValue<number> \| null/);
  assert.match(pager, /dragShared\.value = -clamped \* pitch/);
  assert.match(pager, /followBlockShared\.value = 2/);
  assert.match(pane, /useAnimatedScrollHandler/);
  assert.match(pane, /<Reanimated\.FlatList/);
  assert.match(pane, /onScroll=\{scrollHandler\}/);
  assert.match(pane, /followPosition\.value = pos/);
  assert.match(pager, /fullRadius: followPosition \? 2 : undefined/);
  assert.match(pane, /setFollow\(dayListDayNumber\(target\)\)/);
  assert.match(screen, /followPosition=\{dayListMode && !reduceMotion \? dayListFollow : null\}/);
});

test('CAL-DRUM-FOLLOW dayListFollowAt is a self-contained worklet matching the layout helper', () => {
  const src = readFileSync('src/lib/calendar/dayListRows.ts', 'utf8');
  const body = src.slice(src.indexOf('export function dayListFollowAt'), src.indexOf('/**\n * CAL-LIST-FOLLOW worklet'));
  assert.match(body, /'worklet';/);
  assert.doesNotMatch(body.replace('export function dayListFollowAt', ''), /dayList\w+\(/);
  const offsets = [0, 84, 204, 288];
  const nums = [100, 101, 102, 103];
  assert.equal(dayListFollowAt(offsets, nums, 400, 0), 100);
  assert.equal(dayListFollowAt(offsets, nums, 400, 42), 100.5);
  assert.equal(dayListFollowAt(offsets, nums, 400, 84), 101);
  assert.equal(dayListFollowAt(offsets, nums, 400, -20), 100);
  assert.equal(dayListFollowAt(offsets, nums, 400, 344), 103.5);
  assert.ok(Number.isNaN(dayListFollowAt([], [], 0, 5)));
});

test('CAL-LIST-FOLLOW dayListOffsetAt inverts dayListFollowAt and clamps to loaded days', () => {
  const offsets = [0, 84, 204, 288];
  const nums = [100, 101, 102, 103];
  for (const y of [0, 30, 84, 150, 204, 250, 300]) {
    const pos = dayListFollowAt(offsets, nums, 400, y);
    assert.ok(Math.abs(dayListOffsetAt(offsets, nums, 400, pos) - y) < 1e-9, `y=${y}`);
  }
  assert.equal(dayListOffsetAt(offsets, nums, 400, 90.5), 0);
  assert.equal(dayListOffsetAt(offsets, nums, 400, 120), 400);
  assert.ok(Number.isNaN(dayListOffsetAt([], [], 0, 100)));
  assert.ok(Number.isNaN(dayListOffsetAt(offsets, nums, 400, Number.NaN)));
  const src = readFileSync('src/lib/calendar/dayListRows.ts', 'utf8');
  const body = src.slice(src.indexOf('export function dayListOffsetAt'), src.indexOf('/**\n * CAL-DRUM-FOLLOW: continuous day position'));
  assert.match(body, /'worklet';/);
  assert.doesNotMatch(body.replace('export function dayListOffsetAt', ''), /dayList\w+\(/);
});

test('CAL-LIST-FOLLOW wiring: drum drive scrolls list live; reports held while driving', () => {
  const pager = readFileSync('src/components/calendar/PeriodPager.tsx', 'utf8');
  const pane = readFileSync('src/components/calendar/DayListPane.tsx', 'utf8');
  const screen = readFileSync('src/app/calendar.tsx', 'utf8');
  assert.match(pager, /drivePosition\?: SharedValue<number> \| null/);
  assert.match(pager, /anchorPosShared\.value - dragShared\.value \/ pitch/);
  assert.match(pager, /hadInFlight \|\| followPosition \? visualBefore : 0/);
  assert.match(pane, /scrollTo\(listRef, 0, y, false\)/);
  assert.match(pane, /if \(drivingRef\.current\) \{/);
  assert.match(screen, /drivePosition=\{dayListMode \? dayListDrive : null\}/);
});

test('CAL-LIST-PLUS + in Day List prefills start date with the sticky header day', () => {
  const screen = readFileSync('src/app/calendar.tsx', 'utf8');
  const composer = readFileSync('src/components/calendar/EventComposer.tsx', 'utf8');
  assert.match(screen, /initialDate: dayListMode \? dayAnchor : null/);
  assert.match(screen, /initialDate=\{composer\?\.initialDate \?\? null\}/);
  assert.match(composer, /startDate: initialDate\.slice\(0, 10\)/);
});

test('JOURNAL-INLINE: itemHeight sizes item rows and shifts later offsets', () => {
  const days = ['2026-09-24', '2026-09-25'];
  const items = new Map([['2026-09-24', [{ id: 'a', h: 200 }]], ['2026-09-25', [{ id: 'b', h: 60 }]]]);
  const layout = buildDayListLayout(days, items, (i) => i.id, (i) => i.h);
  assert.deepEqual(layout.lengths, [DAY_LIST_HEADER_H, 200, DAY_LIST_HEADER_H, 60]);
  assert.equal(layout.headerOffsets[1], DAY_LIST_HEADER_H + 200);
  const plain = buildDayListLayout(days, items, (i) => i.id);
  assert.equal(plain.lengths[1], DAY_LIST_ITEM_H);
});
