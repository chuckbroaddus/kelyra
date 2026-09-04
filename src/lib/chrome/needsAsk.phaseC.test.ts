import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CLASS_TABS } from './classTabs.ts';
import { headerTitleFor } from './titles.ts';
import { tabsFor, trayKeysForRole } from './trayTabs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('TR-06 / ND-01/02: tray Needs label; href stays /inbox; key stays inbox', () => {
  const tabs = tabsFor('teacher', '/inbox', 'c1', 0);
  const needs = tabs.find((tab) => tab.key === 'inbox');
  assert.ok(needs);
  assert.equal(needs.label, 'Needs');
  assert.equal(needs.href, '/inbox');
  assert.equal(needs.icon, 'inbox');
  assert.equal(CLASS_TABS.find((tab) => tab.key === 'needs')?.label, 'Needs');
});

test('TR-11 / ND: badge is count-only; same numeric source param for tray Needs', () => {
  const withBadge = tabsFor('teacher', '/', 'c1', 3);
  const needs = withBadge.find((tab) => tab.key === 'inbox');
  assert.equal(needs?.badge, 3);
  assert.equal(typeof needs?.badge, 'number');
  const zero = tabsFor('teacher', '/', 'c1', 0).find((tab) => tab.key === 'inbox');
  assert.equal(zero?.badge, undefined);

  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /needsCount/);
  assert.match(chrome, /countNeedsYou/);
  assert.match(chrome, /setNeedsCount\(work\)/);
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(tray, /chromeState\.role === 'teacher' \? chromeState\.needsCount : chromeState\.badgeCount/);
  const api = read('src/lib/captures/api.ts');
  assert.match(api, /Single Needs queue count for tray \+ desk/);
});

test('ND-03: empty states tie Capture → Needs → Approve on web', () => {
  const inbox = read('src/app/inbox.tsx');
  const desk = read('src/app/class/[id]/index.tsx');
  assert.match(inbox, /Capture work, review it in Needs, then Approve on the student page on web/);
  assert.match(desk, /Capture work, review it in Needs, then Approve on the student page on web/);
});

test('ASK-01/02/05: class name chip on teacher Ask; one /ask; office Ask unchanged', () => {
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /chrome\.role === 'teacher' && chrome\.className/);
  assert.match(ask, /Working in \$\{chrome\.className\}/);
  assert.match(ask, /classId: chrome\.classId/);
  assert.doesNotMatch(ask, /EXPO_PUBLIC_/);

  const classTabs = read('src/lib/chrome/classTabs.ts');
  assert.doesNotMatch(classTabs, /ask|\/ask/);
  const header = read('src/components/ui/AppHeader.tsx');
  assert.doesNotMatch(header, /href:\s*['"]\/ask['"]|push\(['"]\/ask['"]\)/);

  const teacherAsk = tabsFor('teacher', '/ask', 'c1', 0).find((tab) => tab.key === 'ask');
  assert.equal(teacherAsk?.href, '/ask');
  const officeAsk = tabsFor('administrator', '/ask', null, 0).find((tab) => tab.key === 'ask');
  assert.equal(officeAsk?.href, '/ask');
  assert.equal(officeAsk?.label, 'Kelyra');
});

test('ASK-03/04 / SEC-04: no new Ask tools; policy maps keep officeOnly / teacherSeatOnly', () => {
  const policy = read('src/lib/ai/askToolPolicy.ts');
  assert.match(policy, /officeOnly/);
  assert.match(policy, /teacherSeatOnly/);
  assert.match(policy, /if \(policy\.officeOnly\) return isOfficeRole\(profile\)/);
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  assert.match(edge, /officeOnly/);
  assert.match(edge, /teacherSeatOnly/);
});

test('C5 / HB-04: Grade book and Parents demoted to drawer search; Family stays', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /q\.trim\(\) && matches\('Grade book'/);
  assert.match(drawer, /q\.trim\(\) && matches\('Parents'/);
  assert.match(drawer, /matches\('Family update'/);
  assert.match(drawer, /const teacherSeat = chromeState\.role === 'teacher'/);
  assert.match(drawer, /const officeSeat = isOfficeChromeRole\(chromeState\.role\)/);
});

test('Phase A+B intact: five tray keys; Class setup; CLASS_TABS ≤7; no sixth', () => {
  assert.deepEqual(trayKeysForRole('teacher'), ['home', 'capture', 'inbox', 'class', 'ask']);
  assert.equal(trayKeysForRole('teacher').length, 5);
  const classTab = tabsFor('teacher', '/', 'abc', 0).find((tab) => tab.key === 'class');
  assert.equal(classTab?.href, '/class/abc/setup');
  assert.ok(CLASS_TABS.length <= 7);
});

test('titles: /inbox wordmark is Needs', () => {
  assert.equal(
    headerTitleFor({
      pathname: '/inbox',
      pushedTitle: null,
      className: null,
      contextTab: 'all',
      role: 'teacher',
    }),
    'Needs',
  );
});

test('SEC / invariants: no EXPO_PUBLIC secrets; matcher never inserts; canCreateClass untouched', () => {
  for (const rel of [
    'src/lib/chrome/trayTabs.ts',
    'src/lib/chrome/ChromeProvider.tsx',
    'src/components/ui/FloatingTabTray.tsx',
    'src/components/ui/HamburgerDrawer.tsx',
    'src/app/ask.tsx',
    'src/app/inbox.tsx',
  ]) {
    assert.doesNotMatch(read(rel), /EXPO_PUBLIC_[A-Z0-9_]*KEY|EXPO_PUBLIC_XAI|EXPO_PUBLIC_SECRET/);
  }
  const matchName = read('src/lib/matching/matchName.ts');
  assert.doesNotMatch(matchName, /\.insert\(|from\('students'\)\.insert/);
  const index = read('src/app/index.tsx');
  assert.match(index, /canCreateClass\s*=\s*isOfficeRole\(profile\)/);
});
