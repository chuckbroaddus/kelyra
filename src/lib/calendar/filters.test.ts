import assert from 'node:assert/strict';
import test from 'node:test';

import type { CalendarLayer } from './types.ts';
import {
  applyPreset,
  areFiltersNarrowed,
  categoriesForChips,
  CATEGORY_CHIPS,
  clearFilters,
  filterItemsByEnabledLayers,
  toggleChip,
  toggleLayerEnabled,
} from './filters.ts';
import { defaultCategoryChipIds, defaultEnabledCalendarIds } from './prefs.ts';

const layers: CalendarLayer[] = [
  {
    id: 's',
    kind: 'school',
    name: 'School',
    roleTint: 'school',
    classId: null,
    defaultEnabled: true,
    isReadOnly: true,
    canUnsubscribe: false,
  },
  {
    id: 'c',
    kind: 'class',
    name: 'Class',
    roleTint: 'academic',
    classId: 'x',
    defaultEnabled: true,
    isReadOnly: false,
    canUnsubscribe: false,
  },
  {
    id: 'w',
    kind: 'class_work',
    name: 'Work',
    roleTint: 'academic',
    classId: 'x',
    defaultEnabled: true,
    isReadOnly: true,
    canUnsubscribe: false,
  },
  {
    id: 't',
    kind: 'team',
    name: 'Team',
    roleTint: 'sport',
    classId: null,
    defaultEnabled: false,
    isReadOnly: false,
    canUnsubscribe: true,
  },
];

test('filters ≠ security: client filter only drops by calendarId, never elevates', () => {
  const items = [
    { calendarId: 'c', title: 'Field trip' },
    { calendarId: 'w', title: 'Homework' },
    { calendarId: 'secret', title: 'Should not appear from server anyway' },
  ];
  // Disable class_work only — class events remain (Disable homework ≠ hide class events).
  const filtered = filterItemsByEnabledLayers(items, ['c']);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]!.title, 'Field trip');
  // Enabling an id the server never returned does not invent rows.
  assert.equal(filterItemsByEnabledLayers(items, ['c', 'forged-id']).length, 1);
});

test('category chips expand to assignment categories', () => {
  const cats = categoriesForChips(['academic', 'school']);
  assert.ok(cats);
  assert.ok(cats!.includes('quiz'));
  assert.ok(cats!.includes('school'));
  assert.ok(!cats!.includes('sport'));
  assert.equal(CATEGORY_CHIPS.length, 4);
});

test('presets: All academic / School only / My sports / Reset', () => {
  const academic = applyPreset('all_academic', layers);
  assert.deepEqual(academic.categoryChipIds, ['academic']);
  assert.ok(academic.enabledCalendarIds!.includes('c'));
  assert.ok(academic.enabledCalendarIds!.includes('w'));
  assert.ok(!academic.enabledCalendarIds!.includes('t'));

  const school = applyPreset('school_only', layers);
  assert.deepEqual(school.categoryChipIds, ['school']);
  assert.deepEqual(school.enabledCalendarIds, ['s']);

  const sports = applyPreset('my_sports', layers);
  assert.deepEqual(sports.categoryChipIds, ['sport']);
  assert.deepEqual(sports.enabledCalendarIds, ['t']);

  const reset = applyPreset('reset', layers);
  assert.ok(reset.categoryChipIds!.includes('academic'));
  assert.ok(!reset.categoryChipIds!.includes('sport'));
  assert.ok(!reset.enabledCalendarIds!.includes('t'));
});

test('toggle helpers', () => {
  assert.deepEqual(toggleChip(['academic'], 'sport'), ['academic', 'sport']);
  assert.deepEqual(toggleChip(['academic', 'sport'], 'sport'), ['academic']);
  assert.deepEqual(toggleLayerEnabled(['c', 'w'], 'w'), ['c']);
  assert.deepEqual(toggleLayerEnabled(['c'], 't'), ['c', 't']);
});

test('areFiltersNarrowed: defaults (sport off) are not narrowed; presets are', () => {
  const defaults = defaultCategoryChipIds();
  const defaultEnabled = defaultEnabledCalendarIds(layers);
  assert.equal(areFiltersNarrowed(defaults, defaultEnabled, layers), false);
  assert.equal(areFiltersNarrowed(defaults, defaultEnabled, []), false);
  const school = applyPreset('school_only', layers);
  assert.equal(
    areFiltersNarrowed(school.categoryChipIds!, school.enabledCalendarIds!, layers),
    true,
  );
  const reset = applyPreset('reset', layers);
  assert.equal(
    areFiltersNarrowed(reset.categoryChipIds!, reset.enabledCalendarIds!, layers),
    false,
  );
});

test('CAL-R5-08 Clear Filters: deselect every chip (none selected); not multi-select reset', () => {
  const cleared = clearFilters(layers);
  assert.deepEqual(cleared.categoryChipIds, []);
  assert.deepEqual(cleared.enabledCalendarIds, defaultEnabledCalendarIds(layers));
  assert.equal(categoriesForChips([]), null);
  assert.equal(areFiltersNarrowed([], cleared.enabledCalendarIds!, layers), false);
  // Must not leave academic/school/personal selected (old reset bug).
  assert.ok(!cleared.categoryChipIds!.includes('academic'));
  assert.ok(!cleared.categoryChipIds!.includes('school'));
  assert.ok(!cleared.categoryChipIds!.includes('personal'));
});
