import assert from 'node:assert/strict';
import test from 'node:test';

import type { CalendarLayer } from './types.ts';
import {
  calPrefsKey,
  defaultCategoryChipIds,
  defaultEnabledCalendarIds,
  resolveCategoryChipIds,
  resolveEnabledCalendarIds,
} from './prefs.ts';

const layers: CalendarLayer[] = [
  {
    id: 'school-1',
    kind: 'school',
    name: 'School',
    roleTint: 'school',
    classId: null,
    defaultEnabled: true,
    isReadOnly: true,
    canUnsubscribe: false,
  },
  {
    id: 'class-1',
    kind: 'class',
    name: '5th Math',
    roleTint: 'academic',
    classId: 'c1',
    defaultEnabled: true,
    isReadOnly: false,
    canUnsubscribe: false,
  },
  {
    id: 'work-1',
    kind: 'class_work',
    name: '5th Math work',
    roleTint: 'academic',
    classId: 'c1',
    defaultEnabled: true,
    isReadOnly: true,
    canUnsubscribe: false,
  },
  {
    id: 'team-1',
    kind: 'team',
    name: 'Soccer',
    roleTint: 'sport',
    classId: null,
    defaultEnabled: false,
    isReadOnly: false,
    canUnsubscribe: true,
  },
];

test('prefs key isolates seat and focused child (CH-A)', () => {
  const a = calPrefsKey('p1', 'parent', 'child-a');
  const b = calPrefsKey('p1', 'parent', 'child-b');
  const t = calPrefsKey('p1', 'teacher', null);
  assert.notEqual(a, b);
  assert.notEqual(a, t);
  assert.match(a, /calprefs:v1:p1:parent:child-a/);
  assert.match(calPrefsKey('p1', 'student', null), /:none$/);
});

test('sport / team layers off by default even when prefs empty', () => {
  const ids = defaultEnabledCalendarIds(layers);
  assert.ok(ids.includes('school-1'));
  assert.ok(ids.includes('class-1'));
  assert.ok(ids.includes('work-1'));
  assert.ok(!ids.includes('team-1'));
  assert.deepEqual(resolveEnabledCalendarIds(null, layers), ids);
  assert.ok(!defaultCategoryChipIds().includes('sport'));
  assert.deepEqual(resolveCategoryChipIds(null), defaultCategoryChipIds());
});

test('class_work disable is independent of class layer id', () => {
  const prefs = {
    version: 1 as const,
    enabledCalendarIds: ['school-1', 'class-1'], // work-1 off
    categoryChipIds: null,
  };
  const enabled = resolveEnabledCalendarIds(prefs, layers);
  assert.ok(enabled.includes('class-1'));
  assert.ok(!enabled.includes('work-1'));
});

test('stale enabled ids dropped (unknown layers)', () => {
  const prefs = {
    version: 1 as const,
    enabledCalendarIds: ['school-1', 'gone-team'],
    categoryChipIds: ['academic'],
  };
  assert.deepEqual(resolveEnabledCalendarIds(prefs, layers), ['school-1']);
});
