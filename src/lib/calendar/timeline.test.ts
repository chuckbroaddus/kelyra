import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  dayRoleTints,
  formatHourLabel,
  layoutTimedBlocks,
  splitDayItems,
  timelineHours,
} from './timeline.ts';
import type { CalendarItem } from './types.ts';

function item(partial: Partial<CalendarItem> & Pick<CalendarItem, 'id' | 'title' | 'startsAt'>): CalendarItem {
  return {
    source: 'event',
    calendarId: 'cal1',
    endsAt: null,
    allDay: false,
    category: 'class',
    roleTint: 'academic',
    classId: null,
    studentId: null,
    visibility: 'published',
    isHidden: false,
    isReadOnly: false,
    isDraft: false,
    deepLink: null,
    ...partial,
  };
}

test('timelineHours covers gutter window', () => {
  const hours = timelineHours();
  assert.equal(hours[0], 6);
  assert.equal(hours[hours.length - 1], 22);
  assert.equal(formatHourLabel(9), '9 AM');
  assert.equal(formatHourLabel(12), '12 PM');
  assert.equal(formatHourLabel(15), '3 PM');
});

test('splitDayItems separates all-day from timed for one day', () => {
  const items = [
    item({ id: '1', title: 'A', startsAt: '2026-09-14T00:00:00', allDay: true }),
    item({ id: '2', title: 'B', startsAt: '2026-09-14T15:00:00', allDay: false }),
    item({ id: '3', title: 'C', startsAt: '2026-09-15T09:00:00', allDay: false }),
  ];
  const { allDay, timed } = splitDayItems(items, '2026-09-14');
  assert.equal(allDay.length, 1);
  assert.equal(timed.length, 1);
  assert.equal(timed[0]!.id, '2');
});

test('layoutTimedBlocks places blocks in hour gutter', () => {
  const layouts = layoutTimedBlocks([
    item({
      id: '1',
      title: 'Block',
      startsAt: '2026-09-14T09:00:00',
      endsAt: '2026-09-14T10:00:00',
    }),
  ]);
  assert.equal(layouts.length, 1);
  assert.ok(layouts[0]!.top >= 0);
  assert.ok(layouts[0]!.height >= 18);
});

test('dayRoleTints caps at 4 role tints; empty day stays empty', () => {
  assert.deepEqual(dayRoleTints([], '2026-09-14'), []);
  const items = [
    item({ id: '1', title: 'a', startsAt: '2026-09-14T09:00:00', roleTint: 'academic' }),
    item({ id: '2', title: 'b', startsAt: '2026-09-14T10:00:00', roleTint: 'school' }),
    item({ id: '3', title: 'c', startsAt: '2026-09-14T11:00:00', roleTint: 'sport' }),
    item({ id: '4', title: 'd', startsAt: '2026-09-14T12:00:00', roleTint: 'personal' }),
    item({ id: '5', title: 'e', startsAt: '2026-09-14T13:00:00', roleTint: 'academic' }),
  ];
  const tints = dayRoleTints(items, '2026-09-14', 4);
  assert.equal(tints.length, 4);
  assert.deepEqual(tints, ['academic', 'school', 'sport', 'personal']);
});
