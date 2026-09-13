import assert from 'node:assert/strict';
import test from 'node:test';

import { itemDayKey, mapCalendarItemRow, mapCalendarLayerRow } from './mapItem.ts';
import type { CalendarItemRow, CalendarLayerRow } from './types.ts';

test('mapCalendarItemRow maps assignment Hidden for teacher DP-A', () => {
  const row: CalendarItemRow = {
    source: 'assignment',
    id: 'a1',
    calendar_id: 'cw1',
    title: 'Unit quiz',
    starts_at: '2026-09-15T12:00:00.000Z',
    ends_at: '2026-09-15T12:00:00.000Z',
    all_day: true,
    category: 'quiz',
    role_tint: 'academic',
    class_id: 'c1',
    student_id: null,
    visibility: 'hidden',
    is_hidden: true,
    is_read_only: true,
    is_draft: false,
    deep_link: '/class/c1/assignment/a1',
  };
  const item = mapCalendarItemRow(row);
  assert.equal(item.source, 'assignment');
  assert.equal(item.isHidden, true);
  assert.equal(item.category, 'quiz');
  assert.equal(item.deepLink, row.deep_link);
});

test('mapCalendarItemRow never marks events isHidden via assignment flag', () => {
  const row: CalendarItemRow = {
    source: 'event',
    id: 'e1',
    calendar_id: 's1',
    title: 'Holiday',
    starts_at: '2026-09-15T00:00:00.000Z',
    ends_at: '2026-09-15T23:59:59.000Z',
    all_day: true,
    category: 'school',
    role_tint: 'school',
    class_id: null,
    student_id: null,
    visibility: 'school',
    is_hidden: true,
    is_read_only: false,
    is_draft: false,
    deep_link: '/calendar?event=e1',
  };
  assert.equal(mapCalendarItemRow(row).isHidden, false);
});

test('mapCalendarLayerRow preserves kind for LF-A', () => {
  const row: CalendarLayerRow = {
    id: 'l1',
    kind: 'class_work',
    name: 'Math work',
    role_tint: 'academic',
    class_id: 'c1',
    default_enabled: true,
    is_read_only: true,
    can_unsubscribe: false,
  };
  const layer = mapCalendarLayerRow(row);
  assert.equal(layer.kind, 'class_work');
  assert.equal(layer.defaultEnabled, true);
  assert.equal(layer.isReadOnly, true);
});

test('itemDayKey uses local calendar date', () => {
  const item = mapCalendarItemRow({
    source: 'assignment',
    id: 'a1',
    calendar_id: 'cw1',
    title: 'HW',
    starts_at: '2026-09-15T17:00:00.000Z',
    ends_at: '2026-09-15T17:00:00.000Z',
    all_day: true,
    category: 'homework',
    role_tint: 'academic',
    class_id: 'c1',
    student_id: null,
    visibility: 'published',
    is_hidden: false,
    is_read_only: true,
    is_draft: false,
    deep_link: null,
  });
  assert.match(itemDayKey(item), /^\d{4}-\d{2}-\d{2}$/);
});
