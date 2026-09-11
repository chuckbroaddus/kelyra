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

test('TR-06 / ND-01/02: tray Needs Attention label; href stays /inbox; key stays inbox', () => {
  const tabs = tabsFor('teacher', '/inbox', 'c1', 0);
  const needs = tabs.find((tab) => tab.key === 'inbox');
  assert.ok(needs);
  assert.equal(needs.label, 'Needs Attention');
  assert.equal(needs.href, '/inbox');
  assert.equal(needs.icon, 'inbox');
  assert.equal(CLASS_TABS.find((tab) => tab.key === 'needs')?.label, 'Needs Attention');
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

test('ND-03: empty states tie Capture → Needs Attention → Approve on web', () => {
  const inbox = read('src/app/inbox.tsx');
  const desk = read('src/app/class/[id]/index.tsx');
  assert.match(inbox, /Capture work, review it in Needs Attention, then Approve on the student page on web/);
  assert.match(desk, /Capture work, review it in Needs Attention, then Approve on the student page on web/);
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
  assert.equal(officeAsk?.label, 'Ask');
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

test('C5 / HB-04: Grade book and Parents always visible; search still filters; Family stays', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  // §3.3 rows 5–6: empty filter shows them (matches returns true when q empty).
  assert.match(drawer, /matches\('Grade book', q\)/);
  assert.match(drawer, /matches\('Parents', q\)/);
  assert.doesNotMatch(drawer, /q\.trim\(\) && matches\('Grade book'/);
  assert.doesNotMatch(drawer, /q\.trim\(\) && matches\('Parents'/);
  assert.match(drawer, /matches\('Family update'/);
  // matches() still gates when q is non-empty (HB-04 search).
  assert.match(drawer, /function matches\(label: string, query: string\)/);
  assert.match(drawer, /if \(!needle\) return true/);
  assert.match(drawer, /label\.toLowerCase\(\)\.includes\(needle\)/);
  assert.match(drawer, /const teacherSeat = chromeState\.role === 'teacher'/);
  assert.match(drawer, /const officeSeat = isOfficeChromeRole\(chromeState\.role\)/);
});

test('P3 HB: Grade book DrawerRow indent matches Parents/Family update', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  const blockStart = drawer.indexOf("{chromeState.classId && teacherSeat ? (");
  assert.ok(blockStart > 0);
  const familyAt = drawer.indexOf('label="Family update"', blockStart);
  assert.ok(familyAt > blockStart);
  const block = drawer.slice(blockStart, familyAt + 80);
  const lines = block.split('\n');
  const gradeRow = lines.find((line) => /<DrawerRow\s*$/.test(line) && lines[lines.indexOf(line) + 1]?.includes('label="Grade book"'));
  const parentsRow = lines.find((line) => /<DrawerRow label="Parents"/.test(line));
  const familyRow = lines.find((line) => /<DrawerRow label="Family update"/.test(line));
  assert.ok(gradeRow, 'Grade book DrawerRow present');
  assert.ok(parentsRow, 'Parents DrawerRow present');
  assert.ok(familyRow, 'Family update DrawerRow present');
  const lead = (line: string) => (line.match(/^[ \t]*/)?.[0] ?? '').length;
  assert.equal(lead(gradeRow!), lead(parentsRow!));
  assert.equal(lead(gradeRow!), lead(familyRow!));
});

test('Phase A+B intact: five tray keys; Class setup; CLASS_TABS ≤8; no sixth', () => {
  assert.deepEqual(trayKeysForRole('teacher'), ['home', 'capture', 'inbox', 'class', 'ask']);
  assert.equal(trayKeysForRole('teacher').length, 5);
  const classTab = tabsFor('teacher', '/', 'abc', 0).find((tab) => tab.key === 'class');
  assert.equal(classTab?.href, '/class/abc/setup');
  assert.ok(CLASS_TABS.length <= 8);
});

test('titles: /inbox wordmark is Needs Attention', () => {
  assert.equal(
    headerTitleFor({
      pathname: '/inbox',
      pushedTitle: null,
      className: null,
      contextTab: 'all',
      role: 'teacher',
    }),
    'Needs Attention',
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
  // Teachers cannot create classes: office seat + matrix grant (not job-of-record alone).
  assert.match(index, /canCreateClass\s*=\s*officeSeat\s*&&\s*can\(profile,\s*'classes\.create'/);
});
