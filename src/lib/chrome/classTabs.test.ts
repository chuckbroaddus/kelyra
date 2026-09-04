import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLASS_TABS,
  DEMOTED_CLASS_TAB_KEYS,
  OFFICE_CLASS_TABS,
  classTabFromRoute,
  hrefForClassTab,
} from './classTabs.ts';

const DEFAULT_ORDER = [
  'today',
  'needs',
  'feed',
  'students',
  'assignments',
  'gradebook',
  'parents',
] as const;

const OFFICE_ORDER = ['feed', 'teacher', 'parents', 'students'] as const;

test('CT-01: CLASS_TABS default ≤7 ordered Today·Needs·Feed·Students·Assignments·Gradebook·Parents', () => {
  const keys = CLASS_TABS.map((tab) => tab.key);
  assert.ok(CLASS_TABS.length <= 7);
  assert.equal(CLASS_TABS.length, 7);
  assert.deepEqual(keys, [...DEFAULT_ORDER]);
  assert.equal(CLASS_TABS.find((tab) => tab.key === 'needs')?.label, 'Needs');
});

test('CT-02/03/04: Week, Heatmap, Family not in default icon set', () => {
  const keys = new Set(CLASS_TABS.map((tab) => tab.key));
  for (const demoted of DEMOTED_CLASS_TAB_KEYS) {
    assert.ok(!keys.has(demoted), `${demoted} must not be a default ClassTab`);
  }
  assert.ok(!keys.has('week'));
  assert.ok(!keys.has('heatmap'));
  assert.ok(!keys.has('family'));
  assert.ok(!keys.has('syllabus'));
});

test('CT-05: OFFICE_CLASS_TABS freeze Feed·Teacher·Parents·Students', () => {
  assert.deepEqual(
    OFFICE_CLASS_TABS.map((tab) => tab.key),
    [...OFFICE_ORDER],
  );
  const teacher = new Set(CLASS_TABS.map((tab) => tab.key));
  const office = new Set(OFFICE_CLASS_TABS.map((tab) => tab.key));
  assert.ok(office.has('teacher'));
  assert.ok(!teacher.has('teacher'));
  assert.notDeepEqual([...teacher].sort(), [...office].sort());
});

test('CT-08: demoted routes still resolve for teacher of class', () => {
  const id = 'class-1';
  assert.equal(hrefForClassTab(id, 'week'), `/class/${id}?tab=week`);
  assert.equal(hrefForClassTab(id, 'heatmap'), `/class/${id}/gradebook?tab=heatmap`);
  assert.equal(hrefForClassTab(id, 'family'), `/class/${id}/family`);
  assert.equal(hrefForClassTab(id, 'today'), `/class/${id}?tab=today`);
  assert.equal(hrefForClassTab(id, 'students'), `/class/${id}/setup`);
  assert.equal(hrefForClassTab(id, 'gradebook'), `/class/${id}/gradebook`);

  assert.equal(classTabFromRoute(`/class/${id}/setup`), 'students');
  assert.equal(classTabFromRoute(`/class/${id}/gradebook`), 'gradebook');
});

test('L4: demoted deep-links highlight nearby default ClassTabs', () => {
  const id = 'class-1';
  const defaults = new Set(CLASS_TABS.map((tab) => tab.key));
  assert.equal(classTabFromRoute(`/class/${id}`, 'week'), 'today');
  assert.equal(classTabFromRoute(`/class/${id}/gradebook`, 'heatmap'), 'gradebook');
  assert.equal(classTabFromRoute(`/class/${id}/family`), 'parents');
  assert.ok(defaults.has(classTabFromRoute(`/class/${id}`, 'week')));
  assert.ok(defaults.has(classTabFromRoute(`/class/${id}/gradebook`, 'heatmap')));
  assert.ok(defaults.has(classTabFromRoute(`/class/${id}/family`)));
  for (const demoted of DEMOTED_CLASS_TAB_KEYS) {
    assert.ok(!defaults.has(demoted));
  }
});
