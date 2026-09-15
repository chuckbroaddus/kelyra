import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CalendarItem } from './types.ts';
import { yearContaining, yearMonthBlocks, yearRpcBounds } from './year.ts';

test('yearContaining and yearRpcBounds', () => {
  assert.equal(yearContaining('2026-09-14'), 2026);
  assert.deepEqual(yearRpcBounds(2026), { fromIso: '2026-01-01', toIso: '2026-12-31' });
});

test('yearMonthBlocks builds 12 mini-months; empty year has no fake dots', () => {
  const blocks = yearMonthBlocks(2026, [], new Date('2026-09-14T12:00:00'));
  assert.equal(blocks.length, 12);
  assert.equal(blocks[0]!.monthIndex0, 0);
  assert.equal(blocks[8]!.monthIndex0, 8);
  const flat = blocks.flatMap((b) => b.weeks.flat()).filter(Boolean);
  assert.ok(flat.every((cell) => cell!.tints.length === 0));
});

test('yearMonthBlocks marks role tints on event days only', () => {
  const items: CalendarItem[] = [
    {
      source: 'event',
      id: '1',
      calendarId: 'c',
      title: 'Quiz',
      startsAt: '2026-09-14T00:00:00',
      endsAt: null,
      allDay: true,
      category: 'test',
      roleTint: 'academic',
      classId: null,
      studentId: null,
      visibility: 'published',
      isHidden: false,
      isReadOnly: false,
      isDraft: false,
      deepLink: null,
    },
  ];
  const blocks = yearMonthBlocks(2026, items, new Date('2026-09-14T12:00:00'));
  const sep = blocks[8]!;
  const hit = sep.weeks.flat().find((c) => c && c.iso === '2026-09-14');
  assert.ok(hit);
  assert.deepEqual(hit!.tints, ['academic']);
  assert.equal(hit!.isToday, true);
});
