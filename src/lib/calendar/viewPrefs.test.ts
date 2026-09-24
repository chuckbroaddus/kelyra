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

test('defaultViewFor: phone and web Year for every seat', () => {
  for (const seat of ['teacher', 'office', 'parent', 'student'] as const) {
    assert.equal(defaultViewFor('phone', seat), 'year');
    assert.equal(defaultViewFor('web', seat), 'year');
  }
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

test('parseCalViewPrefsJson accepts views + days + modes; migrates v1/v2', () => {
  const ok = parseCalViewPrefsJson(
    JSON.stringify({
      version: 3,
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
  assert.equal(ok.version, 3);

  const v1 = parseCalViewPrefsJson(
    JSON.stringify({ version: 1, view: 'month', days: 5 }),
    'phone',
    'teacher',
  );
  assert.equal(v1.view, 'month');
  assert.equal(v1.monthMode, 'compact');
  assert.equal(v1.dayMode, 'single');
  assert.equal(v1.version, 3);

  const multi = parseCalViewPrefsJson(
    JSON.stringify({ version: 1, view: 'multiday', days: 5 }),
    'phone',
    'teacher',
  );
  assert.equal(multi.view, 'multiday');
  assert.equal(multi.days, 5);

  const bad = parseCalViewPrefsJson('not-json', 'web', 'office');
  assert.deepEqual(bad, emptyViewPrefs('web', 'office'));
  assert.equal(bad.view, 'year');

  const badDays = parseCalViewPrefsJson(
    JSON.stringify({ version: 1, view: 'week', days: 4 }),
    'phone',
    'teacher',
  );
  assert.equal(badDays.view, 'week');
  assert.equal(badDays.days, 5);
});

test('parseCalViewPrefsJson: web week/month/agenda at v<3 migrate to year', () => {
  for (const view of ['week', 'month', 'agenda'] as const) {
    for (const ver of [1, 2] as const) {
      const migrated = parseCalViewPrefsJson(
        JSON.stringify({ version: ver, view, days: 5 }),
        'web',
        'teacher',
      );
      assert.equal(migrated.view, 'year', `web ${view} @v${ver} → year`);
      assert.equal(migrated.version, 3);
    }
  }

  // day / year / multiday stay; already-year stays
  for (const view of ['day', 'year', 'multiday'] as const) {
    const kept = parseCalViewPrefsJson(
      JSON.stringify({ version: 2, view, days: 3 }),
      'web',
      'office',
    );
    assert.equal(kept.view, view, `web ${view} @v2 preserved`);
    assert.equal(kept.version, 3);
  }

  // After bump, intentional week/month/agenda at v3 are preserved
  for (const view of ['week', 'month', 'agenda'] as const) {
    const kept = parseCalViewPrefsJson(
      JSON.stringify({ version: 3, view, days: 5 }),
      'web',
      'teacher',
    );
    assert.equal(kept.view, view, `web ${view} @v3 preserved`);
  }

  // Phone week/month/agenda at v2 are not force-migrated (phone already defaulted year)
  const phoneWeek = parseCalViewPrefsJson(
    JSON.stringify({ version: 2, view: 'week', days: 5 }),
    'phone',
    'teacher',
  );
  assert.equal(phoneWeek.view, 'week');
  assert.equal(phoneWeek.version, 3);
});

test('zoom ladder Day → Week → Month → Year; agenda climb (CEO 2026-09-24)', () => {
  assert.equal(zoomParentView('day'), 'week');
  assert.equal(zoomParentView('week'), 'month');
  assert.equal(zoomParentView('month'), 'year');
  assert.equal(zoomParentView('year'), null);
  assert.equal(zoomParentView('multiday'), 'month');
  assert.equal(zoomParentView('agenda'), 'month');
  assert.equal(canZoomUp('day'), true);
  assert.equal(canZoomUp('year'), false);
});

test('empty phone prefs default Year + compact/single modes', () => {
  const p = emptyViewPrefs('phone', 'teacher');
  assert.equal(p.view, 'year');
  assert.equal(p.monthMode, 'compact');
  assert.equal(p.dayMode, 'single');
  assert.equal(p.version, 3);
});

test('empty web prefs default Year for every seat', () => {
  for (const seat of ['teacher', 'office', 'parent', 'student'] as const) {
    assert.equal(emptyViewPrefs('web', seat).view, 'year');
  }
});
