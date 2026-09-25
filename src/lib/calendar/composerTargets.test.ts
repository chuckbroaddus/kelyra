import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { composerTargetKey, composerTargets } from './composerTargets.ts';
import type { CalendarLayer } from './types.ts';

const layer = (p: Partial<CalendarLayer>): CalendarLayer => ({
  id: p.id ?? Math.random().toString(36),
  kind: p.kind ?? 'class',
  name: p.name ?? '',
  roleTint: p.roleTint ?? 'academic',
  classId: p.classId ?? null,
  defaultEnabled: true,
  isReadOnly: false,
  canUnsubscribe: false,
});

const teacherLayers = [
  layer({ kind: 'school', name: 'School Wide Calendar', roleTint: 'school' }),
  layer({ kind: 'class', name: 'Period 3 Biology', classId: 'c3' }),
  layer({ kind: 'class_work', name: 'Period 3 Biology work', classId: 'c3' }),
  layer({ kind: 'class', name: 'Period 1 Biology', classId: 'c1' }),
  layer({ kind: 'team', name: 'Varsity Soccer', roleTint: 'sport' }),
  layer({ kind: 'personal', name: 'My calendar', roleTint: 'personal' }),
];

test('CAL-COMPOSE-TARGETS teacher: every class they teach + personal; never school/team/work', () => {
  const t = composerTargets('teacher', teacherLayers);
  assert.deepEqual(
    t.map((x) => x.label),
    ['Period 1 Biology', 'Period 3 Biology', 'My calendar'],
  );
  assert.deepEqual(t.map((x) => x.key), ['class:c1', 'class:c3', 'personal']);
  assert.ok(!t.some((x) => x.kind === 'school'));
});

test('CAL-COMPOSE-TARGETS teacher opened from a class whose layer is missing still gets it', () => {
  const t = composerTargets('teacher', [], { classId: 'c9' });
  assert.deepEqual(t.map((x) => x.key), ['class:c9', 'personal']);
});

test('CAL-COMPOSE-TARGETS office = school only; parent = absence (with child) + personal; student = personal', () => {
  assert.deepEqual(composerTargets('office', teacherLayers).map((x) => x.key), ['school']);
  assert.deepEqual(composerTargets('parent', [], { childStudentId: 's1' }).map((x) => x.key), ['absence', 'personal']);
  assert.deepEqual(composerTargets('parent', []).map((x) => x.key), ['personal']);
  assert.deepEqual(composerTargets('student', teacherLayers).map((x) => x.key), ['personal']);
  assert.equal(composerTargetKey('class', 'c1'), 'class:c1');
});

test('CAL-COMPOSE-TARGETS composer: one scrollable chip row, per-class classId on save', () => {
  const composer = readFileSync('src/components/calendar/EventComposer.tsx', 'utf8');
  const screen = readFileSync('src/app/calendar.tsx', 'utf8');
  assert.match(composer, /composerTargets\(/);
  assert.match(composer, /<ChipRow>/);
  assert.match(composer, /classId: draft\.kind === 'class' \? draft\.classId : null/);
  assert.match(screen, /layers=\{layers\}/);
});
