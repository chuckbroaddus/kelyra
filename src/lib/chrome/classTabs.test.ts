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

test('CT-09: every class desk pane collapses ClassTabs like Feed (§9.6)', () => {
  const screen = read('src/components/ui/Screen.tsx');
  assert.match(screen, /collapse\?:/);
  assert.match(screen, /CollapsingPageChrome/);

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
    assert.match(src, /collapse=/, `${rel} must pass ClassTabs via Screen collapse`);
    assert.doesNotMatch(
      src,
      /<Screen[^>]*>\s*\{[^}\n]*<ClassTabs/,
      `${rel} must not render ClassTabs inside Screen children`,
    );
  }

  const feed = read('src/app/class/[id]/feed.tsx');
  assert.match(feed, /collapse=\{id \? <ClassTabs classId=\{id\} \/> : null\}/);
  assert.match(feed, /scroll=\{false\}/);

  const book = read('src/app/class/[id]/gradebook.tsx');
  assert.match(book, /collapse=\{collapsing\}/);
  assert.doesNotMatch(book, /import \{ CollapsingPageChrome \}/);

  const docs = read('docs/ui-design.md');
  assert.match(docs, /Canonical reference: class Feed/);
  assert.match(docs, /Screen collapse=/);
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
