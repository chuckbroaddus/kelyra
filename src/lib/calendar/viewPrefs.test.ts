import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calViewPrefsKey,
  canZoomUp,
  defaultViewFor,
  emptyViewPrefs,
  parseCalViewPrefsJson,
  zoomParentView,
} from './viewPrefs.ts';

test('defaultViewFor: phone Year; teacher web Week; office web Month (R4 L-C)', () => {
  assert.equal(defaultViewFor('phone', 'teacher'), 'year');
  assert.equal(defaultViewFor('phone', 'parent'), 'year');
  assert.equal(defaultViewFor('phone', 'student'), 'year');
  assert.equal(defaultViewFor('web', 'teacher'), 'week');
  assert.equal(defaultViewFor('web', 'office'), 'month');
  assert.equal(defaultViewFor('web', 'student'), 'agenda');
});

test('calViewPrefsKey scopes by profile · seat · device · child', () => {
  assert.equal(
    calViewPrefsKey('p1', 'parent', 'phone', 'c1'),
    'calview:v1:p1:parent:phone:c1',
  );
  assert.equal(
    calViewPrefsKey('p1', 'teacher', 'web', null),
    'calview:v1:p1:teacher:web:none',
  );
});

test('parseCalViewPrefsJson accepts views + days + modes; migrates v1', () => {
  const ok = parseCalViewPrefsJson(
    JSON.stringify({
      version: 2,
      view: 'year',
      days: 3,
      monthMode: 'list',
      dayMode: 'list',
    }),
    'phone',
    'teacher',
  );
  assert.equal(ok.view, 'year');
  assert.equal(ok.days, 3);
  assert.equal(ok.monthMode, 'list');
  assert.equal(ok.dayMode, 'list');

  const v1 = parseCalViewPrefsJson(
    JSON.stringify({ version: 1, view: 'month', days: 5 }),
    'phone',
    'teacher',
  );
  assert.equal(v1.view, 'month');
  assert.equal(v1.monthMode, 'compact');
  assert.equal(v1.dayMode, 'single');
  assert.equal(v1.version, 2);

  const multi = parseCalViewPrefsJson(
    JSON.stringify({ version: 1, view: 'multiday', days: 5 }),
    'phone',
    'teacher',
  );
  assert.equal(multi.view, 'multiday');
  assert.equal(multi.days, 5);

  const bad = parseCalViewPrefsJson('not-json', 'web', 'office');
  assert.deepEqual(bad, emptyViewPrefs('web', 'office'));
  assert.equal(bad.view, 'month');

  const badDays = parseCalViewPrefsJson(
    JSON.stringify({ version: 1, view: 'week', days: 4 }),
    'phone',
    'teacher',
  );
  assert.equal(badDays.view, 'week');
  assert.equal(badDays.days, 5);
});

test('zoom ladder Day → Month → Year; no invented RTL gesture', () => {
  assert.equal(zoomParentView('day'), 'month');
  assert.equal(zoomParentView('month'), 'year');
  assert.equal(zoomParentView('year'), null);
  assert.equal(zoomParentView('agenda'), null);
  assert.equal(canZoomUp('day'), true);
  assert.equal(canZoomUp('year'), false);
});

test('empty phone prefs default Year + compact/single modes', () => {
  const p = emptyViewPrefs('phone', 'teacher');
  assert.equal(p.view, 'year');
  assert.equal(p.monthMode, 'compact');
  assert.equal(p.dayMode, 'single');
});
