import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calViewPrefsKey,
  defaultViewFor,
  emptyViewPrefs,
  parseCalViewPrefsJson,
} from './viewPrefs.ts';

test('defaultViewFor: phone Agenda; teacher web Week; office web Month', () => {
  assert.equal(defaultViewFor('phone', 'teacher'), 'agenda');
  assert.equal(defaultViewFor('phone', 'parent'), 'agenda');
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

test('parseCalViewPrefsJson accepts VW-R3-C views + days; falls back safely', () => {
  const ok = parseCalViewPrefsJson(
    JSON.stringify({ version: 1, view: 'year', days: 3 }),
    'phone',
    'teacher',
  );
  assert.equal(ok.view, 'year');
  assert.equal(ok.days, 3);

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
