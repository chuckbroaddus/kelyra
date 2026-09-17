import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  CLASS_TABS,
  DEMOTED_CLASS_TAB_KEYS,
  OFFICE_CLASS_TABS,
  classTabFromRoute,
  hrefForClassTab,
  isClassIndexPath,
  isClassIndexTab,
} from './classTabs.ts';

const DEFAULT_ORDER = [
  'today',
  'needs',
  'feed',
  'students',
  'assignments',
  'gradebook',
  'parents',
  'settings',
] as const;

const OFFICE_ORDER = ['feed', 'teacher', 'parents', 'students'] as const;

test('CT-01: CLASS_TABS default ≤8 ordered Today·Needs·Feed·Students·Assignments·Gradebook·Parents·Settings', () => {
  const keys = CLASS_TABS.map((tab) => tab.key);
  assert.ok(CLASS_TABS.length <= 8);
  assert.equal(CLASS_TABS.length, 8);
  assert.deepEqual(keys, [...DEFAULT_ORDER]);
  assert.equal(CLASS_TABS.find((tab) => tab.key === 'needs')?.label, 'Needs Attention');
  assert.equal(CLASS_TABS.find((tab) => tab.key === 'settings')?.icon, 'settings');
  assert.equal(CLASS_TABS.at(-1)?.key, 'settings');
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
  assert.equal(hrefForClassTab(id, 'settings'), `/class/${id}/settings`);

  assert.equal(classTabFromRoute(`/class/${id}/setup`), 'students');
  assert.equal(classTabFromRoute(`/class/${id}/gradebook`), 'gradebook');
  assert.equal(classTabFromRoute(`/class/${id}/settings`), 'settings');
  assert.equal(classTabFromRoute(`/class/${id}/syllabus`), 'settings');
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

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('CT-09: ClassTabs hosted in class _layout (pageChromeHosted panes; no per-pane ClassTabs)', () => {
  const layout = read('src/app/class/[id]/_layout.tsx');
  assert.match(layout, /<ClassTabs classId=\{classId\}/);
  assert.match(layout, /isClassDeskTabsRoute/);
  assert.match(layout, /CollapsingPageChrome/);

  const desks = [
    'src/app/class/[id]/feed.tsx',
    'src/app/class/[id]/index.tsx',
    'src/app/class/[id]/assignments.tsx',
    'src/app/class/[id]/setup.tsx',
    'src/app/class/[id]/parents.tsx',
    'src/app/class/[id]/settings.tsx',
    'src/app/class/[id]/gradebook.tsx',
    'src/app/class/[id]/family.tsx',
    'src/app/class/[id]/syllabus.tsx',
  ];
  for (const rel of desks) {
    const src = read(rel);
    assert.match(src, /pageChromeHosted/, `${rel} must use pageChromeHosted (layout hosts ClassTabs)`);
    assert.doesNotMatch(src, /<ClassTabs\b/, `${rel} must not mount its own ClassTabs`);
  }

  const tabs = read('src/components/ui/ClassTabs.tsx');
  assert.match(tabs, /useGlobalSearchParams/);
  assert.match(tabs, /setParams/);
  assert.match(tabs, /isClassIndexTab/);

  const book = read('src/app/class/[id]/gradebook.tsx');
  assert.match(book, /pageChromeHosted/);
});


test('CT-10: collapse restore wiring — begin-drag reveal + dock-style absolute chrome', () => {
  const provider = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(provider, /onScrollBeginDrag/);
  assert.match(provider, /revealFromTopDrag|stepHideOnScroll/);

  const chrome = read('src/components/ui/CollapsingPageChrome.tsx');
  assert.match(chrome, /position:\s*['"]absolute['"]|styles\.bodyAbs/);

  const feedPane = read('src/components/ui/FeedPane.tsx');
  assert.match(feedPane, /onScrollBeginDrag/);
  assert.match(feedPane, /alwaysBounceVertical/);

  const screen = read('src/components/ui/Screen.tsx');
  assert.match(screen, /onScrollBeginDrag/);
  assert.match(screen, /alwaysBounceVertical/);
});

test('Needs stay: href feed→needs lands on index ?tab=needs', () => {
  const id = 'class-1';
  assert.equal(hrefForClassTab(id, 'needs'), `/class/${id}?tab=needs`);
  assert.equal(hrefForClassTab(id, 'today'), `/class/${id}?tab=today`);
  assert.equal(hrefForClassTab(id, 'feed'), `/class/${id}/feed`);
});

test('Needs stay: selection when URL is /class/id?tab=needs', () => {
  const id = 'class-1';
  assert.equal(classTabFromRoute(`/class/${id}`, 'needs'), 'needs');
  assert.equal(classTabFromRoute(`/class/${id}/`, 'needs'), 'needs');
  assert.equal(classTabFromRoute(`/class/${id}`, 'today'), 'today');
  assert.equal(classTabFromRoute(`/class/${id}`, undefined), 'today');
  // Index path + needs must not fall through to today
  assert.notEqual(classTabFromRoute(`/class/${id}`, 'needs'), 'today');
});

test('Needs stay: /feed wins only on feed path; index needs sticks', () => {
  const id = 'class-1';
  assert.equal(classTabFromRoute(`/class/${id}/feed`, 'needs'), 'feed');
  assert.equal(classTabFromRoute(`/class/${id}`, 'needs'), 'needs');
  assert.ok(isClassIndexPath(`/class/${id}`));
  assert.ok(isClassIndexPath(`/class/${id}/`));
  assert.equal(isClassIndexPath(`/class/${id}/feed`), false);
  assert.ok(isClassIndexTab('needs'));
  assert.ok(isClassIndexTab('today'));
  assert.equal(isClassIndexTab('feed'), false);
});
