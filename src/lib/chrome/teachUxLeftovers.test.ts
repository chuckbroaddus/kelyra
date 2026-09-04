import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  CLASS_TABS,
  DEMOTED_CLASS_TAB_KEYS,
  classTabFromRoute,
  hrefForClassTab,
} from './classTabs.ts';
import { resolveStaffChromeRole } from './seat.ts';
import { tabsFor, trayKeysForRole } from './trayTabs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('L1: Needs count gates on chrome seat role===teacher, not isOfficeRole(profile)', () => {
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /role === 'teacher' \? await countNeedsYou/);
  assert.match(chrome, /if \(role === 'teacher' && teacher && classId\)/);
  assert.doesNotMatch(chrome, /isOfficeRole\(profile\) \? 0 : await countNeedsYou/);
  assert.doesNotMatch(chrome, /teacher && !isOfficeRole\(profile\) && classId/);

  const dual = { role: 'administrator' as const, also_teacher: true };
  assert.equal(resolveStaffChromeRole(dual, 'teacher'), 'teacher');
  assert.equal(resolveStaffChromeRole(dual, 'office'), 'administrator');
  assert.deepEqual(trayKeysForRole('teacher'), ['home', 'capture', 'inbox', 'class', 'ask']);
  assert.ok(!trayKeysForRole('administrator').includes('inbox'));
});

test('L2: /inbox lists turned-in so Needs badge (countNeedsYou) and list agree', () => {
  const inbox = read('src/app/inbox.tsx');
  assert.match(inbox, /listTurnedIn/);
  assert.match(inbox, /setTurned/);
  assert.match(inbox, /visibleTurned/);
  const api = read('src/lib/captures/api.ts');
  assert.match(api, /export async function countNeedsYou/);
  assert.match(api, /listTurnedIn/);
  assert.match(api, /\.in\('status', \['completed'\]\)/);
});

test('L3: Week / Heatmap discoverable; not restored as default CLASS_TABS', () => {
  const keys = new Set(CLASS_TABS.map((tab) => tab.key));
  assert.ok(CLASS_TABS.length <= 7);
  for (const demoted of DEMOTED_CLASS_TAB_KEYS) {
    assert.ok(!keys.has(demoted));
  }
  const desk = read('src/app/class/[id]/index.tsx');
  assert.match(desk, /This week/);
  assert.match(desk, /hrefForClassTab\(id!, 'week'\)/);
  assert.match(desk, /label="Today"/);
  const book = read('src/app/class/[id]/gradebook.tsx');
  assert.match(book, /label="Heatmap"/);
  assert.match(book, /hrefForClassTab\(id, 'heatmap'\)/);
  assert.match(book, /label="Gradebook"/);
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /Family update/);
  assert.match(drawer, /\/family/);
  assert.equal(hrefForClassTab('c1', 'week'), '/class/c1?tab=week');
  assert.equal(hrefForClassTab('c1', 'heatmap'), '/class/c1/gradebook?tab=heatmap');
});

test('L4: demoted routes highlight nearby default tab', () => {
  assert.equal(classTabFromRoute('/class/c1', 'week'), 'today');
  assert.equal(classTabFromRoute('/class/c1/gradebook', 'heatmap'), 'gradebook');
  assert.equal(classTabFromRoute('/class/c1/family'), 'parents');
  assert.equal(classTabFromRoute('/class/c1', 'needs'), 'needs');
  assert.equal(classTabFromRoute('/class/c1/gradebook'), 'gradebook');
});

test('L5: header search placeholder follows chrome.role seat, not isOfficeRole(profile)', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  assert.doesNotMatch(header, /isOfficeRole/);
  assert.doesNotMatch(header, /useAuth/);
  assert.match(header, /function searchPlaceholder\(from: string, role: string\)/);
  assert.match(
    header,
    /if \(role === 'superintendent' \|\| role === 'administrator'\) return 'Find a person'/,
  );
  assert.match(header, /searchPlaceholder\(chromeState\.searchFrom, chromeState\.role\)/);
  assert.match(
    header,
    /chromeState\.role === 'superintendent' \|\| chromeState\.role === 'administrator'/,
  );
});

test('L6: Ask FALLBACK says Needs in askPrompt + ai-dev + ask-assistant', () => {
  const needle = /Open Needs or the student’s page/;
  assert.match(read('src/lib/ai/askPrompt.ts'), needle);
  assert.match(read('scripts/ai-dev-server.mjs'), needle);
  assert.match(read('supabase/functions/ask-assistant/index.ts'), needle);
  assert.doesNotMatch(read('scripts/ai-dev-server.mjs'), /Open Inbox/);
  assert.doesNotMatch(read('supabase/functions/ask-assistant/index.ts'), /Open Inbox/);
});

test('Phase A–D intact: five tray; CLASS_TABS ≤7; Class setup; Needs; canCreateClass', () => {
  assert.deepEqual(trayKeysForRole('teacher'), ['home', 'capture', 'inbox', 'class', 'ask']);
  assert.equal(tabsFor('teacher', '/inbox', 'c1', 0).find((t) => t.key === 'inbox')?.label, 'Needs');
  assert.equal(tabsFor('teacher', '/', 'abc', 0).find((t) => t.key === 'class')?.href, '/class/abc/setup');
  assert.ok(CLASS_TABS.length <= 7);
  const index = read('src/app/index.tsx');
  assert.match(index, /canCreateClass\s*=\s*isOfficeRole\(profile\)/);
  const matchName = read('src/lib/matching/matchName.ts');
  assert.doesNotMatch(matchName, /\.insert\(|from\('students'\)\.insert/);
  for (const rel of [
    'src/lib/chrome/ChromeProvider.tsx',
    'src/components/ui/AppHeader.tsx',
    'src/app/inbox.tsx',
    'src/lib/chrome/classTabs.ts',
  ]) {
    assert.doesNotMatch(read(rel), /EXPO_PUBLIC_[A-Z0-9_]*KEY|EXPO_PUBLIC_XAI|EXPO_PUBLIC_SECRET/);
  }
});
